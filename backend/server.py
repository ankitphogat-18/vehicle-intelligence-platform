import os
import cv2
import re
import numpy as np
from collections import Counter
from datetime import datetime
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import easyocr
import torch

app = FastAPI(title="SIH ALPR & CLIP Zero-Shot Vision Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[*] Loading YOLOv8 and EasyOCR on {device}...")

# Load custom ALPR weights with fallback
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_PATH = os.path.join(BASE_DIR, "weights", "best.pt")
if not os.path.exists(WEIGHTS_PATH):
    for candidate in ["best.pt", "../weights/best.pt", "models/best.pt", "../models/best.pt"]:
        if os.path.exists(candidate):
            WEIGHTS_PATH = candidate
            break

detector = YOLO(WEIGHTS_PATH)
ocr = easyocr.Reader(['en'], gpu=(device == 'cuda'))

# Zero-Shot CLIP Setup
COLOR_CANDIDATES = ['white', 'silver', 'grey', 'black', 'red', 'blue', 'brown', 'golden', 'yellow']
MODEL_CANDIDATES = [
    'Maruti Suzuki Celerio', 'Maruti Suzuki Alto', 'Maruti Suzuki WagonR',
    'Maruti Suzuki Swift', 'Maruti Suzuki Baleno', 'Hyundai i10',
    'Hyundai Creta', 'Mahindra Thar', 'Mahindra Scorpio',
    'Tata Nexon', 'Toyota Fortuner', 'Honda City'
]

clip_model = None
clip_processor = None
has_clip = False

try:
    from transformers import CLIPProcessor, CLIPModel  # type: ignore
    from PIL import Image  # type: ignore
    print("[*] Initializing OpenAI CLIP (openai/clip-vit-base-patch32)...")
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    clip_model.eval()
    has_clip = True
    print("[✓] OpenAI CLIP Loaded Successfully!")
except Exception as clip_err:
    print(f"[*] Note: CLIP transformer initialization: {clip_err}. Using vision heuristic fallback.")

# 1. Indian Plate Validation & Normalization
VALID_INDIAN_STATES = {
    'AN', 'AP', 'AR', 'AS', 'BH', 'BR', 'CH', 'CG', 'DD', 'DN', 'DL',
    'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH',
    'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'OR', 'PB', 'PY', 'RJ', 'SK',
    'TN', 'TR', 'TS', 'UK', 'UP', 'WB'
}

