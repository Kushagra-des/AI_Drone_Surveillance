# AI Model Module — AI Drone Surveillance System

**Owner:** Member 3 (Himanshu Nagar) | **Stack:** Python 3.11 · YOLOv8 · OpenCV · NumPy · PyTorch

---

## Module Structure

```
ai_model/
├── __init__.py          # Package entry point
├── detector.py          # DroneObjectDetector — primary public class
├── events.py            # Rule-based detection event engine
├── utils.py             # FrameValidator, FPSCounter, drawing helpers
├── demo.py              # Standalone CLI demo (webcam / video file)
├── test_detector.py     # Lightweight test script (no pytest required)
├── requirements.txt     # Python dependencies
├── README.md            # This file
└── .gitignore           # Excludes weights, videos, cache
```

> **Ownership boundary:** `backend/` and `frontend/` are owned by other team members.  
> Never modify those folders. Never break the backend integration contract below.

---

## Quick Setup (Windows)

### 1 — Create & activate a virtual environment

```powershell
cd "d:\Codes\AI Drone\AI_Drone_Surveillance"
python -m venv .venv
.venv\Scripts\Activate.ps1
```

If you get a PowerShell execution-policy error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2 — Install dependencies

```powershell
pip install -r ai_model\requirements.txt
```

> **GPU acceleration (optional):**  
> Replace the `torch` line in `requirements.txt` or run:
> ```powershell
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
> ```

### 3 — First-run model download

YOLOv8n weights (~6 MB) are downloaded automatically by Ultralytics on the
first inference call. They are saved to `~/.cache/ultralytics/` and are **not**
committed to git (see `.gitignore`).

---

## Running the Demo (Windows)

All commands are run from the **repository root** with the venv active.

| Scenario | Command |
|---|---|
| Webcam (default) | `python -m ai_model.demo` |
| Webcam, lower confidence | `python -m ai_model.demo --conf 0.35` |
| Pre-recorded video | `python -m ai_model.demo --source path\to\clip.mp4` |
| Save annotated output | `python -m ai_model.demo --source clip.mp4 --save` |
| Headless / no window | `python -m ai_model.demo --source clip.mp4 --no-display` |
| GPU (CUDA) | `python -m ai_model.demo --device cuda` |
| Custom model | `python -m ai_model.demo --model yolov8s.pt` |
| Help | `python -m ai_model.demo --help` |

**Demo keyboard shortcuts** (when the display window is open):

| Key | Action |
|---|---|
| `Q` / `ESC` | Quit |
| `P` | Pause / resume |
| `S` | Screenshot → `output/screenshot_NNNNN.jpg` |

**Example session output:**

```
═══════════════════════════════════════════════════════
  DETECTION SESSION SUMMARY
═══════════════════════════════════════════════════════
  Source          : 0  (webcam)
  Model           : yolov8n.pt
  Device          : cpu
  Target classes  : ['person', 'car', 'motorcycle', 'bus', 'truck']
  Conf threshold  : 0.45
  Total frames    : 300
  Total detections: 412
  Avg dets/frame  : 1.37
  Avg FPS         : 18.3
  Avg proc time   : 54.7 ms/frame
  Wall time       : 16.4 s
═══════════════════════════════════════════════════════
```

---

## Running the Tests

```powershell
python -m ai_model.test_detector
```

Expected output (all passing):

```
═══════════════════════════════════════════════════════
  AI Drone Surveillance — Detector Test Suite
═══════════════════════════════════════════════════════
  1 · Import health          → ✓ ✓ ✓ ✓
  2 · FrameValidator         → ✓ ✓ ✓ ✓ ✓
  3 · FPSCounter             → ✓ ✓ ✓ ✓
  4 · Constructor            → ✓
  5 · Black-frame inference  → ✓ ✓ ✓
  6 · Schema validation      → ✓
  7 · Invalid frame handling → ✓ ✓ ✓
  8 · Event engine           → ✓ ✓ ✓ ✓
  9 · Stats structure        → ✓
  Results: 23/23 passed  ✓  All tests passed!
```

---

## Backend Integration Contract

> **For Member 2 (Backend / FastAPI)**

The detector is imported as a Python module — no REST call, no subprocess.

### Minimal integration

