from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.database import get_db
from app.models import Developer
from app.schemas.developer import DeveloperOut

router = APIRouter(prefix="/api/v1/developers", tags=["developers"])

@router.get("", response_model=List[DeveloperOut])
def list_developers(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    return db.query(Developer).order_by(desc(Developer.total_commits)).limit(limit).all()

@router.get("/{login}", response_model=DeveloperOut)
def get_developer(login: str, db: Session = Depends(get_db)):
    dev = db.query(Developer).filter(Developer.github_login == login).first()
    if not dev:
        raise HTTPException(status_code=404, detail="Developer not found")
    return dev
