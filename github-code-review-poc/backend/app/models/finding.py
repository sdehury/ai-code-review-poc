from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database import Base

def utcnow(): return datetime.now(timezone.utc)

class Finding(Base):
    __tablename__ = "findings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    commit_id = Column(UUID(as_uuid=True), ForeignKey("commits.id"), nullable=False)
    category = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    rule_id = Column(String(100))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    file_path = Column(Text)
    line_start = Column(Integer)
    line_end = Column(Integer)
    code_snippet = Column(Text)
    recommendation = Column(Text)
    cwe_id = Column(String(20))
    owasp_category = Column(String(100))
    is_false_positive = Column(Boolean, nullable=False, default=False)
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    review = relationship("Review", back_populates="findings")

class FindingRule(Base):
    __tablename__ = "finding_rules"
    id = Column(String(100), primary_key=True)
    category = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    cwe_id = Column(String(20))
    recommendation = Column(Text)
