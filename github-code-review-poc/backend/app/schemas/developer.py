from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class DeveloperOut(BaseModel):
    id: uuid.UUID
    github_login: str
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    total_commits: int = 0
    total_additions: int = 0
    total_deletions: int = 0
    critical_findings_count: int = 0
    high_findings_count: int = 0
    risk_score: float = 0.0
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}
