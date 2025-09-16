import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from database.postgres import Base, get_db
from entity.user_entity import PageDefinition

# -------------------------------
# Setup test database
# -------------------------------
TEST_DATABASE_URL = "postgresql://postgres:admin123@localhost:5432/test_db"
TEST_CLIENT_ID = "easyfood"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    return TestClient(app)

# -------------------------------
# Auth fixture: register + login
# -------------------------------
@pytest.fixture(scope="session")
def access_token():
    test_client = TestClient(app)
    # Register a user
    payload = {
        "username": "tabletester",
        "password": "tablepass",
        "roles": ["admin"],
        "grants": ["all"]
    }
    test_client.post(f"/saas/{TEST_CLIENT_ID}/users/register", json=payload)

    # Login to get token
    login_payload = {"username": "tabletester", "password": "tablepass"}
    response = test_client.post(f"/saas/{TEST_CLIENT_ID}/users/login", json=login_payload)
    assert response.status_code == 200
    return response.json()["data"]["access_token"]

@pytest.fixture
def auth_headers(access_token):
    return {"Authorization": f"Bearer {access_token}"}

# -------------------------------
# Table payload fixture
# -------------------------------
@pytest.fixture
def table_payload():
    return {
        "client_id": TEST_CLIENT_ID,
        "name": "Table 1",
        "table_type": "AC",
        "description": "Near window",
        "status": "Vacant",
        "section": "Main Hall",
        "location_zone": "A1",
        "sort_order": 1,
        "is_active": True,
        "created_by": "tester"
    }

# -------------------------------
# Test cases (with auth headers)
# -------------------------------
def test_create_table(client, table_payload, auth_headers):
    response = client.post(f"/saas/{TEST_CLIENT_ID}/tables/create", json=table_payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"]["description"] == table_payload["description"]

def test_read_tables(client, table_payload, auth_headers):
    client.post(f"/saas/{TEST_CLIENT_ID}/tables/create", json=table_payload, headers=auth_headers)
    response = client.get(f"/saas/{TEST_CLIENT_ID}/tables/read?client_id={TEST_CLIENT_ID}", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1

def test_update_table(client, table_payload, auth_headers):
    res = client.post(f"/saas/{TEST_CLIENT_ID}/tables/create", json=table_payload, headers=auth_headers)
    table_id = res.json()["data"]["id"]

    updated_payload = {**table_payload, "id": table_id, "description": "Updated description"}
    response = client.post(f"/saas/{TEST_CLIENT_ID}/tables/update", json=updated_payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"]["description"] == "Updated description"

def test_update_table_missing_id(client, table_payload, auth_headers):
    bad_payload = table_payload.copy()
    bad_payload.pop("id", None)
    response = client.post(f"/saas/{TEST_CLIENT_ID}/tables/update", json=bad_payload, headers=auth_headers)
    assert response.status_code == 400

def test_delete_table(client, table_payload, auth_headers):
    res = client.post(f"/saas/{TEST_CLIENT_ID}/tables/create", json=table_payload, headers=auth_headers)
    table_id = res.json()["data"]["id"]
    delete_payload = {"id": table_id, "name": "Table 1", "table_type": "AC", "location_zone": "A1"}
    response = client.post(f"/saas/{TEST_CLIENT_ID}/tables/delete?client_id={TEST_CLIENT_ID}", json=delete_payload, headers=auth_headers)
    assert response.status_code == 200

def test_delete_nonexistent_table(client, auth_headers):
    payload = {"id": 9999, "name": "table01", "table_type": "AC", "location_zone": "first floor"}
    response = client.post(f"/saas/{TEST_CLIENT_ID}/tables/delete?client_id={TEST_CLIENT_ID}", json=payload, headers=auth_headers)
    assert response.status_code == 404
