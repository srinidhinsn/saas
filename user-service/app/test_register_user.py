# import config.settings
# import sys
# import os
# import logging
# from fastapi.testclient import TestClient
# from app.main import app  # Replace with your actual FastAPI app
# from config.settings import LOGGING_CONFIG

# sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# client = TestClient(app)

# access_token = ""

# def test_login_user():
#     response = client.post(
#         "/saas/easyfood/users/login",
#         json={
#             "username": "testadmin",
#             "password": "testadmin"
#         }
#     )
#     print("response - ", response.json())
#     responseJson = response.json().get("data")
#     access_token = responseJson.get("access_token")
#     assert access_token
#     assert response.status_code == 200



import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from database.postgres import Base, get_db
from entity.user_entity import User

# -------------------------------
# Setup test database
# -------------------------------
TEST_DATABASE_URL = "postgresql://postgres:admin123@localhost:5432/test_db"
TEST_CLIENT_ID = "easyfood"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Drop & recreate tables for testing
@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

# -------------------------------
# Override dependency
# -------------------------------
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# -------------------------------
# Test client fixture
# -------------------------------
@pytest.fixture
def client():
    return TestClient(app)
# -------------------------------
# Test cases
# -------------------------------
def test_register_user(client):
    payload = {
        "username": "testuser",
        "password": "testpass",
        "roles": ["admin"],
        "grants": ["all"]
    }
    response = client.post(f"/saas/{TEST_CLIENT_ID}/users/register", json=payload)
    assert response.status_code == 200
    assert response.json()["message"] == "User registered successfully"

def test_login_user_success(client):
    # First register user
    payload = {
        "username": "loginuser",
        "password": "loginpass",
        "roles": ["admin"],
        "grants": ["all"]
    }
    client.post(f"/saas/{TEST_CLIENT_ID}/users/register", json=payload)

    # Login
    login_payload = {
        "username": "loginuser",
        "password": "loginpass"
    }
    response = client.post(f"/saas/{TEST_CLIENT_ID}/users/login", json=login_payload)
    assert response.status_code == 200
    assert "access_token" in response.json()["data"]
    assert response.json()["data"]["token_type"] == "bearer"


def test_login_user_fail(client): 
    response = client.post("/saas/{TEST_CLIENT_ID}/users/login", json={
        "username": "notregistereduser",
        "password": "anyPassword"
    })
    assert response.status_code == 401
    
