"""
AI Pipeline Service: Custom YOLOv8 + LPRNet + CMVR Normalization Engine
Loads custom weights from weights/best.pt and weights/lprnet_real.pt.
Full-length video processing with RGB conversion, strict CMVR filtering, and EasyOCR fallback.
"""

import os
import sys
import json
import argparse
import re
import time
from datetime import datetime

# CMVR Character set used by Indian LPRNet architectures
CHARS = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', '-'
]

CHAR_DICT = {char: i for i, char in enumerate(CHARS)}

def get_base_dir():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def ensure_dirs():
    crops_dir = os.path.join(get_base_dir(), 'uploads', 'crops')
    videos_dir = os.path.join(get_base_dir(), 'uploads', 'videos')
    os.makedirs(crops_dir, exist_ok=True)
    os.makedirs(videos_dir, exist_ok=True)
    return crops_dir

def parse_cmvr_plate(raw_text):
    """
    Cleans and standardizes raw OCR/LPR text to legal Indian CMVR registration format.
    Strictly filters out repetitive noise (e.g. RRRR) and non-plate artifacts.
    """
    if not raw_text:
        return None
        
    text = raw_text.upper().strip()
    text = re.sub(r'[^A-Z0-9]', '', text)

    # Reject if too short, or composed almost entirely of repeated characters
    if len(text) < 7 or len(set(text)) <= 2:
        return None

    # Strip leading HSRP country watermark prefixes
    for prefix in ['INDIA', 'IND', 'AND', 'IN', 'ND']:
        if text.startswith(prefix) and len(text) > len(prefix) + 4:
            text = text[len(prefix):]
            break

    # Fix common OCR character substitutions for standard Indian plate pattern
    # Pattern: [2 letters State] [1-2 digits RTO] [0-3 letters Series] [4 digits Unique]
    state_part = text[:2]
    state_part = state_part.replace('0', 'O').replace('1', 'I').replace('8', 'B')
    rest = text[2:]
    text = state_part + rest

    # Match standard valid Indian license plate regex (e.g., DL01AB1234, HR26DK8392)
    cmvr_regex = r'^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{4})$'
    match = re.search(cmvr_regex, text)
    if match:
        state, rto, series, num = match.groups()
        if len(rto) == 1:
            rto = '0' + rto
        return f"{state}{rto}{series}{num}"

    # Accept if valid plate length (8-10 chars) and contains both letters and digits
    has_letters = bool(re.search(r'[A-Z]', text))
    has_digits = bool(re.search(r'[0-9]', text))
    if 8 <= len(text) <= 10 and has_letters and has_digits:
        return text

    return None

# -------------------------------------------------------------
# PyTorch LPRNet Architecture Definition
# -------------------------------------------------------------
try:
    import torch
    import torch.nn as nn
    import numpy as np
    import cv2
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

