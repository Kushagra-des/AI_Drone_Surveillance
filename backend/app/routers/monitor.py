from fastapi import APIRouter
from backend.app.schemas.session import (
    StartMonitoringRequest,
    SessionResponse,
    StopMonitoringResponse,
)
from backend.app.services.pipeline import pipeline

router = APIRouter(prefix="/monitor", tags=["Monitor"])


@router.post("/start", response_model=SessionResponse, status_code=201)
def start_monitoring(request: StartMonitoringRequest):
    """
    Start monitoring an uploaded video file or supported camera source.
    Prevents duplicate monitoring sessions and validates source authorization.
    """
    db_session = pipeline.start_session(
        source_type=request.source_type,
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
