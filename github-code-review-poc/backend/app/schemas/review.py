from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class ReviewOut(BaseModel):
    id: uuid.UUID
    commit_id: uuid.UUID
    repository_id: uuid.UUID
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    overall_score: Optional[float] = None
    security_score: Optional[float] = None
    quality_score: Optional[float] = None
    techdebt_score: Optional[float] = None
    summary: Optional[str] = None
    ai_review_text: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class CommitOut(BaseModel):
    id: uuid.UUID
    repository_id: uuid.UUID
    sha: str
    message: Optional[str] = None
    author_email: Optional[str] = None
    author_name: Optional[str] = None
    committed_at: datetime
    files_changed: int = 0
    additions: int = 0
    deletions: int = 0
    review_status: str
    created_at: datetime
    model_config = {"from_attributes": True}