# Conservative OCR stroke confusion (only high-probability visual confusions)
D2L = {'0': 'O', '1': 'I', '8': 'B', '2': 'Z', '5': 'S'}
L2D = {'O': '0', 'Q': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8'}

STANDARD_PLATE_REGEX = re.compile(r'^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{3,4})$')
BH_SERIES_REGEX = re.compile(r'^([0-9]{2})BH([0-9]{4})([A-Z]{1,2})$')

def levenshtein_dist(s1, s2):
    if len(s1) < len(s2):
        return levenshtein_dist(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            insert = prev[j + 1] + 1
            delete = curr[j] + 1
            sub = prev[j] + (c1 != c2)
            curr.append(min(insert, delete, sub))
        prev = curr
    return prev[-1]

def normalize_indian_plate(raw_text):
    if not raw_text:
        return None
    clean = re.sub(r'[^A-Z0-9]', '', raw_text.upper())
    for tag in ['INDIA', 'IND', 'AND', 'ND', 'MD']:
        if clean.startswith(tag) and len(clean) >= 9:
            clean = clean[len(tag):]
            break

    # Standard Indian vehicle registrations are 8 to 11 characters
    if len(clean) < 8 or len(clean) > 11:
        return None

    if BH_SERIES_REGEX.match(clean):
        return clean

    match = STANDARD_PLATE_REGEX.match(clean)
    if match and match.group(1) in VALID_INDIAN_STATES:
        state = match.group(1)
        rto = match.group(2).zfill(2) if len(match.group(2)) == 1 else match.group(2)
        series = match.group(3)
        num = match.group(4)
        return f"{state}{rto}{series}{num}"

    # Check State Code at positions 0,1
    s0 = D2L.get(clean[0], clean[0])
    s1 = D2L.get(clean[1], clean[1])
    cand_state = f"{s0}{s1}"

    if cand_state not in VALID_INDIAN_STATES:
        found = False
        for offset in [1, 2]:
            if len(clean) - offset >= 8:
                os0 = D2L.get(clean[offset], clean[offset])
                os1 = D2L.get(clean[offset + 1], clean[offset + 1])
                if f"{os0}{os1}" in VALID_INDIAN_STATES:
                    cand_state = f"{os0}{os1}"
                    clean = clean[offset:]
                    found = True
                    break
        if not found:
            return None

    # RTO code at positions 2,3 (or 2)
    rto0 = L2D.get(clean[2], clean[2])
    rto1 = L2D.get(clean[3], clean[3]) if len(clean) > 3 else ''
    if not rto0.isdigit() or (rto1 and not rto1.isdigit()):
        return None

    # Trailing 3 to 4 characters must be digits
    rest = clean[4:]
    if len(rest) < 3:
        return None

    trailing_digits = []
    for c in reversed(rest):
        d = L2D.get(c, c)
        if d.isdigit() and len(trailing_digits) < 4:
            trailing_digits.insert(0, d)
        else:
            break

    if len(trailing_digits) < 3:
        return None

    num_str = ''.join(trailing_digits)
    series_part = rest[:len(rest) - len(trailing_digits)]
    series_norm = ''.join([D2L.get(c, c) for c in series_part])

    # Series part must be purely alphabetic, at most 3 chars
    if series_norm and (not series_norm.isalpha() or len(series_norm) > 3):
        return None

    plate_cand = f"{cand_state}{rto0}{rto1}{series_norm}{num_str}"
    if STANDARD_PLATE_REGEX.match(plate_cand):
        return plate_cand

    return None

# 2. Zero-Shot CLIP Prediction
def predict_visual_attributes(cv2_img):
    if cv2_img is None or cv2_img.size == 0:
        return "white", "Maruti Suzuki Swift"

    if has_clip and clip_model is not None:
        try:
            from PIL import Image
            rgb_img = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_img)

            # Color zero-shot prompts
            color_prompts = [f"a {c} colored vehicle" for c in COLOR_CANDIDATES]
            inputs_color = clip_processor(text=color_prompts, images=pil_img, return_tensors="pt", padding=True).to(device)
            with torch.no_grad():
                outputs_color = clip_model(**inputs_color)
                probs_color = outputs_color.logits_per_image.softmax(dim=1)
                best_color_idx = probs_color.argmax().item()
                pred_color = COLOR_CANDIDATES[best_color_idx]

            # Model zero-shot prompts
            model_prompts = [f"a photo of a {m} car on the road" for m in MODEL_CANDIDATES]
            inputs_model = clip_processor(text=model_prompts, images=pil_img, return_tensors="pt", padding=True).to(device)
            with torch.no_grad():
                outputs_model = clip_model(**inputs_model)
                probs_model = outputs_model.logits_per_image.softmax(dim=1)
                best_model_idx = probs_model.argmax().item()
                pred_model = MODEL_CANDIDATES[best_model_idx]

            return pred_color, pred_model
        except Exception as e:
            print(f"[*] CLIP inference exception: {e}")

    # Heuristic HSV color detection fallback
    hsv = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2HSV)
    mean_v = np.mean(hsv[:, :, 2])
    mean_s = np.mean(hsv[:, :, 1])
    mean_h = np.mean(hsv[:, :, 0])

    if mean_v < 45:
        detected_color = "black"
    elif mean_v > 180 and mean_s < 40:
        detected_color = "white"
    elif mean_s < 45:
        detected_color = "silver"
    elif mean_h < 10 or mean_h > 170:
        detected_color = "red"
    elif 100 < mean_h < 135:
        detected_color = "blue"
    else:
        detected_color = "white"

    return detected_color, "Maruti Suzuki Swift"

