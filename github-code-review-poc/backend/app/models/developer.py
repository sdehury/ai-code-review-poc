from sqlalchemy import Column, String, Integer, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database import Base

def utcnow(): return datetime.now(timezone.utc)

class Developer(Base):
    __tablename__ = "developers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    github_login = Column(String(255), nullable=False, unique=True)
    name = Column(String(255))
    email = Column(String(255))
    avatar_url = Column(String(512))
    total_commits = Column(Integer, nullable=False, default=0)
    total_additions = Column(Integer, nullable=False, default=0)
    total_deletions = Column(Integer, nullable=False, default=0)
    critical_findings_count = Column(Integer, nullable=False, default=0)
    high_findings_count = Column(Integer, nullable=False, default=0)
    risk_score = Column(Numeric(5, 2), default=0.0)
    first_seen_at = Column(DateTime(timezone=True))
    last_seen_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    developer_commits = relationship("DeveloperCommit", back_populates="developer")

class DeveloperCommit(Base):
    __tablename__ = "developer_commits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("developers.id"), nullable=False)
    commit_id = Column(UUID(as_uuid=True), ForeignKey("commits.id"), nullable=False)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id"), nullable=False)
    developer = relationship("Developer", back_populates="developer_commits")
    commit = relationship("Commit", back_populates="developer_commits")
