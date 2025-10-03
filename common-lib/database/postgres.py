import psycopg2
from contextlib import contextmanager

# Create a connection once (not callable)
conn = psycopg2.connect(
    host="saas-473815:asia-south2:saas",  # Use IP if needed
    database="saas",
    user="postgres",
    password="Saasqa@123",
    port="5432"
)

@contextmanager
def get_db():
    try:
        yield conn
    finally:
        conn.close()
