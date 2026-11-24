from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator


class StartMonitoringRequest(BaseModel):
    source_type: Optional[Literal["webcam", "video_file"]] = Field(
        None, description="Type of video source: 'webcam' or 'video_file' (auto-detected if omitted)"
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
