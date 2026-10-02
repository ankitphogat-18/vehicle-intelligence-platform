import os
import cv2
import re
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

def parse_plate(raw_text):
    clean = re.sub(r'[^A-Z0-9]', '', raw_text.upper())
    for tag in ["IND", "AND", "ND", "MD"]:
        if clean.startswith(tag):
            clean = clean[len(tag):]
            break
    return clean

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

    # Sample every 6th frame to run fast and smooth on CPU
    sample_step = 6

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % sample_step != 0:
            continue

        sec = frame_idx / fps
        time_str = f"{int(sec // 60):02d}:{sec % 60:04.1f}"

        # Fast tracking
        results = detector.track(frame, persist=True, conf=0.25, verbose=False)[0]

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
                        "video_time": time_str
                    }

                # Only run OCR when plate is large enough
                if box_h >= 20 and box_w >= 50:
                    crop = frame[max(0, y1):min(height, y2), max(0, x1):min(width, x2)]
                    if crop.size > 0:
                        ocr_res = ocr.readtext(crop, detail=0)
                        raw_str = "".join(ocr_res)
                        clean = parse_plate(raw_str)
                        if len(clean) >= 5:
                            vehicle_tracker[track_id]["readings"].append(clean)
                            if float(conf) > vehicle_tracker[track_id]["max_conf"]:
                                vehicle_tracker[track_id]["max_conf"] = float(conf)

    cap.release()
    if os.path.exists(temp_path):
        os.remove(temp_path)

    # Return clean consensus per vehicle
    sightings = []
    for track_id, data in vehicle_tracker.items():
        if data["readings"]:
            consensus_plate = Counter(data["readings"]).most_common(1)[0][0]
            sightings.append({
                "plateNumber": consensus_plate,
                "confidence": round(data["max_conf"], 2),
                "timestamp": datetime.now().isoformat(),
                "cropImagePath": None
            })

    print(f"Done! Found {len(sightings)} distinct vehicle sightings.")
    return sightings

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)