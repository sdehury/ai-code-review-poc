from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings
import time, logging

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

def get_engine(retries=10, delay=3):
    settings = get_settings()
    for attempt in range(retries):
        try:
            engine = create_engine(settings.database_url, pool_size=settings.db_pool_size, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(__import__('sqlalchemy').text("SELECT 1"))
            logger.info("Database connected successfully")
            return engine
        except Exception as e:
            if attempt < retries - 1:
                logger.warning(f"DB connection attempt {attempt+1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                logger.error("Could not connect to database after all retries")
                raise

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
