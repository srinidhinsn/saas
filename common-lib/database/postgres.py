from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, session
import psycopg2

conn = psycopg2.connect(
    host="saas-473815:asia-south2:saas", # Or private IP if using private connectivity
    database="saas",
    user="postgres",
    password="Saasqa@123",
    port="5432" # Default PostgreSQL port
)

def get_db():
    db = conn()
    try:
        yield db  # Yields session instance for request
    finally:
        db.close()  # Ensures session is closed after use
