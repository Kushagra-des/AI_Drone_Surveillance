from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from backend.app.database import Base


class MonitoringSession(Base):
    __tablename__ = "monitoring_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    source_type = Column(String(32), nullable=False)  # 'webcam' or 'video_file'
    source_id = Column(String(256), nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(32), default="active", nullable=False)  # 'active', 'stopped', 'failed'
    total_frames = Column(Integer, default=0, nullable=False)
    total_detections = Column(Integer, default=0, nullable=False)

    detections = relationship("DetectionRecord", back_populates="session", cascade="all, delete-orphan")
    alerts = relationship("AlertRecord", back_populates="session", cascade="all, delete-orphan")
