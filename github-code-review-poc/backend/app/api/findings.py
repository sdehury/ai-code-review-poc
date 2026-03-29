from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Finding
from app.schemas.finding import FindingOut
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/findings", tags=["findings"])

SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}

@router.get("", response_model=List[FindingOut])
def list_findings(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    repository_id: Optional[uuid.UUID] = None,
    include_false_positives: bool = False,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    from app.models import Review
    q = db.query(Finding)
    if not include_false_positives:
        q = q.filter(Finding.is_false_positive == False)
    if category:
        q = q.filter(Finding.category == category)
    if severity:
        q = q.filter(Finding.severity == severity)
    if repository_id:
        q = q.join(Review, Finding.review_id == Review.id).filter(Review.repository_id == repository_id)
    return q.order_by(Finding.created_at.desc()).offset(offset).limit(limit).all()

@router.patch("/{finding_id}/false-positive", response_model=FindingOut)
def mark_false_positive(finding_id: uuid.UUID, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.is_false_positive = True
    db.commit()
    db.refresh(finding)
    return finding

@router.patch("/{finding_id}/resolve", response_model=FindingOut)
def resolve_finding(finding_id: uuid.UUID, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(finding)
    return finding
