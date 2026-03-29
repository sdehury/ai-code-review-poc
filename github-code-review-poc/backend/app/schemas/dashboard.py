from pydantic import BaseModel
from typing import List, Dict, Optional

class KPISummary(BaseModel):
    total_repositories: int
    total_commits_reviewed: int
    total_findings: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    average_score: float
    total_developers: int
    reviews_today: int

class TrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int
    total: int

class DashboardTrends(BaseModel):
    trends: List[TrendPoint]
