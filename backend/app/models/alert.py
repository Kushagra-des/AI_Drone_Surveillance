from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class AlertRecord(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("monitoring_sessions.session_id", ondelete="CASCADE"), index=True, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    alert_type = Column(String(64), index=True, nullable=False)
    severity = Column(String(32), default="warning", nullable=False)  # 'info', 'warning', 'critical'
    message = Column(String(512), nullable=False)
    detection_id = Column(Integer, nullable=True)
    source_id = Column(String(256), nullable=False)

    session = relationship("MonitoringSession", back_populates="alerts")
