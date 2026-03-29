from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database import Base

def utcnow(): return datetime.now(timezone.utc)

class ScheduleConfig(Base):
    __tablename__ = "schedule_configs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, unique=True)
    cron_expression = Column(String(100), nullable=False, default="0 */6 * * *")
    branch_pattern = Column(String(255), nullable=False, default="develop")
    lookback_days = Column(Integer, nullable=False, default=7)
    max_commits_per_run = Column(Integer, nullable=False, default=50)
    is_active = Column(Boolean, nullable=False, default=True)
    last_run_at = Column(DateTime(timezone=True))
    next_run_at = Column(DateTime(timezone=True))
    last_run_status = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    repository = relationship("Repository", back_populates="schedule")
