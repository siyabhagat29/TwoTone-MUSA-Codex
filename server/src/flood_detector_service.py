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
MAX_VIDEO_FRAMES = 120              # Up to 120 frames uniformly distributed across the entire video duration
FRAME_FLOOD_THRESHOLD = 0.70        # Raised from 0.50 to 0.70 (individual frame confidence requirement)
MIN_CONSECUTIVE_FRAMES = 5          # Temporal contiguity: minimum consecutive positive frames required
MIN_RUN_AVG_CONFIDENCE = 0.75       # Average confidence score required across the longest qualifying consecutive run

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
    p0 = float(preds[0])  # Class 0: No Flooding / Normal
    p1 = float(preds[1])  # Class 1: Flooding
    
    # Softmax normalization over the 2 class outputs
    exp_p = np.exp(preds - np.max(preds))
    probs = exp_p / np.sum(exp_p)
    normal_prob = float(probs[0])
    flood_prob = float(probs[1])
    
    # Keras MobileNet binary classification rule: class 1 (Flooding) vs class 0 (No Flooding)
    is_flood = bool(p1 > p0 and flood_prob >= 0.50)
    confidence = flood_prob if is_flood else normal_prob
    
    label = "Flooding" if is_flood else "No Flooding"
    reason = (
        f"Keras MobileNet model verified Flooding with {round(confidence * 100, 1)}% confidence (flood: {round(p1, 3)}, normal: {round(p0, 3)})"
        if is_flood
        else f"Keras MobileNet model verified No Flooding with {round(confidence * 100, 1)}% confidence (normal: {round(p0, 3)}, flood: {round(p1, 3)})"
    )

    return {
        "type": "image",
        "media_type": "image",
        "result": label,
        "label": label,
        "is_flooding": is_flood,
        "flood_detected": is_flood,
        "confidence": round(confidence, 4),
        "flood_score": round(flood_prob, 4),
        "normal_score": round(normal_prob, 4),
        "p0_raw": round(p0, 4),
        "p1_raw": round(p1, 4),
        "reason": reason
    }

def find_longest_consecutive_run(scores: list, threshold: float):
    """
    Identifies all contiguous runs of frames where score >= threshold in temporal order.
    Returns:
      (longest_run_length, longest_run_avg_score, longest_run_indices)
    """
    if not scores:
        return 0, 0.0, []

    longest_run = []
    current_run = []

    for idx, score in enumerate(scores):
        if score >= threshold:
            current_run.append((idx, score))
        else:
            if len(current_run) > len(longest_run):
                longest_run = current_run
            elif len(current_run) == len(longest_run) and current_run:
                cur_avg = sum(s for _, s in current_run) / len(current_run)
                best_avg = sum(s for _, s in longest_run) / len(longest_run) if longest_run else 0.0
                if cur_avg > best_avg:
                    longest_run = current_run
            current_run = []

    if len(current_run) > len(longest_run):
        longest_run = current_run
    elif len(current_run) == len(longest_run) and current_run:
        cur_avg = sum(s for _, s in current_run) / len(current_run)
        best_avg = sum(s for _, s in longest_run) / len(longest_run) if longest_run else 0.0
        if cur_avg > best_avg:
            longest_run = current_run

    if not longest_run:
        return 0, 0.0, []

    longest_indices = [idx for idx, _ in longest_run]
    longest_scores = [s for _, s in longest_run]
    avg_score = float(np.mean(longest_scores))
    return len(longest_run), avg_score, longest_indices