if HAS_TORCH:
    class small_basic_block(nn.Module):
        def __init__(self, ch_in, ch_out):
            super(small_basic_block, self).__init__()
            self.block = nn.Sequential(
                nn.Conv2d(ch_in, ch_out // 4, kernel_size=1),
                nn.ReLU(inplace=True),
                nn.Conv2d(ch_out // 4, ch_out // 4, kernel_size=(3, 1), padding=(1, 0)),
                nn.ReLU(inplace=True),
                nn.Conv2d(ch_out // 4, ch_out // 4, kernel_size=(1, 3), padding=(0, 1)),
                nn.ReLU(inplace=True),
                nn.Conv2d(ch_out // 4, ch_out, kernel_size=1),
            )

        def forward(self, x):
            return self.block(x)

    class LPRNet(nn.Module):
        def __init__(self, class_num=len(CHARS), dropout_rate=0.5):
            super(LPRNet, self).__init__()
            self.class_num = class_num
            self.backbone = nn.Sequential(
                nn.Conv2d(3, 64, kernel_size=3, stride=1, padding=1),
                nn.BatchNorm2d(64),
                nn.ReLU(inplace=True),
                nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(1, 1, 1)),
                small_basic_block(64, 64),
                nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
                nn.BatchNorm2d(128),
                nn.ReLU(inplace=True),
                nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(2, 1, 2)),
                small_basic_block(128, 128),
                nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),
                nn.BatchNorm2d(256),
                nn.ReLU(inplace=True),
                nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(2, 1, 2)),
                small_basic_block(256, 256),
            )
            self.container = nn.Sequential(
                nn.Conv2d(704, 512, kernel_size=1, stride=1),
                nn.BatchNorm2d(512),
                nn.ReLU(inplace=True),
                nn.Dropout(dropout_rate),
                nn.Conv2d(512, class_num, kernel_size=(4, 1), stride=1)
            )

        def forward(self, x):
            keep_features = []
            for i, layer in enumerate(self.backbone.children()):
                if isinstance(layer, nn.MaxPool3d):
                    x = x.unsqueeze(2)
                    x = layer(x)
                    x = x.squeeze(2)
                else:
                    x = layer(x)
                if i in [2, 7, 12, 14]:
                    keep_features.append(x)

            global_context = []
            for i, f in enumerate(keep_features):
                f = nn.functional.interpolate(f, size=(4, 18), mode='bilinear', align_corners=False)
                f_pow = torch.pow(f, 2)
                f_mean = torch.mean(f_pow)
                f = torch.div(f, f_mean)
                global_context.append(f)

            x = torch.cat(global_context, 1)
            x = self.container(x)
            logits = torch.mean(x, dim=2)
            return logits

    def decode_lprnet(preds):
        """Greedy CTC Decoding for LPRNet outputs"""
        preds = preds.cpu().detach().numpy()
        pred_labels = []
        confidences = []
        for i in range(preds.shape[0]):
            pred = preds[i]
            pred_label = []
            c_list = []
            prev_c = -1
            for j in range(pred.shape[1]):
                c = int(np.argmax(pred[:, j]))
                max_val = float(np.max(pred[:, j]))
                if c != len(CHARS) - 1 and c != prev_c:
                    pred_label.append(CHARS[c])
                    c_list.append(max_val)
                prev_c = c
            pred_labels.append("".join(pred_label))
            avg_conf = float(np.mean(c_list)) if c_list else 0.85
            confidences.append(avg_conf)
        return pred_labels, confidences

