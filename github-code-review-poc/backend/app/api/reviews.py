from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Review, Finding
from app.schemas.review import ReviewOut
from app.schemas.finding import FindingOut
import uuid

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])

@router.get("", response_model=List[ReviewOut])
def list_reviews(
    repository_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    q = db.query(Review)
    if repository_id:
        q = q.filter(Review.repository_id == repository_id)
    if status:
        q = q.filter(Review.status == status)
    return q.order_by(Review.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/{review_id}", response_model=ReviewOut)
def get_review(review_id: uuid.UUID, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@router.get("/{review_id}/findings", response_model=List[FindingOut])
def get_review_findings(
    review_id: uuid.UUID,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Finding).filter(Finding.review_id == review_id, Finding.is_false_positive == False)
    if category:
        q = q.filter(Finding.category == category)
    if severity:
        q = q.filter(Finding.severity == severity)
    return q.order_by(Finding.severity).all()
