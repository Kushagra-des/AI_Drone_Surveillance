# AI Drone Surveillance System - Backend Service

Production-ready, modular FastAPI backend service for the AI Drone Surveillance System college minor project.

Provides real-time AI object detection streaming via MJPEG and WebSockets, secure video ingestion, background inference pipeline execution, and SQLite persistence for detection records and alert management.

---

## Architecture & Responsibilities

- **Module Ownership**: Member 2 owns `backend/`.
- **Inference Isolation**: AI inference runs in a dedicated background worker thread off the HTTP request event loop.
- **Single Processing Pipeline**: Video ingestion, detector inference, MJPEG encoding, WebSocket broadcasting, and database writes are managed centrally in a single pipeline per active session.
- **Security & Authorization**:
  - Bound to `127.0.0.1` by default (never exposed publicly).
  - Configurable CORS via environment variables.
  - Strict webcam whitelist (`ALLOWED_CAMERA_SOURCES`).
  - Path traversal protection on uploaded video paths.
  - File extension and size validation on uploads.
  - Prevention of duplicate concurrent monitoring sessions.

---

## Directory Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application entry point, CORS, lifespan, logging
│   ├── config.py                # Environment-driven settings and security parameters
│   ├── database.py              # SQLite engine, WAL mode, session maker, Base model
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── session.py           # MonitoringSession model
│   │   ├── detection.py         # DetectionRecord model
│   │   └── alert.py             # AlertRecord model
│   ├── schemas/                 # Pydantic validation models
│   │   ├── __init__.py
│   │   ├── common.py            # StatusResponse, VideoUploadResponse
│   │   ├── session.py           # StartMonitoringRequest, SessionResponse
│   │   ├── detection.py         # RawDetection, DetectionResponse, WebSocketDetectionMessage
│   │   └── alert.py             # AlertResponse, WebSocketAlertMessage
│   ├── routers/                 # Modular API endpoints
│   │   ├── __init__.py
│   │   ├── status.py            # GET /api/status
│   │   ├── monitor.py           # POST /api/monitor/start, POST /api/monitor/stop
│   │   ├── video.py             # POST /api/videos/upload, GET /api/videos, GET /api/video-feed
│   │   ├── detections.py        # GET /api/detections
│   │   ├── alerts.py            # GET /api/alerts
│   │   └── ws.py                # WS /ws/detections
│   ├── services/                # Business logic & pipeline execution
│   │   ├── __init__.py
│   │   ├── connection_manager.py# WebSocket client manager and thread-safe broadcaster
│   │   ├── alert_service.py     # Rule-based alert evaluator & generator
│   │   ├── video_storage.py     # Secure upload validator & file path resolver
│   │   └── pipeline.py          # Central threaded capture & inference worker
│   └── detector/                # Detection abstraction layer
│       ├── __init__.py          # Detector factory (get_detector)
│       ├── base.py              # BaseDetector abstract interface
│       ├── mock_detector.py     # Simulated drone detector with HUD visualization
│       └── yolo_adapter.py      # Adapter dynamically importing ai_model / YOLOv8
├── tests/                       # Unit & integration test suite
│   ├── __init__.py
│   ├── test_detector.py         # Unit tests for MockDetector and YOLOAdapter
│   ├── test_status.py           # Integration test for /api/status
│   ├── test_videos.py           # Tests for video upload, validation, and storage
│   ├── test_monitor.py          # Tests for session start, stop, 409 conflict, authorization
│   ├── test_detections_alerts.py# Tests for detection/alert filtering and schemas
│   ├── test_video_feed.py       # Tests for MJPEG multipart video feed
│   └── test_websocket.py        # Tests for WebSocket connection & heartbeat
├── uploads/                     # Storage directory for validated uploaded videos (.gitignore protected)
├── .env.example                 # Template for environment variables
├── requirements.txt             # Project dependencies
└── README.md                    # Setup and execution guide
```

---

## Shared Detection Interface & Data Schema

The detector contract adheres to:

```python
(annotated_frame, detections) = detector.process_frame(frame)
```

Where each item in `detections` is formatted as:

```json
{
  "class": "human",
  "confidence": 0.94,
  "bbox": [120.0, 80.0, 240.0, 310.0]
}
```

- Bounding box `bbox` contains pixel coordinates in `[x1, y1, x2, y2]` order (`xyxy`).
- Backend API responses enrich detection records with `id`, `session_id`, `timestamp` (ISO 8601), and `source_id`.

---

## Windows Setup and Run Instructions

### 1. Prerequisites
- Windows 10/11
- Python 3.11 or higher installed and added to PATH (`python --version`)
- PowerShell or Windows Command Prompt

### 2. Navigate to Backend Directory
Open PowerShell in the repository root and change directory to `backend`:

```powershell
cd D:\Project\Ai-drone\AI_Drone_Surveillance\backend
```

### 3. Create and Activate Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

*(Note: If script execution is restricted in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

### 4. Install Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Copy the `.env.example` file to `.env`:

```powershell
Copy-Item .env.example .env
```

Modify `.env` if needed:
- `CORS_ORIGINS`: Comma-separated allowed frontend origins (e.g. `http://localhost:5173`).
- `ALLOWED_CAMERA_SOURCES`: Permitted webcam indices (`0,1`).
- `DETECTOR_TYPE`: Set to `mock` for standalone development or `yolo` when integrating with `ai_model/`.

