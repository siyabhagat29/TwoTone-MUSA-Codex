import json
import base64
import os
import cv2
import numpy as np
from pathlib import Path

try:
    import keras
    from keras.applications.mobilenet import preprocess_input
except ImportError:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.applications.mobilenet import preprocess_input
from PIL import Image

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = WORKSPACE_ROOT / "fine_tuned_flood_detection_model.keras"

print(f"Loading authoritative model: {MODEL_PATH}")
if hasattr(keras, "layers") and hasattr(keras.layers, "Dense"):
    _orig = keras.layers.Dense.__init__
    def _c(self, *a, **kw):
        kw.pop("quantization_config", None)
        return _orig(self, *a, **kw)
    keras.layers.Dense.__init__ = _c

model = keras.models.load_model(str(MODEL_PATH))
print(f"Model input shape: {model.input_shape}")
print(f"Model output shape: {model.output_shape}")

# Load incidents from db.json
db_file = WORKSPACE_ROOT / "server" / "data" / "db.json"
with open(db_file, "r", encoding="utf-8") as f:
    db = json.load(f)
incidents = db.get("incidents", [])

for inc in incidents:
    inc_id = inc.get("id")
    raw_media = inc.get("photoUrl") or inc.get("photo") or inc.get("videoUrl") or inc.get("video")
    if not raw_media:
        continue

    print(f"\n==================== Incident {inc_id} ====================")
    print(f"Type: {inc.get('type')}, Category: {inc.get('category')}")
    
    img_rgb = None
    if raw_media.startswith("data:image/") or ";base64," in raw_media:
        encoded = raw_media.split(",", 1)[1] if "," in raw_media else raw_media
        decoded = base64.b64decode(encoded)
        nparr = np.frombuffer(decoded, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is not None:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        else:
            pil = Image.open(io.BytesIO(decoded)).convert("RGB")
            img_rgb = np.array(pil)
        print(f"Decoded Base64 image: {img_rgb.shape[1]}x{img_rgb.shape[0]}, {len(decoded)} bytes")
    elif raw_media.startswith("http://") or raw_media.startswith("https://"):
        fname = raw_media.split("/")[-1].split("?")[0]
        local = WORKSPACE_ROOT / "server" / "public" / "uploads" / fname
        if local.exists():
            img_bgr = cv2.imread(str(local))
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            print(f"Loaded from local cache {local.name}: {img_rgb.shape[1]}x{img_rgb.shape[0]}")
        else:
            try:
                import urllib.request, ssl
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                req_dl = urllib.request.Request(raw_media, headers={"User-Agent": "Mozilla/5.0 VarshaRaksha/1.0"})
                with urllib.request.urlopen(req_dl, context=ctx, timeout=10) as resp:
                    dl_bytes = resp.read()
                nparr = np.frombuffer(dl_bytes, np.uint8)
                img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img_bgr is not None:
                    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
                    print(f"Downloaded from remote URL {fname}: {img_rgb.shape[1]}x{img_rgb.shape[0]}, {len(dl_bytes)} bytes")
            except Exception as e:
                print(f"Failed to download {raw_media}: {e}")
    else:
        local = WORKSPACE_ROOT / "server" / "public" / "uploads" / raw_media
        if local.exists():
            img_bgr = cv2.imread(str(local))
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            print(f"Loaded from uploads {local.name}: {img_rgb.shape[1]}x{img_rgb.shape[0]}")

    if img_rgb is not None:
        img_resized = cv2.resize(img_rgb, (224, 224)).astype(np.float32)
        batch = np.expand_dims(img_resized, axis=0)
        batch_preprocessed = preprocess_input(batch)
        preds = model.predict(batch_preprocessed, verbose=0)[0]
        flood_prob = float(preds[0])
        normal_prob = float(preds[1])
        is_flood = bool(flood_prob > normal_prob)
        classification = "FLOOD" if is_flood else "NO_FLOOD"
        conf = flood_prob if is_flood else normal_prob

        print("MODEL:\nfine_tuned_flood_detection_model.keras")
        print(f"INPUT SHAPE:\n{batch_preprocessed.shape}")
        print(f"RAW MODEL OUTPUT:\n{preds.tolist()}")
        print("CLASS MAPPING:\n{0: 'Flooding', 1: 'No Flooding'}")
        print(f"FLOOD PROBABILITY:\n{flood_prob:.4f}")
        print(f"NORMAL PROBABILITY:\n{normal_prob:.4f}")
        print(f"FINAL CLASSIFICATION:\n{classification}")
        print(f"CONFIDENCE:\n{conf:.4f}")
