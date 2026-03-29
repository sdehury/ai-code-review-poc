from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database import Base

def utcnow(): return datetime.now(timezone.utc)

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner = Column(String(255), nullable=False)
    full_name = Column(String(512), nullable=False, unique=True)
    github_url = Column(Text, nullable=False)
    branch = Column(String(255), nullable=False, default="main")
    access_token_enc = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    commits = relationship("Commit", back_populates="repository", cascade="all, delete-orphan")
    schedule = relationship("ScheduleConfig", back_populates="repository", uselist=False, cascade="all, delete-orphan")