### 6. Run the Backend Server
Run Uvicorn from the repository root or backend folder:

```powershell
# From repository root:
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Or run directly:

```powershell
python -m backend.app.main
```

The server will start at:
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

---

## API Reference

### Health & Status
- **`GET /api/status`**
  Returns server health, uptime, active session metadata, FPS, and WebSocket client count.

### Video Management
- **`POST /api/videos/upload`**
  Uploads video file (`multipart/form-data`, key `file`). Validates size (max 200MB) and extensions (`.mp4`, `.avi`, `.mov`, `.mkv`).
- **`GET /api/videos`**
  Lists all uploaded video files available for monitoring.
- **`GET /api/video-feed`**
  MJPEG multipart stream (`multipart/x-mixed-replace; boundary=frame`) displaying live annotated drone feed.

### Monitoring Controls
- **`POST /api/monitor/start`**
  Starts background surveillance session. Prevents duplicate sessions.
  ```json
  {
    "source_type": "video_file",
    "source": "drone_patrol.mp4"
  }
  ```
  *(Or for webcam: `{"source_type": "webcam", "source": "0"}`)*
- **`POST /api/monitor/stop`**
  Stops active surveillance and releases capture resources.

### Historical Records & Analytics
- **`GET /api/detections`**
  Query historical detections.
  - Query parameters: `session_id`, `class`, `min_confidence`, `max_confidence`, `start_time`, `end_time`, `page`, `page_size`.
- **`GET /api/alerts`**
  Query security alerts.
  - Query parameters: `session_id`, `severity` (`info`, `warning`, `critical`), `alert_type`, `page`, `page_size`.

### Real-Time WebSocket
- **`WS /ws/detections`**
  WebSocket stream broadcasting live detection payloads and alert events.
  - Handshake confirmation:
    ```json
    {"event": "connected", "message": "Connected to AI Drone Surveillance WebSocket stream."}
    ```
  - Detection broadcast payload:
    ```json
    {
      "event": "detection_update",
      "session_id": "session_xxx",
      "source_id": "0",
      "timestamp": "2026-10-24T22:30:00Z",
      "frame_index": 142,
      "detections": [
        {
          "class": "human",
          "confidence": 0.92,
          "bbox": [100.0, 150.0, 220.0, 340.0]
        }
      ]
    }
    ```
  - Alert broadcast payload:
    ```json
    {
      "event": "alert",
      "alert": {
        "id": 1,
        "session_id": "session_xxx",
        "timestamp": "2026-10-24T22:30:00Z",
        "alert_type": "DETECTED_HUMAN",
        "severity": "critical",
        "message": "Alert: High-confidence HUMAN (92.0%) detected in surveillance sector.",
        "detection_id": 15,
        "source_id": "0"
      }
    }
    ```

---

## Running the Automated Test Suite

All unit and integration tests can be executed with Python's built-in `unittest` runner:

```powershell
python -m unittest discover -s backend/tests -p "test_*.py"
```

Or with `pytest`:

```powershell
pytest backend/tests
```
