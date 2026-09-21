#!/usr/bin/env python3
"""
Verification Test Script for VarshaRaksha Photo + Video Flood Pipeline
Tests:
1. Flood Photo
2. Non-flood Photo
3. Flood MP4 Video
4. Non-flood MP4 Video
5. Long Video (Sampling cap test)
6. Corrupted Video
7. Alternative Video Container (WebM / AVI)
"""

import os
import sys
import time
import json

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import cv2
import numpy as np
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parent.parent
FLOOD_IMG_DIR = ROOT / "data" / "test" / "flooding"
NORMAL_IMG_DIR = ROOT / "data" / "test" / "normal"
TEMP_DIR = ROOT / "server" / "public" / "uploads"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(ROOT / "server" / "src"))
from flood_detector_service import evaluate_image_array, evaluate_video_file, model

def generate_test_video(image_dir: Path, output_path: Path, num_frames=30, fps=10):
    images = list(image_dir.glob("*.jpg"))
    if not images:
        images = list(image_dir.glob("*.png"))
    if not images:
        raise ValueError(f"No images in {image_dir}")
    
    first = cv2.imread(str(images[0]))
    h, w = first.shape[:2]
    
    is_webm = output_path.suffix.lower() == ".webm"
    fourcc = cv2.VideoWriter_fourcc(*('VP80' if is_webm else 'mp4v'))
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))
    
    for i in range(num_frames):
        img_p = images[i % len(images)]
        frame = cv2.imread(str(img_p))
        if frame is not None:
            # Add minor variation
            if i % 2 == 0:
                frame = cv2.resize(frame, (w, h))
            writer.write(frame)
    writer.release()
    print(f"Generated test video: {output_path.name} ({num_frames} frames, {output_path.stat().st_size} bytes)")

def run_all_tests():
    print("==================================================")
    print("🌊 RUNNING VARSHARAKSHA AI PIPELINE VERIFICATION")
    print("==================================================")

    # 1. TEST 1: Flood Photo
    print("\n--- TEST 1: Known Flood Photo ---")
    flood_img_path = next(FLOOD_IMG_DIR.glob("*.jpg"))
    img_bgr = cv2.imread(str(flood_img_path))
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    res1 = evaluate_image_array(img_rgb)
    print(f"Result: {res1['label']} | Confidence: {res1['confidence']} | Flood Score: {res1['flood_score']}")
    assert res1["is_flooding"] == True, "Test 1 failed: Expected flooding for flood photo"
    print("✅ TEST 1 PASSED: Photo flood detection verified.")

    # 2. TEST 2: Non-flood Photo
    print("\n--- TEST 2: Known Non-Flood Photo ---")
    normal_img_path = next(NORMAL_IMG_DIR.glob("*.jpg"))
    norm_bgr = cv2.imread(str(normal_img_path))
    norm_rgb = cv2.cvtColor(norm_bgr, cv2.COLOR_BGR2RGB)
    res2 = evaluate_image_array(norm_rgb)
    print(f"Result: {res2['label']} | Confidence: {res2['confidence']} | Flood Score: {res2['flood_score']}")
    assert res2["is_flooding"] == False, "Test 2 failed: Expected no flooding for normal photo"
    print("✅ TEST 2 PASSED: Photo non-flood detection verified.")

    # 3. TEST 3: Short MP4 Showing Flooding
    print("\n--- TEST 3: Short MP4 Flood Video ---")
    flood_vid_path = TEMP_DIR / "test_flood_sim.mp4"
    generate_test_video(FLOOD_IMG_DIR, flood_vid_path, num_frames=25, fps=5)
    res3 = evaluate_video_file(str(flood_vid_path))
    print(f"Result: {res3['result']} | Confidence: {res3['confidence']} | Frames: {res3['frames_analyzed']} | Positive: {res3['flood_positive_frames']} | Ratio: {res3['flood_ratio']}")
    assert res3["is_flooding"] == True, "Test 3 failed: Expected flooding for flood video"
    assert res3["frames_analyzed"] > 0, "Test 3 failed: No frames analyzed"
    print("✅ TEST 3 PASSED: Short flood MP4 analyzed successfully.")

    # 4. TEST 4: Short MP4 Showing No Flooding
    print("\n--- TEST 4: Short MP4 Non-Flood Video ---")
    normal_vid_path = TEMP_DIR / "test_normal_sim.mp4"
    generate_test_video(NORMAL_IMG_DIR, normal_vid_path, num_frames=25, fps=5)
    res4 = evaluate_video_file(str(normal_vid_path))
    print(f"Result: {res4['result']} | Confidence: {res4['confidence']} | Frames: {res4['frames_analyzed']} | Positive: {res4['flood_positive_frames']} | Ratio: {res4['flood_ratio']}")
    assert res4["is_flooding"] == False, "Test 4 failed: Expected no flooding for normal video"
    print("✅ TEST 4 PASSED: Short non-flood MP4 analyzed successfully.")

    # 5. TEST 5: Long Video (High Frame Count Sampling Cap Test)
    print("\n--- TEST 5: Long Video Performance & Sampling Test ---")
    long_vid_path = TEMP_DIR / "test_long_sim.mp4"
    generate_test_video(FLOOD_IMG_DIR, long_vid_path, num_frames=200, fps=25)
    t0 = time.time()
    res5 = evaluate_video_file(str(long_vid_path))
    elapsed = time.time() - t0
    print(f"Processed 200 frames in {round(elapsed, 2)}s. Analyzed: {res5['frames_analyzed']} frames (capped under 120)")
    assert res5["frames_analyzed"] <= 120, "Test 5 failed: Frame cap exceeded"
    print("✅ TEST 5 PASSED: Long video handled efficiently with dynamic frame sampling.")

    # 6. TEST 6: Invalid/Corrupted Video
    print("\n--- TEST 6: Invalid/Corrupted Video Error Handling ---")
    corrupt_path = TEMP_DIR / "corrupt_test.mp4"
    with open(corrupt_path, "wb") as f:
        f.write(b"NOT_A_REAL_VIDEO_HEADER_1234567890CORRUPT")
    
    try:
        evaluate_video_file(str(corrupt_path))
        raise AssertionError("Test 6 failed: Should have raised ValueError for corrupt video")
    except ValueError as ve:
        print(f"Successfully caught expected ValueError: {ve}")
    print("✅ TEST 6 PASSED: Corrupted video rejected with descriptive error.")

    # 7. TEST 7: Alternative Container (AVI)
    print("\n--- TEST 7: Alternative Container Video ---")
    alt_vid_path = TEMP_DIR / "test_alt_sim.avi"
    generate_test_video(FLOOD_IMG_DIR, alt_vid_path, num_frames=20, fps=10)
    res7 = evaluate_video_file(str(alt_vid_path))
    print(f"Result: {res7['result']} | Format: AVI | Frames: {res7['frames_analyzed']}")
    assert res7["frames_analyzed"] > 0, "Test 7 failed: AVI video frames not decoded"
    print("✅ TEST 7 PASSED: Alternative video container handled correctly.")

    print("\n==================================================")
    print("🎉 ALL 7 PIPELINE TESTS PASSED WITHOUT ERRORS!")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()
