from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.config import get_settings
from app.database import engine, Base
from app.api import repos, reviews, findings, developers, dashboard

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if not exist (Flyway should handle this, but safety net)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified")
    except Exception as e:
        logger.warning(f"Table creation skipped (may already exist): {e}")

    # Start scheduler
    try:
        from app.database import SessionLocal
        from app.scheduler.scheduler import start_scheduler
        db = SessionLocal()
        start_scheduler(db)
        db.close()
    except Exception as e:
        logger.error(f"Scheduler startup failed: {e}")

    yield

    # Shutdown
    try:
        from app.scheduler.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass

settings = get_settings()

app = FastAPI(
    title="Java Code Review Platform",
    description="Automated Java/Spring code review with security and tech debt analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(repos.router)
app.include_router(reviews.router)
app.include_router(findings.router)
app.include_router(developers.router)
app.include_router(dashboard.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/api/v1/scheduler/status")
def scheduler_status():
    from app.scheduler.scheduler import get_scheduler
    sched = get_scheduler()
    jobs = []
    try:
        for job in sched.get_jobs():
            jobs.append({"id": job.id, "next_run": str(job.next_run_time)})
    except Exception:
        pass
    return {"running": sched.running, "jobs": jobs}
