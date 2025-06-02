from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Configuration class
class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:admin@localhost/saas_app"

    class Config:
        env_file      = ".env"

# SQLAlchemy setup
settings                = Settings()
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


