from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.detection import DetectionRecord
from backend.app.schemas.detection import DetectionResponse, DetectionListResponse

router = APIRouter(prefix="/detections", tags=["Detections"])


@router.get("", response_model=DetectionListResponse)
def get_detections(
    session_id: Optional[str] = Query(None, description="Filter by monitoring session ID"),
    class_name: Optional[str] = Query(None, alias="class", description="Filter by detected class name"),
    min_confidence: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum confidence score"),
    max_confidence: Optional[float] = Query(None, ge=0.0, le=1.0, description="Maximum confidence score"),
    start_time: Optional[datetime] = Query(None, description="Start timestamp filter (ISO 8601)"),
    end_time: Optional[datetime] = Query(None, description="End timestamp filter (ISO 8601)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical detection records with filtering and pagination.
    Returns pixel bounding boxes in xyxy format with timestamp and source identifier.
    """
    query = db.query(DetectionRecord)

    if session_id:
        query = query.filter(DetectionRecord.session_id == session_id)
    if class_name:
        query = query.filter(DetectionRecord.class_name == class_name.lower())
    if min_confidence is not None:
        query = query.filter(DetectionRecord.confidence >= min_confidence)
    if max_confidence is not None:
        query = query.filter(DetectionRecord.confidence <= max_confidence)
    if start_time:
        query = query.filter(DetectionRecord.timestamp >= start_time)
    if end_time:
        query = query.filter(DetectionRecord.timestamp <= end_time)

    total = query.count()
    records = (
        query.order_by(desc(DetectionRecord.timestamp))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        DetectionResponse(
            id=rec.id,
            session_id=rec.session_id,
            timestamp=rec.timestamp,
            class_name=rec.class_name,
            confidence=rec.confidence,
            bbox=[rec.bbox_x1, rec.bbox_y1, rec.bbox_x2, rec.bbox_y2],
            source_id=rec.source_id,
        )
        for rec in records
    ]

    return DetectionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
