import os
import cv2
import re
import numpy as np
from collections import Counter
from datetime import datetime
from fastapi import FastAPI, UploadFile, File
from ultralytics import YOLO
import easyocr

app = FastAPI()

print("Loading YOLOv8 and EasyOCR models locally...")
detector = YOLO("weights/best.pt")
ocr = easyocr.Reader(['en'], gpu=False)
print("Models loaded successfully!")

# Character confusion mappings from your Colab notebook
D2L = {'0': 'O', '1': 'I', '2': 'Z', '3': 'J', '4': 'A', '5': 'S', '6': 'G', '8': 'B'}
L2D = {'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'G': '6', 'B': '8'}

def format_indian_plate(raw_text):
    clean = re.sub(r'[^A-Z0-9]', '', raw_text.upper())
    for tag in ["IND", "AND", "ND", "MD"]:
        if clean.startswith(tag):
            clean = clean[len(tag):]
            break

    if len(clean) < 7:
        return clean if len(clean) >= 5 else None

    # Slot 1 & 2: State Code MUST be letters (fixes 6J -> GJ, DL, HR, etc.)
    state = "".join([D2L.get(c, c) for c in clean[:2]])

    # Slot 3 & 4: RTO District MUST be digits (fixes OI -> 01)
    rto = "".join([L2D.get(c, c) for c in clean[2:4]])

    # Trailing 4: Number MUST be digits
    rest = clean[4:]
    if len(rest) >= 4:
        num = "".join([L2D.get(c, c) for c in rest[-4:]])
        series = "".join([D2L.get(c, c) for c in rest[:-4]])
        return f"{state}{rto}{series}{num}"

    return f"{state}{rto}{rest}"

def enhance_plate(crop):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    h, w = enhanced.shape[:2]
    return cv2.resize(enhanced, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

@app.post("/predict-image")
async def predict_image(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"success": False, "error": "Invalid image payload", "plateNumber": None}

    height, width = img.shape[:2]
    results = detector(img, conf=0.25, verbose=False)[0]

    best_plate = None
    best_conf = 0.0
    crop_path = None

    crops_dir = os.path.join("uploads", "crops")
    os.makedirs(crops_dir, exist_ok=True)

    if len(results.boxes) > 0:
        boxes = results.boxes.xyxy.cpu().numpy().astype(int)
        confs = results.boxes.conf.cpu().numpy()

        for box, conf in zip(boxes, confs):
            x1, y1, x2, y2 = box
            box_h = y2 - y1
            box_w = x2 - x1

            pad_w = int(box_w * 0.04)
            pad_h = int(box_h * 0.04)
            cx1 = max(0, x1 - pad_w)
            cy1 = max(0, y1 - pad_h)
            cx2 = min(width, x2 + pad_w)
            cy2 = min(height, y2 + pad_h)

            crop = img[cy1:cy2, cx1:cx2]
            if crop.size > 0:
                enhanced = enhance_plate(crop)
                ocr_res = ocr.readtext(enhanced, detail=0)
                raw_str = "".join(ocr_res)
                formatted = format_indian_plate(raw_str)

                if formatted and float(conf) > best_conf:
                    best_plate = formatted
                    best_conf = float(conf)
                    ts = int(datetime.now().timestamp() * 1000)
                    fname = f"mobile_crop_{ts}_{formatted}.jpg"
                    save_fpath = os.path.join(crops_dir, fname)
                    cv2.imwrite(save_fpath, crop)
                    crop_path = f"/uploads/crops/{fname}"

    # Fallback to direct OCR if no bounding box found
    if not best_plate:
        enhanced = enhance_plate(img)
        ocr_res = ocr.readtext(enhanced, detail=0)
        raw_str = "".join(ocr_res)
        formatted = format_indian_plate(raw_str)
        if formatted:
            best_plate = formatted
            best_conf = 0.85
            ts = int(datetime.now().timestamp() * 1000)
            fname = f"mobile_crop_{ts}_{formatted}.jpg"
            save_fpath = os.path.join(crops_dir, fname)
            cv2.imwrite(save_fpath, img)
            crop_path = f"/uploads/crops/{fname}"

    if best_plate:
        return {
            "success": True,
            "plateNumber": best_plate,
            "confidence": round(best_conf, 2),
            "cropImagePath": crop_path
        }

    return {
        "success": True,
        "plateNumber": None,
        "confidence": 0.0,
        "cropImagePath": None
    }

@app.post("/predict-video")
async def predict_video(file: UploadFile = File(...)):
    temp_path = os.path.join("uploads", "videos", f"temp_{file.filename}")
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    cap = cv2.VideoCapture(temp_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    vehicle_tracker = {}
    frame_idx = 0
    sample_step = 3

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % sample_step != 0:
            continue

        sec = frame_idx / fps
        time_str = f"{int(sec // 60):02d}:{sec % 60:04.1f}"

        results = detector.track(frame, persist=True, conf=0.20, imgsz=1280, verbose=False)[0]

        if results.boxes.id is not None:
            boxes = results.boxes.xyxy.cpu().numpy().astype(int)
            t_ids = results.boxes.id.cpu().numpy().astype(int)
            confs = results.boxes.conf.cpu().numpy()

            for box, r_id, conf in zip(boxes, t_ids, confs):
                x1, y1, x2, y2 = box
                track_id = int(r_id)
                box_h = y2 - y1
                box_w = x2 - x1

                if track_id not in vehicle_tracker:
                    vehicle_tracker[track_id] = {
                        "readings": [],
                        "max_conf": float(conf),
                        "best_h": 0,
                        "best_crop": None,
                        "video_time": time_str,
                        "frame_count": 0
                    }

                vehicle_tracker[track_id]["frame_count"] += 1
                aspect_ratio = box_w / max(1, box_h)
                
                if box_h >= 20 and box_w >= 50 and (1.5 <= aspect_ratio <= 5.5):
                    crop = frame[max(0, y1):min(height, y2), max(0, x1):min(width, x2)]
                    if crop.size > 0:
                        if box_h > vehicle_tracker[track_id]["best_h"]:
                            vehicle_tracker[track_id]["best_h"] = box_h
                            vehicle_tracker[track_id]["best_crop"] = crop

                        enhanced = enhance_plate(crop)
                        ocr_res = ocr.readtext(enhanced, detail=0)
                        raw_str = "".join(ocr_res)
                        formatted = format_indian_plate(raw_str)
                        if formatted:
                            vehicle_tracker[track_id]["readings"].append(formatted)
                            if float(conf) > vehicle_tracker[track_id]["max_conf"]:
                                vehicle_tracker[track_id]["max_conf"] = float(conf)

    cap.release()
    if os.path.exists(temp_path):
        os.remove(temp_path)

    crops_dir = os.path.join("uploads", "crops")
    os.makedirs(crops_dir, exist_ok=True)

    sightings = []
    for track_id, data in vehicle_tracker.items():
        if data["frame_count"] >= 3 and data["readings"]:
            consensus_plate = Counter(data["readings"]).most_common(1)[0][0]
            
            crop_path = None
            if data["best_crop"] is not None:
                fname = f"crop_{track_id}_{consensus_plate}.jpg"
                save_fpath = os.path.join(crops_dir, fname)
                cv2.imwrite(save_fpath, data["best_crop"])
                crop_path = f"/uploads/crops/{fname}"

            sightings.append({
                "plateNumber": consensus_plate,
                "confidence": round(data["max_conf"], 2),
                "timestamp": datetime.now().isoformat(),
                "cropImagePath": crop_path
            })

    print(f"Done! Formatted {len(sightings)} verified Indian plate sightings.")
    return sightings

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
