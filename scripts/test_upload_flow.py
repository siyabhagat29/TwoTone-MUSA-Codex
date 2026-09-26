import urllib.request
import json
import os
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

# Pick a known flood image and non-flood image from data/train or public uploads
flood_candidates = list((WORKSPACE_ROOT / 'data' / 'train' / 'flooding').glob('*.jpg')) + list((WORKSPACE_ROOT / 'data' / 'train' / 'flooding').glob('*.png'))
normal_candidates = list((WORKSPACE_ROOT / 'data' / 'train' / 'normal').glob('*.jpg')) + list((WORKSPACE_ROOT / 'data' / 'train' / 'normal').glob('*.png'))

flood_img_path = str(flood_candidates[0]) if flood_candidates else None
normal_img_path = str(normal_candidates[0]) if normal_candidates else None

print(f"Selected Flood test image: {flood_img_path}")
print(f"Selected Normal test image: {normal_img_path}")

def upload_and_report(img_path, note, reporter):
    with open(img_path, 'rb') as f:
        file_bytes = f.read()
    
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    filename = Path(img_path).name
    
    body = bytearray()
    body.extend(f'--{boundary}\r\n'.encode())
    body.extend(f'Content-Disposition: form-data; name="media"; filename="{filename}"\r\n'.encode())
    body.extend(f'Content-Type: image/jpeg\r\n\r\n'.encode())
    body.extend(file_bytes)
    body.extend(f'\r\n--{boundary}--\r\n'.encode())
    
    req = urllib.request.Request(
        'http://127.0.0.1:5001/api/upload-media',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    with urllib.request.urlopen(req) as resp:
        upload_res = json.loads(resp.read().decode())
    
    print("\n--- UPLOAD & VERIFICATION RESPONSE ---")
    print(json.dumps(upload_res.get('aiVerification'), indent=2))
    
    # Create incident report with this uploaded media
    report_payload = {
        'reporter': reporter,
        'role': 'Citizen',
        'waterLevel': 30,
        'lat': 19.132,
        'lng': 72.848,
        'photo': True,
        'photoUrl': upload_res['url'],
        'aiVerification': upload_res.get('aiVerification'),
        'note': note
    }
    
    req_rep = urllib.request.Request(
        'http://127.0.0.1:5001/api/reports',
        data=json.dumps(report_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req_rep) as resp:
        rep_res = json.loads(resp.read().decode())
    
    print(f"\nCREATED INCIDENT: {rep_res.get('id')}")
    print(f"  Classification: {rep_res.get('aiVerification', {}).get('classification')}")
    print(f"  is_flood: {rep_res.get('aiVerification', {}).get('is_flood')}")
    print(f"  Confidence: {rep_res.get('aiVerification', {}).get('confidence')}")
    return rep_res

print("\n==================== 1. TESTING REAL FLOOD IMAGE UPLOAD FLOW ====================")
flood_inc = upload_and_report(flood_img_path, 'Live severe street waterlogging', 'Citizen Flood Reporter')

print("\n==================== 2. TESTING NON-FLOOD IMAGE UPLOAD FLOW ====================")
normal_inc = upload_and_report(normal_img_path, 'Dry street / no water', 'Citizen Normal Reporter')

print("\n==================== 3. VERIFYING RETRIEVAL FROM /api/incidents ====================")
with urllib.request.urlopen('http://127.0.0.1:5001/api/incidents') as resp:
    all_inc = json.loads(resp.read().decode())

for test_id in [flood_inc.get('id'), normal_inc.get('id')]:
    found = next((i for i in all_inc if i.get('id') == test_id), None)
    if found:
        print(f"Dashboard API {test_id}: classification={found.get('aiVerification', {}).get('classification')}, is_flood={found.get('aiVerification', {}).get('is_flood')}, confidence={found.get('aiVerification', {}).get('confidence')}")
