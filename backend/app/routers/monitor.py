from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.schemas.session import (
    StartMonitoringRequest,
    SessionResponse,
    StopMonitoringResponse,
)
from backend.app.services.pipeline import pipeline

router = APIRouter(prefix="/monitor", tags=["Monitor"])


class AlertSettingsUpdate(BaseModel):
    zone_alerts: bool
    loitering_alerts: bool


@router.get("/alert-settings")
def get_alert_settings():
    return pipeline.get_alert_settings()


@router.post("/alert-settings")
def update_alert_settings(request: AlertSettingsUpdate):
    return pipeline.set_alert_settings(request.zone_alerts, request.loitering_alerts)


@router.post("/start", response_model=SessionResponse, status_code=201)
def start_monitoring(request: StartMonitoringRequest):
    """
    Start monitoring an uploaded video file or supported camera source.
    Auto-detects source_type ('webcam' or 'video_file') if not explicitly provided.
    Prevents duplicate monitoring sessions and validates source authorization.
    """
    source_type = request.source_type
    if not source_type:
        source_type = "webcam" if request.source.isdigit() else "video_file"

    db_session = pipeline.start_session(
        source_type=source_type,
        source=request.source,
    )
    return db_session


@router.post("/stop", response_model=StopMonitoringResponse)
def stop_monitoring():
    """
    Stop active monitoring session and release video capture and processing resources.
    """
    result = pipeline.stop_session()
    return StopMonitoringResponse(**result)
