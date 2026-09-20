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

# Suppress TF verbose logging
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications.mobilenet import preprocess_input
from PIL import Image
import cv2
import uvicorn
from fastapi import FastAPI, File, UploadFile, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Locate model file
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = WORKSPACE_ROOT / "fine_tuned_flood_detection_model.keras"
if not MODEL_PATH.exists():
    ALT_PATH = Path("/Users/dhavalbhagat/Downloads/fine_tuned_flood_detection_model.keras")
    if ALT_PATH.exists():
        MODEL_PATH = ALT_PATH

print(f"🌊 [FloodAI] Initializing model from: {MODEL_PATH}")

model = None
try:
    model = keras.models.load_model(str(MODEL_PATH))
    # Warm up model with a dummy tensor
    dummy_input = np.zeros((1, 224, 224, 3), dtype=np.float32)
    _ = model.predict(dummy_input, verbose=0)
    print(f"✅ [FloodAI] Model successfully loaded and warmed up!")
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
    # Index 0 is Flooding, Index 1 is Normal
    is_flood = bool(flood_score > normal_score and flood_score >= 0.45)
    confidence = flood_score if is_flood else normal_score

    return {
        "is_flooding": is_flood,
        "flood_detected": is_flood,
        "confidence": round(confidence, 4),
        "flood_score": round(flood_score, 4),
        "normal_score": round(normal_score, 4),
        "label": "Flooding" if is_flood else "No Flooding",
        "reason": "Visible water accumulation/flooding detected" if is_flood else "No visible waterlogging or flood accumulation detected"
    }

def evaluate_video_file(video_path: str, max_samples: int = 10) -> Dict[str, Any]:
    """Extracts evenly spaced frames from a video file and evaluates flood probability."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to read video file: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    duration_sec = total_frames / fps if fps > 0 else 0

    if total_frames <= 0:
        cap.release()
        raise ValueError("Video has no decodable frames")

    sample_count = min(max_samples, total_frames)
    frame_indices = np.linspace(0, total_frames - 1, sample_count, dtype=int)

    frames = []
    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame_bgr = cap.read()
        if ret and frame_bgr is not None:
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            frame_resized = cv2.resize(frame_rgb, (224, 224)).astype(np.float32)
            frames.append(frame_resized)
    cap.release()

    if not frames:
        raise ValueError("Failed to extract frames from video")

    batch = np.array(frames, dtype=np.float32)
    batch_preprocessed = preprocess_input(batch)
    batch_preds = model.predict(batch_preprocessed, verbose=0)

    flood_scores = [float(p[0]) for p in batch_preds]
    normal_scores = [float(p[1]) for p in batch_preds]

    flood_frames_count = sum(1 for f_score in flood_scores if f_score >= 0.45)
    max_flood_score = max(flood_scores)
    avg_flood_score = float(np.mean(flood_scores))

    # A video is considered flooded if at least 2 frames show flooding or max score >= 0.55
    is_flood = bool(flood_frames_count >= 2 or max_flood_score >= 0.55 or avg_flood_score >= 0.40)
    confidence = max_flood_score if is_flood else float(np.mean(normal_scores))

    return {
        "is_flooding": is_flood,
        "flood_detected": is_flood,
        "confidence": round(confidence, 4),
        "flood_score": round(max_flood_score, 4),
        "avg_flood_score": round(avg_flood_score, 4),
        "frames_analyzed": len(frames),
        "flood_frames": flood_frames_count,
        "duration_sec": round(duration_sec, 2),
        "label": "Flooding" if is_flood else "No Flooding",
        "reason": f"Analyzed {len(frames)} video frames; {flood_frames_count} frames confirmed active flooding" if is_flood else f"Analyzed {len(frames)} video frames; no flood conditions detected"
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH)
    }

@app.post("/predict")
async def predict_media(
    file: Optional[UploadFile] = File(None),
    body: Optional[PredictPathRequest] = Body(None)
):
    if model is None:
        raise HTTPException(status_code=503, detail="Flood model is not loaded")

    start_time = time.time()
    temp_file = None
    target_path = None
    media_type = "image"

    try:
        if file is not None:
            filename = file.filename.lower()
            is_video = any(filename.endswith(ext) for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]) or file.content_type.startswith("video/")
            media_type = "video" if is_video else "image"

            # Write uploaded bytes to a temporary file
            suffix = Path(filename).suffix or (".mp4" if is_video else ".jpg")
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                temp_file = tmp.name
                content = await file.read()
                tmp.write(content)
            target_path = temp_file

        elif body and body.filePath:
            resolved_path = Path(body.filePath)
            if not resolved_path.is_absolute():
                resolved_path = (WORKSPACE_ROOT / body.filePath).resolve()
            
            if not resolved_path.exists():
                raise HTTPException(status_code=404, detail=f"File not found at: {resolved_path}")
            
            target_path = str(resolved_path)
            filename = resolved_path.name.lower()
            is_video = any(filename.endswith(ext) for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"])
            media_type = "video" if is_video else "image"

        elif body and body.url:
            # Check if url points to local uploads
            url = body.url
            if "/uploads/" in url:
                upload_name = url.split("/uploads/")[-1].split("?")[0]
                local_candidate = WORKSPACE_ROOT / "server" / "public" / "uploads" / upload_name
                if local_candidate.exists():
                    target_path = str(local_candidate)
                    is_video = any(upload_name.lower().endswith(ext) for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"])
                    media_type = "video" if is_video else "image"
            if not target_path:
                raise HTTPException(status_code=400, detail="Cannot resolve remote URL locally without downloading")
        else:
            raise HTTPException(status_code=400, detail="Must provide either 'file' multipart or 'filePath' / 'url' in body")

        # Run evaluation based on media type
        if media_type == "video":
            result = evaluate_video_file(target_path)
        else:
            pil_img = Image.open(target_path).convert("RGB")
            img_np = np.array(pil_img)
            result = evaluate_image_array(img_np)

        elapsed = round(time.time() - start_time, 3)
        result["media_type"] = media_type
        result["inference_seconds"] = elapsed
        print(f"🔍 [FloodAI Result] {media_type.upper()} -> {result['label']} (conf: {result['confidence']}, elapsed: {elapsed}s)")
        return result

    except HTTPException:
        raise
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
