from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models import Repository, Commit, Review, Finding, Developer
from app.schemas.dashboard import KPISummary, DashboardTrends, TrendPoint

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/summary", response_model=KPISummary)
def get_summary(db: Session = Depends(get_db)):
    total_repos = db.query(func.count(Repository.id)).scalar() or 0
    total_commits = db.query(func.count(Commit.id)).filter(Commit.review_status == "COMPLETED").scalar() or 0
    total_findings = db.query(func.count(Finding.id)).filter(Finding.is_false_positive == False).scalar() or 0
    critical = db.query(func.count(Finding.id)).filter(Finding.severity == "CRITICAL", Finding.is_false_positive == False).scalar() or 0
    high = db.query(func.count(Finding.id)).filter(Finding.severity == "HIGH", Finding.is_false_positive == False).scalar() or 0
    medium = db.query(func.count(Finding.id)).filter(Finding.severity == "MEDIUM", Finding.is_false_positive == False).scalar() or 0
    low = db.query(func.count(Finding.id)).filter(Finding.severity == "LOW", Finding.is_false_positive == False).scalar() or 0
    avg_score = db.query(func.avg(Review.overall_score)).filter(Review.status == "COMPLETED").scalar()
    total_devs = db.query(func.count(Developer.id)).scalar() or 0
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    reviews_today = db.query(func.count(Review.id)).filter(Review.created_at >= today_start).scalar() or 0
    return KPISummary(
        total_repositories=total_repos,
        total_commits_reviewed=total_commits,
        total_findings=total_findings,
        critical_findings=critical,
        high_findings=high,
        medium_findings=medium,
        low_findings=low,
        average_score=round(float(avg_score or 0), 1),
        total_developers=total_devs,
        reviews_today=reviews_today,
    )

@router.get("/trends", response_model=DashboardTrends)
def get_trends(days: int = 30, db: Session = Depends(get_db)):
    trends = []
    for i in range(days - 1, -1, -1):
        day = datetime.now(timezone.utc).date() - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        def count_sev(sev):
            return db.query(func.count(Finding.id)).filter(
                Finding.severity == sev,
                Finding.is_false_positive == False,
                Finding.created_at >= day_start,
                Finding.created_at < day_end
            ).scalar() or 0

        c = count_sev("CRITICAL")
        h = count_sev("HIGH")
        m = count_sev("MEDIUM")
        l = count_sev("LOW")
        trends.append(TrendPoint(date=str(day), critical=c, high=h, medium=m, low=l, total=c+h+m+l))
    return DashboardTrends(trends=trends)
