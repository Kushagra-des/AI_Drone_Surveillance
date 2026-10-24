# Simulation Module — AI Drone Surveillance System

**Owner:** Member 3 | **Status:** Planned (not yet implemented)

> [!IMPORTANT]
> The simulation module is **optional future work**.  
> The core detection pipeline in `ai_model/` must be working and tested
> before any simulation infrastructure is built here.

---

## Purpose

The `simulation/` directory is reserved for a virtual environment that
generates synthetic drone footage for testing and dataset collection.
This allows the AI model to be validated and improved without requiring
access to a physical drone or real surveillance footage.

---

## Planned Simulation Approaches

### Option A — Unreal Engine 5 (Preferred)

Unreal Engine 5 (UE5) can render photorealistic drone footage with
configurable lighting, weather, crowd density, and camera parameters.

**Why UE5?**

| Reason | Detail |
|---|---|
| Photorealism | Ray-traced rendering produces footage the model cannot distinguish from real video |
| Controllability | Crowd density, weather, time-of-day can be scripted precisely |
| Ground-truth labels | Bounding boxes and class masks are available directly from the engine |
| Free for students | UE5 is free for non-commercial / educational use |

**Planned integration steps (future):**

1. Create a UE5 project with a top-down drone camera rig.
2. Populate the scene with person, car, motorcycle, bus, and truck actors.
3. Use the **Unreal Remote Control API** or **UnrealCV** plugin to stream
   frames to Python at runtime.
4. Feed frames to `DroneObjectDetector.process_frame()` for live evaluation.
5. Record annotated output for qualitative and quantitative analysis.

**Estimated UE5 prerequisites:**
- Unreal Engine 5.3+
- Windows 10/11, GPU with ≥ 8 GB VRAM
- `unrealcv` Python package for frame streaming

---

### Option B — OpenCV + Background Subtraction (Lightweight)

A simpler, CPU-only simulation using pre-recorded drone footage with
injected synthetic objects via affine transforms. Requires no game engine.

Useful for quick CI testing on low-end hardware.

---

### Option C — Blender Python API

Blender's scripted rendering pipeline can produce annotated synthetic frames
at lower hardware cost than UE5, with full control over scene composition.

---

## Files Planned for This Directory

```
simulation/
├── README.md                ← This file
├── requirements.txt         ← (future) UE5/Blender Python bridge deps
├── ue5_bridge/
│   ├── __init__.py
│   ├── stream_client.py     ← Connects to UnrealCV, yields frames
│   └── scene_config.py     ← Crowd, weather, camera params
└── scripts/
    └── eval_on_sim.py       ← Run detector on simulated stream, log metrics
```

---

## Integration with `ai_model/`

When implemented, the simulation will call `DroneObjectDetector` exactly the
same way the backend does — no special simulator API:

```python
from ai_model.detector import DroneObjectDetector

detector = DroneObjectDetector(device="auto")

for frame in sim_stream:   # yields BGR numpy frames
    annotated, detections = detector.process_frame(frame)
    # log detections, compare with ground-truth labels from UE5
```

This keeps the detector interface stable and makes the simulation a pure
consumer of the public API.

---

## Do Not Implement Yet

Focus first on:

1. ✅ `ai_model/detector.py` — core detection class
2. ✅ `ai_model/demo.py` — working demo on real webcam / video
3. ✅ `ai_model/test_detector.py` — all tests passing
4. ⬜ Backend integration tested end-to-end
5. ⬜ Frontend receiving and rendering detection JSON

Only after steps 1–4 are stable should simulation work begin.
