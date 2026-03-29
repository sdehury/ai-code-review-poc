from sqlalchemy import Column, String, Integer, DateTime, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database import Base

def utcnow(): return datetime.now(timezone.utc)

class Review(Base):
    __tablename__ = "reviews"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commit_id = Column(UUID(as_uuid=True), ForeignKey("commits.id", ondelete="CASCADE"), nullable=False)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id"), nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    duration_ms = Column(Integer)
    overall_score = Column(Numeric(5, 2))
    security_score = Column(Numeric(5, 2))
    quality_score = Column(Numeric(5, 2))
    techdebt_score = Column(Numeric(5, 2))
    summary = Column(Text)
    ai_review_text = Column(Text)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    commit = relationship("Commit", back_populates="reviews")
    repository = relationship("Repository")
    findings = relationship("Finding", back_populates="review", cascade="all, delete-orphan")
