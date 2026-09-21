#!/usr/bin/env python3
"""
VarshaRaksha AI Flood Detection Microservice
Loads fine_tuned_flood_detection_model.keras and provides real-time inference
for ground photo and video incident evidence.
"""

import os
import sys
import io
import time
import tempfile
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Suppress TF verbose logging
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
try:
    import keras
    from keras.applications.mobilenet import preprocess_input
except (ImportError, AttributeError):
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.applications.mobilenet import preprocess_input
from PIL import Image
import cv2
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configurable Video Processing & Classification Constants
VIDEO_SAMPLE_INTERVAL = 1.0   # Target sampling interval in seconds (1 frame per second)
MAX_VIDEO_FRAMES = 120        # Cap maximum frames analyzed to protect memory
VIDEO_FLOOD_THRESHOLD = 0.60  # Ratio of positive frames required for video-level Flood classification
FRAME_FLOOD_THRESHOLD = 0.45  # Probability threshold for a single frame to be classified as flood-positive

# Locate model file
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
env_model_path = os.environ.get("KERAS_MODEL_PATH") or os.environ.get("FLOOD_MODEL_PATH")

if env_model_path and Path(env_model_path).exists():
    MODEL_PATH = Path(env_model_path)
else:
    MODEL_PATH = WORKSPACE_ROOT / "fine_tuned_flood_detection_model.keras"
    if not MODEL_PATH.exists():
        ALT_PATH = Path("/Users/dhavalbhagat/Downloads/fine_tuned_flood_detection_model.keras")
        if ALT_PATH.exists():
            MODEL_PATH = ALT_PATH

print(f"🌊 [FloodAI] Initializing model from: {MODEL_PATH}")

model = None
try:
    if hasattr(keras, "layers") and hasattr(keras.layers, "Dense"):
        _orig_dense_init = keras.layers.Dense.__init__
        def _compat_dense_init(self, *args, **kwargs):
            kwargs.pop("quantization_config", None)
            return _orig_dense_init(self, *args, **kwargs)
        keras.layers.Dense.__init__ = _compat_dense_init

    model = keras.models.load_model(str(MODEL_PATH))
    # Warm up model with a dummy tensor
    dummy_input = np.zeros((1, 224, 224, 3), dtype=np.float32)
    _ = model.predict(dummy_input, verbose=0)
    print("✅ [FloodAI] Model successfully loaded and warmed up!")
except Exception as e:
    print(f"❌ [FloodAI] Failed to load model: {e}")

