from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
import uuid

class RepositoryCreate(BaseModel):
    name: str
    owner: str
    full_name: str
    github_url: str
    branch: str = "main"
    access_token: Optional[str] = None

class RepositoryUpdate(BaseModel):
    branch: Optional[str] = None
    access_token: Optional[str] = None
    is_active: Optional[bool] = None

class ScheduleConfigCreate(BaseModel):
    cron_expression: str = "0 */6 * * *"
    branch_pattern: str = "develop"
    lookback_days: int = 7
    max_commits_per_run: int = 50
    is_active: bool = True

class ScheduleConfigOut(BaseModel):
    id: uuid.UUID
    cron_expression: str
    branch_pattern: str
    lookback_days: int
    max_commits_per_run: int
    is_active: bool
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    model_config = {"from_attributes": True}

class RepositoryOut(BaseModel):
    id: uuid.UUID
    name: str
    owner: str
    full_name: str
    github_url: str
    branch: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    schedule: Optional[ScheduleConfigOut] = None
    model_config = {"from_attributes": True}
