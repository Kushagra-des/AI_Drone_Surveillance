from backend.app.routers.status import router as status_router
from backend.app.routers.monitor import router as monitor_router
from backend.app.routers.video import router as video_router
from backend.app.routers.detections import router as detections_router
from backend.app.routers.alerts import router as alerts_router
from backend.app.routers.ws import router as ws_router

__all__ = [
    "status_router",
    "monitor_router",
    "video_router",
    "detections_router",
    "alerts_router",
    "ws_router",
]
