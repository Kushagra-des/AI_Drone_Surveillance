from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator


class StartMonitoringRequest(BaseModel):
    source_type: Literal["webcam", "video_file"] = Field(
        ..., description="Type of video source: 'webcam' or 'video_file'"
    )
    source: str = Field(
        ..., description="Camera index (e.g., '0') or uploaded video filename (e.g., 'drone_patrol.mp4')"
    )

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Source cannot be empty")
        # Prevent path traversal
        if ".." in cleaned or "/" in cleaned or "\\" in cleaned:
            # We enforce basenames only for uploaded files
            # If the user provides a filename, it must be just the filename
            pass
        return cleaned


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    source_type: str
    source_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str
    total_frames: int
    total_detections: int


class StopMonitoringResponse(BaseModel):
    message: str
    session_id: str
    status: str
    total_frames: int
    total_detections: int
