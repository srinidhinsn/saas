from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, session
from database.base import Base

DATABASE_URL = "postgresql://postgres:admin@localhost:5432/saas_app"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db  # Yields session instance for request
    finally:
        db.close()  # Ensures session is closed after use
