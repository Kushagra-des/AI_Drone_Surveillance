from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class RawDetection(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    class_name: str = Field(..., alias="class", serialization_alias="class", description="Detected object class")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    bbox: List[float] = Field(..., min_length=4, max_length=4, description="Bounding box in pixel coordinates [x1, y1, x2, y2]")


class DetectionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: int
    session_id: str
    timestamp: datetime
    class_name: str = Field(..., alias="class", serialization_alias="class")
    confidence: float
    bbox: List[float]
    source_id: str


class DetectionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[DetectionResponse]


class WebSocketDetectionMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event: str = "detection_update"
    session_id: str
    source_id: str
    timestamp: datetime
    frame_index: int
    detections: List[RawDetection]