# -------------------------------------------------------------
# Pipeline Class
# -------------------------------------------------------------
class LicensePlateAI:
    def __init__(self):
        self.device = 'cuda' if (HAS_TORCH and torch.cuda.is_available()) else 'cpu'
        self.yolo_model = None
        self.lprnet_model = None
        self.crops_dir = ensure_dirs()
        self._load_models()

    def _load_models(self):
        base = get_base_dir()
        yolo_path = os.path.join(base, 'weights', 'best.pt')
        lprnet_path = os.path.join(base, 'weights', 'lprnet_real.pt')

        # Load YOLOv8
        try:
            from ultralytics import YOLO
            if os.path.exists(yolo_path):
                self.yolo_model = YOLO(yolo_path)
                sys.stderr.write(f"[AI Pipeline] YOLOv8 model loaded from {yolo_path} on {self.device}\n")
                sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f"[AI Pipeline] YOLO load notice: {str(e)}\n")
            sys.stderr.flush()
            self.yolo_model = None

        # Load LPRNet
        if HAS_TORCH and os.path.exists(lprnet_path):
            try:
                self.lprnet_model = LPRNet(class_num=len(CHARS)).to(self.device)
                state_dict = torch.load(lprnet_path, map_location=self.device)
                if isinstance(state_dict, dict) and 'state_dict' in state_dict:
                    state_dict = state_dict['state_dict']
                self.lprnet_model.load_state_dict(state_dict, strict=False)
                self.lprnet_model.eval()
                sys.stderr.write(f"[AI Pipeline] LPRNet model loaded from {lprnet_path}\n")
                sys.stderr.flush()
            except Exception as e:
                sys.stderr.write(f"[AI Pipeline] LPRNet load notice: {str(e)}\n")
                sys.stderr.flush()
                self.lprnet_model = None

    def crop_with_padding(self, image, box, padding_ratio=0.04):
        """Crops plate bounding box with 4% contextual padding"""
        h, w = image.shape[:2]
        x1, y1, x2, y2 = box
        pad_w = (x2 - x1) * padding_ratio
        pad_h = (y2 - y1) * padding_ratio

        cx1 = max(0, int(x1 - pad_w))
        cy1 = max(0, int(y1 - pad_h))
        cx2 = min(w, int(x2 + pad_w))
        cy2 = min(h, int(y2 + pad_h))

        return image[cy1:cy2, cx1:cx2]

    def recognize_crop(self, crop_img):
        """Runs LPRNet on RGB cropped plate region, falling back to EasyOCR if unreadable"""
        if crop_img is None or crop_img.size == 0:
            return None, 0.0

        # 1. Try LPRNet with proper RGB conversion
        if self.lprnet_model is not None and HAS_TORCH:
            try:
                rgb_crop = cv2.cvtColor(crop_img, cv2.COLOR_BGR2RGB)
                resized = cv2.resize(rgb_crop, (94, 24))
                tensor = resized.astype('float32')
                tensor -= 127.5
                tensor *= 0.0078125
                tensor = np.transpose(tensor, (2, 0, 1))
                tensor = torch.from_numpy(tensor).unsqueeze(0).to(self.device)

                with torch.no_grad():
                    preds = self.lprnet_model(tensor)
                    labels, confs = decode_lprnet(preds)
                    if labels and labels[0]:
                        cmvr = parse_cmvr_plate(labels[0])
                        if cmvr:
                            return cmvr, min(0.99, max(0.70, float(confs[0])))
            except Exception:
                pass

        # 2. EasyOCR fallback if LPRNet returned None or failed
        try:
            import easyocr
            reader = easyocr.Reader(['en'], gpu=(self.device == 'cuda'), verbose=False)
            results = reader.readtext(crop_img)
            if results:
                best_text = ""
                best_conf = 0.0
                for (_, text, conf) in results:
                    norm = parse_cmvr_plate(text)
                    if norm and conf > best_conf:
                        best_text = norm
                        best_conf = conf
                if best_text:
                    return best_text, round(float(best_conf), 2)
        except Exception:
            pass

        return None, 0.0

    def process_image(self, image_path):
        """Runs detection on a single image file with confidence thresholding"""
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        if HAS_TORCH:
            img = cv2.imread(image_path)
        else:
            img = None

        if img is None:
            return {
                "success": False,
                "plateNumber": None,
                "message": "Failed to read image"
            }

        crop_save_rel_path = None
        detected_plate = None
        confidence = 0.85

        # Run YOLO detection with min 0.50 confidence
        if self.yolo_model is not None:
            try:
                results = self.yolo_model(img, conf=0.50, verbose=False, device=self.device)
                boxes = results[0].boxes
                if len(boxes) > 0:
                    best_box = boxes.xyxy[0].cpu().numpy()
                    confidence = float(boxes.conf[0].cpu().numpy())
                    crop = self.crop_with_padding(img, best_box, 0.04)

                    rec_plate, rec_conf = self.recognize_crop(crop)
                    if rec_plate:
                        detected_plate = rec_plate
                        confidence = round((confidence + rec_conf) / 2, 2)

                    filename = f"crop_{int(time.time()*1000)}_{detected_plate or 'plate'}.jpg"
                    save_path = os.path.join(self.crops_dir, filename)
                    cv2.imwrite(save_path, crop)
                    crop_save_rel_path = f"/uploads/crops/{filename}"
            except Exception as e:
                sys.stderr.write(f"[AI Pipeline] YOLO crop error: {str(e)}\n")
                sys.stderr.flush()

        if not detected_plate:
            rec_plate, rec_conf = self.recognize_crop(img)
            if rec_plate:
                detected_plate = rec_plate
                confidence = rec_conf

        if detected_plate:
            return {
                "success": True,
                "plateNumber": detected_plate,
                "confidence": float(confidence),
                "cropImagePath": crop_save_rel_path
            }
        else:
            return {
                "success": True,
                "plateNumber": None,
                "message": "No valid plate recognized in image"
            }

    def process_video(self, video_path):
        """
        Full Video Processing:
        Processes sampled frames across the entire duration (~2.5 FPS) without artificial frame cutoffs.
        """
        if not os.path.exists(video_path):
            sys.stderr.write(f"[AI Pipeline] Video not found: {video_path}\n")
            sys.stderr.flush()
            return []

        if not HAS_TORCH:
            sys.stderr.write("[AI Pipeline] Torch not available\n")
            sys.stderr.flush()
            return []

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            sys.stderr.write(f"[AI Pipeline] Could not open video: {video_path}\n")
            sys.stderr.flush()
            return []

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 100)
        
        # Frame sampling: process only every 5th-12th frame (approx 2.5 frames per second)
        frame_interval = max(5, int(fps / 2.5))
        
        sys.stderr.write(f"[AI Pipeline] Video opened. Total frames: {total_frames}, FPS: {fps:.1f}, Sampling every {frame_interval} frames\n")
        sys.stderr.flush()

        track_votes = {} # track_id -> list of plate strings
        track_confs = {} # track_id -> list of confidences
        track_crops = {} # track_id -> crop relative path
        frame_idx = 0
        processed_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                processed_count += 1
                percent = min(100, int((frame_idx / max(1, total_frames)) * 100))
                
                if processed_count % 5 == 0 or frame_idx == 0:
                    sys.stderr.write(f"[AI Pipeline] Processing frame {frame_idx}/{total_frames} ({percent}%)...\n")
                    sys.stderr.flush()

                if self.yolo_model is not None:
                    try:
                        # conf=0.50 avoids low-confidence false positives
                        results = self.yolo_model.track(
                            frame,
                            conf=0.50,
                            persist=True,
                            tracker="bytetrack.yaml",
                            verbose=False,
                            device=self.device
                        )
                        if results and len(results) > 0 and results[0].boxes.id is not None:
                            boxes = results[0].boxes.xyxy.cpu().numpy()
                            ids = results[0].boxes.id.int().cpu().numpy()
                            confs = results[0].boxes.conf.cpu().numpy()

                            for box, track_id, conf in zip(boxes, ids, confs):
                                crop = self.crop_with_padding(frame, box, 0.04)
                                plate, r_conf = self.recognize_crop(crop)
                                if plate:
                                    if track_id not in track_votes:
                                        track_votes[track_id] = []
                                        track_confs[track_id] = []
                                        fname = f"crop_video_{track_id}_{plate}.jpg"
                                        cv2.imwrite(os.path.join(self.crops_dir, fname), crop)
                                        track_crops[track_id] = f"/uploads/crops/{fname}"

                                    track_votes[track_id].append(plate)
                                    track_confs[track_id].append(float(conf + r_conf) / 2)
                    except Exception as e:
                        pass

            frame_idx += 1

        cap.release()
        sys.stderr.write(f"[AI Pipeline] Video processing complete. Total sampled frames: {processed_count}\n")
        sys.stderr.flush()

        # Majority voting consensus per vehicle track
        final_sightings = []
        for track_id, votes in track_votes.items():
            if not votes:
                continue
            consensus_plate = max(set(votes), key=votes.count)
            avg_conf = round(float(np.mean(track_confs[track_id])), 2)
            final_sightings.append({
                "plateNumber": consensus_plate,
                "confidence": avg_conf,
                "timestamp": datetime.now().isoformat(),
                "cropImagePath": track_crops.get(track_id)
            })

        return final_sightings

def main():
    parser = argparse.ArgumentParser(description="Custom AI Pipeline Service (YOLOv8 + LPRNet + CMVR)")
    parser.add_argument('--image', type=str, help="Path to single image/frame file")
    parser.add_argument('--video', type=str, help="Path to surveillance video file")
    args = parser.parse_args()

    pipeline = LicensePlateAI()

    if args.image:
        result = pipeline.process_image(args.image)
        print(json.dumps(result))
    elif args.video:
        result = pipeline.process_video(args.video)
        print(json.dumps(result))
    else:
        print(json.dumps({"success": False, "error": "No --image or --video argument supplied"}))

if __name__ == '__main__':
    main()