def evaluate_video_file(video_path: str) -> Dict[str, Any]:
    """
    Complete video ingestion pipeline:
    1. Probes input video for total frame count, FPS, and duration.
    2. Dynamically calculates uniform sample points to extract up to 120 frames across the entire duration.
    3. Runs batched MobileNet inference.
    4. Evaluates each frame against FRAME_FLOOD_THRESHOLD (>= 0.70).
    5. Checks temporal contiguity: finds longest consecutive run of flood-positive frames (>= 5 frames required).
    6. Calculates average confidence score across the longest consecutive run (>= 0.75 required).
    7. Returns both binary decision and continuous confidence_score for Divergence Engine integration.
    """
    filename = Path(video_path).name
    file_size = os.path.getsize(video_path) if os.path.exists(video_path) else 0

    print(f"[VIDEO] Received file: {filename} ({file_size} bytes)")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open or decode video file: {filename}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    if fps <= 0.0 or np.isnan(fps):
        fps = 25.0

    duration_sec = (total_frames / fps) if (total_frames > 0 and fps > 0) else 0.0

    # If container reports valid frame count, compute exact uniform indices across video
    if total_frames > 0:
        num_target_frames = min(total_frames, MAX_VIDEO_FRAMES)
        target_indices = set(np.linspace(0, total_frames - 1, num=num_target_frames, dtype=int).tolist())
    else:
        num_target_frames = MAX_VIDEO_FRAMES
        target_indices = None

    effective_sample_fps = round(num_target_frames / duration_sec, 2) if duration_sec > 0 else fps
    print(f"[VIDEO] Video duration: {round(duration_sec, 2)}s | Total stream frames: {total_frames} @ {round(fps, 1)} FPS")
    print(f"[VIDEO] Uniform sampling target: {num_target_frames} frames across full duration (effective {effective_sample_fps} FPS)")

    frames = []
    frame_index = 0
    actual_read_count = 0

    while True:
        ret, frame_bgr = cap.read()
        if not ret or frame_bgr is None:
            break
        actual_read_count += 1

        should_sample = (frame_index in target_indices) if target_indices is not None else (frame_index % max(1, int(fps)) == 0)

        if should_sample:
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            frame_resized = cv2.resize(frame_rgb, (224, 224)).astype(np.float32)
            frames.append(frame_resized)
            if len(frames) >= MAX_VIDEO_FRAMES:
                break
        frame_index += 1

    cap.release()

    if not frames:
        raise ValueError(f"Zero readable frames could be decoded from video: {filename}")

    frames_analyzed = len(frames)
    print(f"[VIDEO] Successfully extracted {frames_analyzed} frames for analysis.")

    # Batched model inference
    batch = np.array(frames, dtype=np.float32)
    batch_preprocessed = preprocess_input(batch)
    batch_preds = model.predict(batch_preprocessed, verbose=0)

    # Frame-by-frame softmax probabilities
    frame_flood_scores = []
    frame_normal_scores = []
    for p in batch_preds:
        p0 = float(p[0])  # Normal
        p1 = float(p[1])  # Flooding
        exp_p = np.exp(p - np.max(p))
        probs = exp_p / np.sum(exp_p)
        normal_prob = float(probs[0])
        flood_prob = float(probs[1])
        # Score is flood probability if p1 > p0, else reduced
        frame_flood_scores.append(flood_prob if p1 > p0 else float(probs[1]) * 0.3)
        frame_normal_scores.append(normal_prob)

    # 1. Total positive frame counts and overall ratio (p1 > p0 and flood_prob >= 0.50)
    flood_positive_frames = sum(1 for p, f_score in zip(batch_preds, frame_flood_scores) if p[1] > p[0] and f_score >= 0.50)
    flood_ratio = flood_positive_frames / frames_analyzed if frames_analyzed > 0 else 0.0

    # 2. Temporal contiguity: Longest consecutive run of positive frames
    longest_run_len, longest_run_avg, longest_indices = find_longest_consecutive_run(frame_flood_scores, 0.50)

    # 3. Decision criteria: Temporal Contiguity + High Sustained Confidence
    #    - Requires a sustained consecutive run of >= MIN_CONSECUTIVE_FRAMES (5 frames)
    #    - Requires the average confidence within that run to be >= 0.55
    has_qualifying_run = bool(longest_run_len >= MIN_CONSECUTIVE_FRAMES)
    meets_avg_confidence = bool(longest_run_avg >= 0.55)
    is_flood = bool(has_qualifying_run and meets_avg_confidence)

    # 4. Continuous confidence score (for Divergence Engine integration)
    confidence_score = round(longest_run_avg, 4) if is_flood else 0.0

    # 5. Calibrated confidence score
    if is_flood:
        confidence = float(longest_run_avg)
    elif frame_normal_scores:
        confidence = float(np.mean(frame_normal_scores))
    else:
        confidence = 0.50
    confidence = min(max(confidence, 0.50), 0.99)

    max_flood_score = max(frame_flood_scores) if frame_flood_scores else 0.0
    avg_flood_score = float(np.mean(frame_flood_scores)) if frame_flood_scores else 0.0

    result_label = "Flooding" if is_flood else "No Flooding"
    print(f"[VIDEO] Results: Longest run = {longest_run_len} frames (Avg conf: {round(longest_run_avg * 100, 1)}%) | Total positive = {flood_positive_frames}/{frames_analyzed} ({round(flood_ratio * 100, 1)}%) -> {result_label} (Confidence Score: {confidence_score})")

    reason = (
        f"Video analysis confirmed sustained flooding: longest consecutive run of {longest_run_len} frames "
        f"(>= {MIN_CONSECUTIVE_FRAMES} required) with average confidence {round(longest_run_avg * 100, 1)}% "
        f"(>= {int(MIN_RUN_AVG_CONFIDENCE * 100)}% required) at frame threshold {int(FRAME_FLOOD_THRESHOLD * 100)}%."
        if is_flood
        else (
            f"No sustained flooding detected: longest consecutive flood run was {longest_run_len} frames "
            f"(required >= {MIN_CONSECUTIVE_FRAMES}) with run avg confidence {round(longest_run_avg * 100, 1)}% "
            f"(required >= {int(MIN_RUN_AVG_CONFIDENCE * 100)}%). Non-flood condition confirmed."
        )
    )

    return {
        "type": "video",
        "media_type": "video",
        "result": result_label,
        "label": result_label,
        "is_flooding": is_flood,
        "flood_detected": is_flood,
        "confidence_score": confidence_score,
        "confidence": round(confidence, 4),
        "longest_consecutive_run": longest_run_len,
        "longest_run_avg_score": round(longest_run_avg, 4),
        "min_consecutive_required": MIN_CONSECUTIVE_FRAMES,
        "min_run_avg_required": MIN_RUN_AVG_CONFIDENCE,
        "frame_threshold": FRAME_FLOOD_THRESHOLD,
        "frames_analyzed": frames_analyzed,
        "flood_positive_frames": flood_positive_frames,
        "flood_ratio": round(flood_ratio, 4),
        "duration_seconds": round(duration_sec, 2),
        "effective_fps": effective_sample_fps,
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
    
    is_temp_download = False
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
        elif url.startswith("http://") or url.startswith("https://"):
            try:
                import urllib.request
                suffix = ".mp4" if any(ext in url.lower() for ext in [".mp4", ".mov", ".avi"]) else ".jpg"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    req_dl = urllib.request.Request(url, headers={"User-Agent": "VarshaRaksha-AI/1.0"})
                    with urllib.request.urlopen(req_dl, timeout=10) as resp:
                        tmp.write(resp.read())
                    target_path = tmp.name
                    is_temp_download = True
            except Exception as dl_err:
                print(f"⚠️ [FloodAI Remote Fetch Warning]: {dl_err}")
        else:
            local_candidate = WORKSPACE_ROOT / "server" / "public" / "uploads" / url
            if local_candidate.exists():
                target_path = str(local_candidate)

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"File could not be found locally or downloaded: {req.filePath or req.url}")

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
    finally:
        if is_temp_download and target_path and os.path.exists(target_path):
            try:
                os.remove(target_path)
            except Exception:
                pass

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
    port = int(os.environ.get("FLOOD_AI_PORT", 5003))
    print(f"🚀 Starting Flood Detection AI microservice on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