app = FastAPI(title="VarshaRaksha Flood Detection AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictPathRequest(BaseModel):
    filePath: Optional[str] = None
    url: Optional[str] = None

def evaluate_image_array(img_rgb: np.ndarray) -> Dict[str, Any]:
    """Preprocesses a 224x224 RGB image array and runs MobileNet flood inference."""
    img_resized = cv2.resize(img_rgb, (224, 224))
    img_float = img_resized.astype(np.float32)
    batch = np.expand_dims(img_float, axis=0)
    batch_preprocessed = preprocess_input(batch)
    
    preds = model.predict(batch_preprocessed, verbose=0)[0]
    flood_score = float(preds[0])
    normal_score = float(preds[1])
    
    # Classification rule based on training calibration:
    # Index 0 is Flooding sigmoid probability
    is_flood = bool(flood_score >= FRAME_FLOOD_THRESHOLD)
    confidence = flood_score if is_flood else normal_score

    return {
        "type": "image",
        "media_type": "image",
        "result": "Flooding" if is_flood else "No Flooding",
        "label": "Flooding" if is_flood else "No Flooding",
        "is_flooding": is_flood,
        "flood_detected": is_flood,
        "confidence": round(confidence, 4),
        "flood_score": round(flood_score, 4),
        "normal_score": round(normal_score, 4),
        "reason": "Visible water accumulation/flooding detected" if is_flood else "No visible waterlogging or flood accumulation detected"
    }

def evaluate_video_file(video_path: str) -> Dict[str, Any]:
    """
    Robust sequential frame reader and batched MobileNet inference pipeline.
    Reads video sequentially to prevent seek errors on varied codecs/containers.
    """
    filename = Path(video_path).name
    file_size = os.path.getsize(video_path) if os.path.exists(video_path) else 0

    print(f"[VIDEO] Received file: {filename}")
    print(f"[VIDEO] File size: {file_size} bytes")
    print(f"[VIDEO] Opening video: {video_path}...")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[VIDEO] VideoCapture.isOpened() == False for file: {video_path}")
        raise ValueError(f"Unable to open or decode video file: {filename}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    if fps <= 0.0 or np.isnan(fps):
        fps = 25.0

    duration_sec = (total_frames / fps) if (total_frames > 0 and fps > 0) else 0.0
    print(f"[VIDEO] FPS: {round(fps, 2)} | Total frames: {total_frames} | Duration: {round(duration_sec, 2)}s")

    # Determine dynamic sampling stride
    sample_stride = max(1, int(round(fps * VIDEO_SAMPLE_INTERVAL)))
    if total_frames > 0 and (total_frames / sample_stride) > MAX_VIDEO_FRAMES:
        sample_stride = max(1, int(np.ceil(total_frames / MAX_VIDEO_FRAMES)))

    print(f"[VIDEO] Sampling every {sample_stride} frames (Target: ~{VIDEO_SAMPLE_INTERVAL}s interval, max {MAX_VIDEO_FRAMES} frames)")

    frames = []
    frame_index = 0
    actual_read_count = 0

    # Sequential frame extraction avoids broken non-keyframe seeking in OpenCV
    while True:
        ret, frame_bgr = cap.read()
        if not ret or frame_bgr is None:
            break
        actual_read_count += 1
        if frame_index % sample_stride == 0:
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            frame_resized = cv2.resize(frame_rgb, (224, 224)).astype(np.float32)
            frames.append(frame_resized)
            if len(frames) >= MAX_VIDEO_FRAMES:
                break
        frame_index += 1

    cap.release()

    if not frames:
        print(f"[VIDEO] Zero decodable frames extracted from {filename} (read attempts: {actual_read_count})")
        raise ValueError(f"Unable to decode video or no readable frames found in {filename}.")

    print(f"[VIDEO] Frames extracted: {len(frames)} (from {actual_read_count} decodable stream frames)")
    print(f"[VIDEO] Running model inference on batch of {len(frames)} frames...")

    batch = np.array(frames, dtype=np.float32)
    batch_preprocessed = preprocess_input(batch)
    batch_preds = model.predict(batch_preprocessed, verbose=0)

    flood_scores = [float(p[0]) for p in batch_preds]
    normal_scores = [float(p[1]) for p in batch_preds]

    # Calculate frame-level flood metrics
    flood_positive_frames = sum(1 for f_score in flood_scores if f_score >= FRAME_FLOOD_THRESHOLD)
    frames_analyzed = len(frames)
    flood_ratio = flood_positive_frames / frames_analyzed if frames_analyzed > 0 else 0.0

    # Classify video based on configured ratio threshold
    is_flood = bool(flood_ratio >= VIDEO_FLOOD_THRESHOLD)

    # Calculate aggregated confidence
    if is_flood and flood_positive_frames > 0:
        pos_scores = [s for s in flood_scores if s >= FRAME_FLOOD_THRESHOLD]
        confidence = float(np.mean(pos_scores))
    elif not is_flood and (frames_analyzed - flood_positive_frames) > 0:
        neg_scores = [n for n, f in zip(normal_scores, flood_scores) if f < FRAME_FLOOD_THRESHOLD]
        confidence = float(np.mean(neg_scores))
    else:
        confidence = float(np.mean(normal_scores))

    confidence = min(max(confidence, 0.50), 0.99)
    max_flood_score = max(flood_scores) if flood_scores else 0.0
    avg_flood_score = float(np.mean(flood_scores)) if flood_scores else 0.0

    result_label = "Flooding" if is_flood else "No Flooding"
    print(f"[VIDEO] Predictions generated: {len(batch_preds)}")
    print(f"[VIDEO] Flood-positive frames: {flood_positive_frames}/{frames_analyzed}")
    print(f"[VIDEO] Flood ratio: {round(flood_ratio * 100, 1)}% (Threshold: {int(VIDEO_FLOOD_THRESHOLD * 100)}%)")
    print(f"[VIDEO] Final result: {result_label} (Confidence: {round(confidence * 100, 1)}%)")

    reason = (
        f"Analyzed {frames_analyzed} frames ({flood_positive_frames} positive, {round(flood_ratio * 100, 1)}% flood ratio). Sustained water accumulation confirmed."
        if is_flood
        else f"Analyzed {frames_analyzed} frames ({flood_positive_frames} positive, {round(flood_ratio * 100, 1)}% flood ratio). Below {int(VIDEO_FLOOD_THRESHOLD * 100)}% flood threshold."
    )

    return {
        "type": "video",
        "media_type": "video",
        "result": result_label,
        "label": result_label,
        "is_flooding": is_flood,
        "flood_detected": is_flood,
        "confidence": round(confidence, 4),
        "frames_analyzed": frames_analyzed,
        "flood_positive_frames": flood_positive_frames,
        "flood_ratio": round(flood_ratio, 4),
        "duration_seconds": round(duration_sec, 2),
        "flood_score": round(max_flood_score, 4),
        "avg_flood_score": round(avg_flood_score, 4),
        "reason": reason
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH)
    }

@app.post("/predict-path")
def predict_from_path(req: PredictPathRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Flood model is not loaded")
    
    target_path = None
    if req.filePath:
        p = Path(req.filePath)
        if not p.is_absolute():
            p = (WORKSPACE_ROOT / req.filePath).resolve()
        if p.exists():
            target_path = str(p)
    
    if not target_path and req.url:
        url = req.url
        if "/uploads/" in url:
            upload_name = url.split("/uploads/")[-1].split("?")[0]
            local_candidate = WORKSPACE_ROOT / "server" / "public" / "uploads" / upload_name
            if local_candidate.exists():
                target_path = str(local_candidate)
        elif url.startswith("file://"):
            local_candidate = Path(url.replace("file://", ""))
            if local_candidate.exists():
                target_path = str(local_candidate)

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"File could not be found locally: {req.filePath or req.url}")

    start_time = time.time()
    filename = Path(target_path).name.lower()
    is_video = any(filename.endswith(ext) for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"])
    media_type = "video" if is_video else "image"

    try:
        if media_type == "video":
            result = evaluate_video_file(target_path)
        else:
            pil_img = Image.open(target_path).convert("RGB")
            img_np = np.array(pil_img)
            result = evaluate_image_array(img_np)
        
        elapsed = round(time.time() - start_time, 3)
        result["media_type"] = media_type
        result["inference_seconds"] = elapsed
        print(f"🔍 [FloodAI PredictPath] {media_type.upper()} {Path(target_path).name} -> {result['label']} (conf: {result['confidence']}, elapsed: {elapsed}s)")
        return result
    except ValueError as ve:
        print(f"⚠️ [FloodAI Decode Notice]: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"❌ [FloodAI Error]: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict_media(file: Optional[UploadFile] = File(None)):
    if model is None:
        raise HTTPException(status_code=503, detail="Flood model is not loaded")

    if not file:
        raise HTTPException(status_code=400, detail="Must provide 'file' multipart. For JSON paths, use /predict-path")

    start_time = time.time()
    temp_file = None
    filename = file.filename.lower() if file.filename else "upload"
    is_video = any(filename.endswith(ext) for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]) or (file.content_type and file.content_type.startswith("video/"))
    media_type = "video" if is_video else "image"

    try:
        suffix = Path(filename).suffix or (".mp4" if is_video else ".jpg")
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_file = tmp.name
            content = await file.read()
            tmp.write(content)

        if media_type == "video":
            result = evaluate_video_file(temp_file)
        else:
            pil_img = Image.open(temp_file).convert("RGB")
            img_np = np.array(pil_img)
            result = evaluate_image_array(img_np)

        elapsed = round(time.time() - start_time, 3)
        result["media_type"] = media_type
        result["inference_seconds"] = elapsed
        print(f"🔍 [FloodAI Predict] {media_type.upper()} -> {result['label']} (conf: {result['confidence']}, elapsed: {elapsed}s)")
        return result

    except HTTPException:
        raise
    except ValueError as ve:
        print(f"⚠️ [FloodAI Decode Notice]: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"❌ [FloodAI Error]: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass

if __name__ == "__main__":
    port = int(os.environ.get("FLOOD_AI_PORT", 5002))
    print(f"🚀 Starting Flood Detection AI microservice on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
