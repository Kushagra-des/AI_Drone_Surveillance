from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.alert import AlertRecord
from backend.app.schemas.alert import AlertResponse, AlertListResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertListResponse)
def get_alerts(
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    severity: Optional[str] = Query(None, description="Filter by severity ('info', 'warning', 'critical')"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type code"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical security and surveillance alerts with filtering and pagination.
    """
    query = db.query(AlertRecord)

    if session_id:
        query = query.filter(AlertRecord.session_id == session_id)
    if severity:
        query = query.filter(AlertRecord.severity == severity.lower())
    if alert_type:
        query = query.filter(AlertRecord.alert_type == alert_type)

    total = query.count()
    records = (
        query.order_by(desc(AlertRecord.timestamp))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        AlertResponse(
            id=rec.id,
            session_id=rec.session_id,
            timestamp=rec.timestamp,
            alert_type=rec.alert_type,
            severity=rec.severity,
            message=rec.message,
            detection_id=rec.detection_id,
            source_id=rec.source_id,
        )
        for rec in records
    ]

    return AlertListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
