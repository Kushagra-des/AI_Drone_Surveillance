# AI Drone Surveillance System - Tactical Frontend HUD

A real-time command, control, and reconnaissance dashboard engineered for the **AI Drone Surveillance System** (College Minor Project). Built with **React 18**, **Vite**, **Tailwind CSS**, and **Recharts**, designed to pair with a Python FastAPI backend and a YOLOv8 object detection pipeline.

---

## ⚡ Tech Stack & Architecture

- **Core Framework:** React 18 (Functional Components & Hooks)
- **Bundler & Tooling:** Vite 6
- **Styling:** Tailwind CSS (Tactical Military Dark HUD Aesthetic)
- **Routing:** React Router v6
- **Data & Charts:** Recharts (Temporal Detections & Class Distributions)
- **HTTP & Streaming:** Axios & Native WebSockets
- **Icons:** Lucide React

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/             # Reusable UI: Badges, Cards, Modals, Spinners, Toast
│   │   ├── layout/             # Shell: Sidebar HUD, TopNav Telemetry, Responsive Drawer
│   │   └── surveillance/       # Core panels: VideoFeedPanel, LiveDetectionList, TelemetryHUD
│   ├── context/
│   │   ├── SurveillanceContext # Global telemetry, streaming state, detections & alert handlers
│   │   └── ToastContext        # Toast notifications
│   ├── pages/
│   │   ├── Dashboard.jsx       # Global KPI statistics, visual trends & feed preview
│   │   ├── LiveMonitoring.jsx  # High-resolution video feed, source switcher, WS detection feed
│   │   ├── DetectionHistory.jsx# Searchable/filterable tabular archive with CSV/JSON exports
│   │   ├── Alerts.jsx          # Incident management, severity filters & triage actions
│   │   ├── VideoUpload.jsx     # Drag & drop flight video uploader (MP4/AVI)
│   │   └── Settings.jsx        # API endpoints, YOLOv8 confidence sliders & class filters
│   ├── services/
│   │   ├── api.js              # Centralized Axios client for all REST endpoints
│   │   ├── websocket.js        # WS client with auto-reconnect & mock fallback
│   │   └── mockData.js         # Realistic synthetic drone telemetry & YOLO detections
│   ├── App.jsx                 # Route definitions
│   ├── main.jsx                # React DOM entry
│   └── index.css               # Scanline & HUD tactical styling
├── .env.example                # Template for environment configuration
├── vite.config.js              # Optimized rollup chunks & dev proxy config
└── tailwind.config.js          # Custom surveillance color tokens
```

---

## 🚀 Quickstart & Installation

### Prerequisites
- Node.js `v18+` or `v20+` (tested on `v24.x`)
- npm `v9+` or `v11+`

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Default parameters in `.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ENABLE_MOCK_FALLBACK=true
VITE_APP_TITLE=AI Drone Surveillance
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## 📡 API Contract Specification

The frontend connects to the FastAPI backend conforming to the shared team contract:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | System health, drone telemetry (altitude, battery, fps, AI model) |
| `POST` | `/api/monitor/start` | Start surveillance session for selected video source |
| `POST` | `/api/monitor/stop` | Terminate active surveillance session |
| `GET` | `/api/detections` | Query detection history records (supports filtering params) |
| `GET` | `/api/alerts` | Retrieve perimeter alerts and security incidents |
| `GET` | `/api/video-feed` | Video streaming endpoint (`/api/video-feed?source=drone_cam_1`) |
| `WS` | `/ws/detections` | Real-time WebSocket emitting live detection events |
| `POST` | `/api/videos/upload` | Multipart form file upload for `.mp4`, `.avi`, `.mov`, `.mkv` |

### Standard Detection Object Schema
```typescript
interface Detection {
  id?: string;
  class: string;           // "person" | "car" | "truck" | "motorcycle" | "bicycle"
  confidence: number;      // 0.00 to 1.00
  bbox: [number, number, number, number]; // [x, y, width, height]
  timestamp?: string;      // ISO 8601 string
  source?: string;         // "drone_cam_1" | "drone_cam_2" | "uploaded_video"
  zone?: string;           // Optional spatial zone label
}
```

---

## 🛡️ Standalone / Demo Fallback Mode

If the Python backend (`backend/`) or YOLO model (`ai_model/`) has not been started yet by teammates, the frontend **automatically enables Demo Mode**:
1. It simulates continuous real-time YOLOv8 detections over WebSocket.
2. It generates synthetic drone HUD overlays (pitch ladder, altitude, coordinates, crosshairs).
3. It displays a banner indicating `DEMO MODE ACTIVE` with a one-click **"Retry Link"** button to reconnect once FastAPI is launched.
4. You can configure the API endpoint dynamically in the **Settings** page and test connectivity using `GET /api/status`.

---

## 👥 Team Module Ownership Boundaries

In accordance with our team separation:
- **Member 1 (Frontend):** Owns `frontend/` (React SPA, styling, client-side state, visualizations).
- **Member 2 (Backend):** Owns `backend/` (FastAPI endpoints, streaming endpoints, database).
- **Member 3 (AI & Model):** Owns `ai_model/` and `simulation/` (YOLOv8 weights, OpenCV processing).

> Note: All shared endpoints follow the agreed API contract. Neither `backend/` nor `ai_model/` are touched by frontend feature branches.
