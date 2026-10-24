from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    timestamp: datetime
    alert_type: str
    severity: str
    message: str
    detection_id: Optional[int] = None
    source_id: str


class AlertListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AlertResponse]


class WebSocketAlertMessage(BaseModel):
    event: str = "alert"
    alert: AlertResponse