```python
# In backend/main.py or a service layer
from ai_model.detector import DroneObjectDetector

# --- Initialise once at startup (expensive) ---
detector = DroneObjectDetector(
    model_path="yolov8n.pt",    # or absolute path after download
    conf_threshold=0.45,
    device="auto",              # GPU when available, CPU otherwise
    target_classes=["person", "car", "motorcycle", "bus", "truck"],
)

# --- Call per frame (fast, ~15–60 ms on CPU) ---
annotated_frame, detections = detector.process_frame(frame)
```

### Detection schema

Each element of `detections` is a `dict`:

```python
{
    "class":      str,    # COCO class name, e.g. "person"
    "confidence": float,  # 0.0–1.0, e.g. 0.87
    "bbox":       list,   # [x1, y1, x2, y2] — int pixel coords, xyxy
}
```

**JSON example** (ready to send to frontend):

```json
[
  {"class": "person",     "confidence": 0.87, "bbox": [142, 310, 298, 612]},
  {"class": "car",        "confidence": 0.72, "bbox": [400, 200, 650, 380]},
  {"class": "motorcycle", "confidence": 0.61, "bbox": [700, 250, 820, 420]}
]
```

### With event flags (optional)

```python
from ai_model.events import DetectionEventEngine

event_engine = DetectionEventEngine()   # initialise once

annotated_frame, detections = detector.process_frame(frame)
events = event_engine.evaluate(detections)   # list[str], may be empty

# events example: ["CROWD_DETECTED (6 persons)", "ZONE_INTRUSION:Gate-A"]
```

### With performance stats

```python
stats = detector.get_stats()
# {
#     "fps":               18.3,
#     "avg_proc_ms":       54.7,
#     "total_frames":      300,
#     "total_dets":        412,
#     "avg_dets_per_frame": 1.37
# }
```

### Working directory note

The backend must launch from the **repository root** so that
`from ai_model.detector import ...` resolves correctly:

```powershell
# Correct — run from repo root
cd "d:\Codes\AI Drone\AI_Drone_Surveillance"
uvicorn backend.main:app --reload
```

Alternatively, add the repo root to `PYTHONPATH`:

```python
# backend/main.py — if needed
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
from ai_model.detector import DroneObjectDetector
```

---

## Honest Capability Statement

| Feature | Status |
|---|---|
| Object detection (person, car, motorcycle, bus, truck) | ✅ Implemented |
| Confidence scores | ✅ Implemented |
| Bounding box coordinates (xyxy) | ✅ Implemented |
| Annotated frame output | ✅ Implemented |
| FPS / processing time reporting | ✅ Implemented |
| Rule-based events (crowd, vehicle count, zone) | ✅ Implemented |
| CPU inference (default) | ✅ Supported |
| CUDA acceleration | ✅ Supported (when GPU available) |
| Multi-frame object tracking | ❌ Not implemented (future work) |
| Face recognition | ❌ Not implemented (future work) |
| Behavioural risk assessment | ❌ Not implemented (not YOLOv8 standard) |
| Custom model training | ❌ Not required for this phase |

---

## Supported Target Classes

From COCO dataset, relevant to drone surveillance:

| Class | COCO ID | Colour |
|---|---|---|
| `person` | 0 | 🟢 Green |
| `car` | 2 | 🟡 Amber |
| `motorcycle` | 3 | 🔵 Blue |
| `bus` | 5 | 🟣 Magenta |
| `truck` | 7 | 🩵 Cyan |

---

## Extending the Detector

### Add a new target class

1. Add its COCO class name and ID to `_COCO_NAMES` in `detector.py`.
2. Add it to `SUPPORTED_CLASSES` and `CLASS_COLOURS` in `utils.py`.
3. Pass it in `target_classes` when constructing `DroneObjectDetector`.

### Switch to a larger model

```python
detector = DroneObjectDetector(model_path="yolov8s.pt")   # small
detector = DroneObjectDetector(model_path="yolov8m.pt")   # medium
```

Larger models are slower but more accurate. Start with `yolov8n` on CPU.

---

## Git Workflow

```
main
 └── feat-ai-detection   ← develop here
      └── PR → main      ← open a Pull Request; never push direct to main
```

**Commit only your files:**

```powershell
git add ai_model/ simulation/
git commit -m "feat(ai_model): add DroneObjectDetector with YOLOv8n"
git push origin feat-ai-detection
# Then open a Pull Request on GitHub
```
