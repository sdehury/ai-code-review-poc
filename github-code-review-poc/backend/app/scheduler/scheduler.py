import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="UTC")
_started = False

def get_scheduler() -> BackgroundScheduler:
    return _scheduler

def start_scheduler(db: Session):
    global _started
    if _started:
        return
    try:
        _load_schedules(db)
        _scheduler.start()
        _started = True
        logger.info("Scheduler started")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")

def _run_review(repository_id: str):
    from app.database import SessionLocal
    from app.services.analysis_engine import AnalysisEngine
    session = SessionLocal()
    try:
        engine = AnalysisEngine(session)
        engine.process_repository(repository_id)
    except Exception as e:
        logger.error(f"Scheduled review failed for {repository_id}: {e}")
    finally:
        session.close()

def _load_schedules(db: Session):
    from app.models import ScheduleConfig
    configs = db.query(ScheduleConfig).filter(ScheduleConfig.is_active == True).all()
    for cfg in configs:
        try:
            _scheduler.add_job(
                _run_review,
                CronTrigger.from_crontab(cfg.cron_expression),
                args=[str(cfg.repository_id)],
                id=f"review_{cfg.repository_id}",
                replace_existing=True,
                misfire_grace_time=3600,
            )
            logger.info(f"Scheduled review for repo {cfg.repository_id}: {cfg.cron_expression}")
        except Exception as e:
            logger.warning(f"Could not schedule repo {cfg.repository_id}: {e}")

def register_dynamic_schedule(repository_id: str, cron_expression: str, db: Session = None):
    try:
        _scheduler.add_job(
            _run_review,
            CronTrigger.from_crontab(cron_expression),
            args=[repository_id],
            id=f"review_{repository_id}",
            replace_existing=True,
            misfire_grace_time=3600,
        )
    except Exception as e:
        logger.error(f"Failed to register schedule: {e}")

def shutdown_scheduler():
    global _started
    if _started:
        _scheduler.shutdown()
        _started = False
