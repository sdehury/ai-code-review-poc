from sqlalchemy import Column, Integer, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.database import Base

def utcnow(): return datetime.now(timezone.utc)

class TechDebtSnapshot(Base):
    __tablename__ = "tech_debt_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    total_issues = Column(Integer, nullable=False, default=0)
    critical_count = Column(Integer, nullable=False, default=0)
    high_count = Column(Integer, nullable=False, default=0)
    medium_count = Column(Integer, nullable=False, default=0)
    low_count = Column(Integer, nullable=False, default=0)
    debt_minutes = Column(Integer, nullable=False, default=0)
    debt_ratio = Column(Numeric(5, 2))
    created_at = Column(DateTime(timezone=True), default=utcnow)
