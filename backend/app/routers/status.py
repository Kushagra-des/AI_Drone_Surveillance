import time
from typing import Optional
from fastapi import APIRouter
from backend.app.schemas.common import StatusResponse
from backend.app.schemas.session import SessionResponse
from backend.app.services.pipeline import pipeline
from backend.app.services.connection_manager import manager
from backend.app.config import settings

router = APIRouter(tags=["Status"])
server_start_time = time.time()


@router.get("/status", response_model=StatusResponse)
def get_status():
    """
    Returns system health, uptime, active surveillance session, and performance telemetry.
    """
    uptime = round(time.time() - server_start_time, 2)
    session_info = pipeline.get_active_session_info()

    active_session_model: Optional[SessionResponse] = None
    if session_info:
        active_session_model = SessionResponse(
            id=0,  # Telemetry summary
            session_id=session_info["session_id"],
            source_type=session_info["source_type"],
            source_id=session_info["source_id"],
            started_at=session_info["started_at"],
            status="active",
            total_frames=session_info["total_frames"],
            total_detections=session_info["total_detections"],
        )

    return StatusResponse(
        status="operational",
        uptime_seconds=uptime,
        active_session=active_session_model,
        detector_type=settings.DETECTOR_TYPE,
        connected_ws_clients=manager.client_count,
        fps=pipeline.fps if pipeline.is_active else 0.0,
    )
