import os

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
USER_FILE = os.getenv("EXCEL_PATH", "users.xlsx")  # fallback
