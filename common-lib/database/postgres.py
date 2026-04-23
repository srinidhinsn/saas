from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
from pathlib import Path

ENV = os.getenv("ENV", "development")

# BASE_DIR = os.path.abspath(os.path.join(os.getcwd(), ".."))
BASE_DIR = os.getcwd()
env_file = os.path.join(BASE_DIR, f".env.{ENV}")

print("ENV:", ENV)
print("CWD:", BASE_DIR)
print("Looking for:", env_file)

if os.path.exists(env_file):
    load_dotenv(env_file)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(f"DATABASE_URL is not set for ENV={ENV}")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
