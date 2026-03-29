from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database import Base

def utcnow(): return datetime.now(timezone.utc)

class Commit(Base):
    __tablename__ = "commits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    sha = Column(String(40), nullable=False)
    message = Column(Text)
    author_email = Column(String(255))
    author_name = Column(String(255))
    committed_at = Column(DateTime(timezone=True), nullable=False)
    files_changed = Column(Integer, default=0)
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    review_status = Column(String(50), nullable=False, default="PENDING")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    repository = relationship("Repository", back_populates="commits")
    reviews = relationship("Review", back_populates="commit", cascade="all, delete-orphan")
    developer_commits = relationship("DeveloperCommit", back_populates="commit")
