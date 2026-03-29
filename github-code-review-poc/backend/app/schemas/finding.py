from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class FindingOut(BaseModel):
    id: uuid.UUID
    review_id: uuid.UUID
    commit_id: uuid.UUID
    category: str
    severity: str
    rule_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    code_snippet: Optional[str] = None
    recommendation: Optional[str] = None
    cwe_id: Optional[str] = None
    owasp_category: Optional[str] = None
    is_false_positive: bool = False
    resolved_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}
