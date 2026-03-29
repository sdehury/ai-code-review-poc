from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Repository, ScheduleConfig
from app.schemas.repository import RepositoryCreate, RepositoryUpdate, RepositoryOut, ScheduleConfigCreate, ScheduleConfigOut
from app.schemas.review import CommitOut
import uuid

router = APIRouter(prefix="/api/v1/repositories", tags=["repositories"])

@router.get("", response_model=List[RepositoryOut])
def list_repositories(db: Session = Depends(get_db)):
    return db.query(Repository).order_by(Repository.created_at.desc()).all()

@router.post("", response_model=RepositoryOut, status_code=201)
def create_repository(payload: RepositoryCreate, db: Session = Depends(get_db)):
    existing = db.query(Repository).filter(Repository.full_name == payload.full_name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Repository already exists")
    token_enc = None
    if payload.access_token:
        try:
            from app.services.crypto_service import encrypt_token
            token_enc = encrypt_token(payload.access_token)
        except Exception:
            token_enc = payload.access_token
    repo = Repository(
        name=payload.name,
        owner=payload.owner,
        full_name=payload.full_name,
        github_url=payload.github_url,
        branch=payload.branch,
        access_token_enc=token_enc,
    )
    db.add(repo)
    db.flush()
    # Create default schedule
    schedule = ScheduleConfig(repository_id=repo.id)
    db.add(schedule)
    db.commit()
    db.refresh(repo)
    return repo

@router.get("/{repo_id}", response_model=RepositoryOut)
def get_repository(repo_id: uuid.UUID, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

@router.put("/{repo_id}", response_model=RepositoryOut)
def update_repository(repo_id: uuid.UUID, payload: RepositoryUpdate, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if payload.branch is not None:
        repo.branch = payload.branch
    if payload.is_active is not None:
        repo.is_active = payload.is_active
    if payload.access_token is not None:
        try:
            from app.services.crypto_service import encrypt_token
            repo.access_token_enc = encrypt_token(payload.access_token)
        except Exception:
            repo.access_token_enc = payload.access_token
    db.commit()
    db.refresh(repo)
    return repo

@router.delete("/{repo_id}", status_code=204)
def delete_repository(repo_id: uuid.UUID, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    db.delete(repo)
    db.commit()

@router.get("/{repo_id}/commits", response_model=List[CommitOut])
def list_commits(repo_id: uuid.UUID, limit: int = 50, db: Session = Depends(get_db)):
    from app.models import Commit
    return db.query(Commit).filter(Commit.repository_id == repo_id).order_by(Commit.committed_at.desc()).limit(limit).all()

@router.get("/{repo_id}/schedule", response_model=ScheduleConfigOut)
def get_schedule(repo_id: uuid.UUID, db: Session = Depends(get_db)):
    schedule = db.query(ScheduleConfig).filter(ScheduleConfig.repository_id == repo_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule

@router.post("/{repo_id}/schedule", response_model=ScheduleConfigOut)
def upsert_schedule(repo_id: uuid.UUID, payload: ScheduleConfigCreate, db: Session = Depends(get_db)):
    schedule = db.query(ScheduleConfig).filter(ScheduleConfig.repository_id == repo_id).first()
    if not schedule:
        schedule = ScheduleConfig(repository_id=repo_id)
        db.add(schedule)
    schedule.cron_expression = payload.cron_expression
    schedule.branch_pattern = payload.branch_pattern
    schedule.lookback_days = payload.lookback_days
    schedule.max_commits_per_run = payload.max_commits_per_run
    schedule.is_active = payload.is_active
    db.commit()
    db.refresh(schedule)
    # Re-register with scheduler
    try:
        from app.scheduler.scheduler import register_dynamic_schedule
        if payload.is_active:
            register_dynamic_schedule(str(repo_id), payload.cron_expression, db)
    except Exception:
        pass
    return schedule

@router.post("/{repo_id}/trigger", status_code=202)
def trigger_review(repo_id: uuid.UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    def run_analysis():
        from app.database import SessionLocal
        from app.services.analysis_engine import AnalysisEngine
        session = SessionLocal()
        try:
            engine = AnalysisEngine(session)
            engine.process_repository(str(repo_id))
        finally:
            session.close()

    background_tasks.add_task(run_analysis)
    return {"message": "Review triggered", "repository_id": str(repo_id)}
