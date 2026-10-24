from typing import Optional
from pydantic import BaseModel
from backend.app.schemas.session import SessionResponse


class StatusResponse(BaseModel):
    status: str
    uptime_seconds: float
    active_session: Optional[SessionResponse] = None
    detector_type: str
    connected_ws_clients: int
    fps: float


class VideoUploadResponse(BaseModel):
    filename: str
    file_path: str
    file_size_mb: float
    message: str


class ErrorResponse(BaseModel):
    detail: str