def enhance_plate(crop):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    h, w = enhanced.shape[:2]
    return cv2.resize(enhanced, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

# 3. Detection API Endpoints
@app.post("/detect")
@app.post("/predict-image")
async def detect_image(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {
            "success": False,
            "plate_number": None,
            "plateNumber": None,
            "visual_color": "white",
            "visual_model": "Sedan",
            "confidence": 0.0,
            "bbox": [],
            "message": "Invalid image content"
        }

    height, width = img.shape[:2]
    # Detect license plates using trained YOLO model
    results = detector(img, conf=0.30, verbose=False)[0]

    best_plate = None
    best_conf = 0.0
    best_bbox = []
    crop_path = None

    crops_dir = os.path.join("uploads", "crops")
    os.makedirs(crops_dir, exist_ok=True)

    # Predict visual attributes
    visual_color, visual_model = predict_visual_attributes(img)

    if len(results.boxes) > 0:
        boxes = results.boxes.xyxy.cpu().numpy().astype(int)
        confs = results.boxes.conf.cpu().numpy()

        for box, conf in zip(boxes, confs):
            x1, y1, x2, y2 = box
            box_h = y2 - y1
            box_w = x2 - x1

            if box_h <= 0 or box_w <= 0:
                continue
            aspect = float(box_w) / float(box_h)
            # License plates have aspect ratio roughly between 1.4 and 6.5
            if aspect < 1.4 or aspect > 6.5:
                continue

            pad_w = int(box_w * 0.05)
            pad_h = int(box_h * 0.05)
            cx1 = max(0, x1 - pad_w)
            cy1 = max(0, y1 - pad_h)
            cx2 = min(width, x2 + pad_w)
            cy2 = min(height, y2 + pad_h)

            crop = img[cy1:cy2, cx1:cx2]
            if crop.size > 0:
                enhanced = enhance_plate(crop)
                ocr_res = ocr.readtext(enhanced, detail=0)
                raw_str = "".join(ocr_res)
                formatted = normalize_indian_plate(raw_str)

                if formatted and float(conf) > best_conf:
                    best_plate = formatted
                    best_conf = float(conf)
                    best_bbox = [int(x1), int(y1), int(x2), int(y2)]
                    ts = int(datetime.now().timestamp() * 1000)
                    fname = f"plate_crop_{ts}_{formatted}.jpg"
                    save_fpath = os.path.join(crops_dir, fname)
                    cv2.imwrite(save_fpath, crop)
                    crop_path = f"/uploads/crops/{fname}"

    # Only if YOLO found no box AND the image itself is an already-cropped close-up plate:
    if not best_plate and len(results.boxes) == 0:
        aspect = float(width) / float(max(1, height))
        # Isolated plate crops are wide, rectangular, and not an entire scene
        if 2.0 <= aspect <= 6.0 and height <= 450:
            enhanced = enhance_plate(img)
            ocr_res = ocr.readtext(enhanced, detail=0)
            raw_str = "".join(ocr_res)
            formatted = normalize_indian_plate(raw_str)
            if formatted:
                best_plate = formatted
                best_conf = 0.88
                best_bbox = [0, 0, width, height]
                ts = int(datetime.now().timestamp() * 1000)
                fname = f"plate_crop_{ts}_{formatted}.jpg"
                save_fpath = os.path.join(crops_dir, fname)
                cv2.imwrite(save_fpath, img)
                crop_path = f"/uploads/crops/{fname}"

    if best_plate:
        return {
            "success": True,
            "plate_number": best_plate,
            "plateNumber": best_plate,
            "visual_color": visual_color,
            "visual_model": visual_model,
            "confidence": round(best_conf, 2) if best_conf > 0 else 0.92,
            "bbox": best_bbox,
            "cropImagePath": crop_path
        }
    else:
        return {
            "success": False,
            "plate_number": None,
            "plateNumber": None,
            "visual_color": visual_color,
            "visual_model": visual_model,
            "confidence": 0.0,
            "bbox": [],
            "cropImagePath": None,
            "message": "No valid vehicle license plate detected in image"
        }

@app.post("/predict-video")
async def predict_video(file: UploadFile = File(...)):
    temp_path = os.path.join("uploads", "videos", f"temp_{file.filename}")
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    cap = cv2.VideoCapture(temp_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Sample ~10 frames per second of video to maintain high throughput and accuracy
    sample_step = max(2, int(round(fps / 10.0)))

    # Collect raw valid plate detections across all sampled frames
    raw_detections = []
    frame_idx = 0

    crops_dir = os.path.join("uploads", "crops")
    os.makedirs(crops_dir, exist_ok=True)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % sample_step != 0:
            continue

        # Conf >= 0.40 ensures we only evaluate solid license plate candidates
        results = detector(frame, conf=0.40, verbose=False)[0]

        if len(results.boxes) > 0:
            boxes = results.boxes.xyxy.cpu().numpy().astype(int)
            confs = results.boxes.conf.cpu().numpy()

            for box, conf in zip(boxes, confs):
                x1, y1, x2, y2 = box
                box_h = y2 - y1
                box_w = x2 - x1

                # Filter out tiny smudges or weird aspect ratios
                if box_h < 16 or box_w < 55:
                    continue
                aspect_ratio = box_w / max(1, box_h)
                if not (1.3 <= aspect_ratio <= 6.5):
                    continue

                # Add 8% margin padding to prevent clipping boundary characters
                pad_w = int(box_w * 0.08)
                pad_h = int(box_h * 0.08)
                cx1 = max(0, x1 - pad_w)
                cy1 = max(0, y1 - pad_h)
                cx2 = min(width, x2 + pad_w)
                cy2 = min(height, y2 + pad_h)

                crop = frame[cy1:cy2, cx1:cx2]
                if crop.size == 0:
                    continue

                enhanced = enhance_plate(crop)
                # Use detail=1 to inspect individual OCR character confidence
                ocr_entries = ocr.readtext(enhanced, detail=1)
                
                # Combine words with confidence >= 0.45
                valid_words = [entry[1] for entry in ocr_entries if len(entry) >= 3 and entry[2] >= 0.45]
                raw_str = "".join(valid_words)
                
                # If filtered words yielded nothing, try combined string if max confidence is decent
                if not raw_str and ocr_entries:
                    max_entry_conf = max(entry[2] for entry in ocr_entries if len(entry) >= 3)
                    if max_entry_conf >= 0.50:
                        raw_str = "".join(entry[1] for entry in ocr_entries)

                formatted = normalize_indian_plate(raw_str)

                # Strictly valid Indian license plates only
                if formatted:
                    raw_detections.append({
                        "plate": formatted,
                        "conf": float(conf),
                        "crop": crop,
                        "box_h": box_h,
                        "frame": frame,
                        "frame_idx": frame_idx
                    })

    cap.release()
    if os.path.exists(temp_path):
        try:
            os.remove(temp_path)
        except Exception:
            pass

    if not raw_detections:
        return []

    # 3. Cluster similar plate reads (Levenshtein distance <= 1) to eliminate OCR flip duplicates
    clusters = []
    for det in raw_detections:
        p = det["plate"]
        matched_cluster = None
        for c in clusters:
            if levenshtein_dist(p, c["rep_plate"]) <= 1:
                matched_cluster = c
                break

        if matched_cluster:
            matched_cluster["readings"].append(det)
            matched_cluster["votes"][p] = matched_cluster["votes"].get(p, 0) + 1
        else:
            clusters.append({
                "rep_plate": p,
                "readings": [det],
                "votes": {p: 1}
            })

    # 4. Anti-Spam Persistence Filtering:
    # A true vehicle sighting must appear in at least 2 distinct frames (or 1 frame with high confidence for tiny clips)
    min_required_votes = 2 if total_frames >= 20 else 1

    sightings = []
    ts_base = datetime.now()

    for c in clusters:
        total_votes = sum(c["votes"].values())
        max_conf = max(r["conf"] for r in c["readings"])

        if total_votes < min_required_votes and max_conf < 0.70:
            # Single-frame transient noise/glitch: skip!
            continue

        # Choose the dominant plate string among clustered votes
        dominant_plate = max(c["votes"].items(), key=lambda x: x[1])[0]

        # Choose the sharpest/largest crop for visualization
        best_reading = max(c["readings"], key=lambda r: (r["box_h"], r["conf"]))
        best_crop = best_reading["crop"]

        crop_path = None
        if best_crop is not None:
            ts = int(ts_base.timestamp() * 1000)
            fname = f"video_crop_{ts}_{dominant_plate}.jpg"
            save_fpath = os.path.join(crops_dir, fname)
            cv2.imwrite(save_fpath, best_crop)
            crop_path = f"/uploads/crops/{fname}"

        # Classify vehicle visual attributes
        v_color, v_model = predict_visual_attributes(best_reading["frame"])

        sightings.append({
            "plate_number": dominant_plate,
            "plateNumber": dominant_plate,
            "visual_color": v_color,
            "visual_model": v_model,
            "confidence": round(max_conf, 2),
            "timestamp": ts_base.isoformat(),
            "cropImagePath": crop_path,
            "occurrences": total_votes
        })

    return sightings

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
