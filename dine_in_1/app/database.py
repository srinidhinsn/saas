from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
engine                  = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal            = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base                    = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
