import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from database.postgres import Base, get_db

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
    # Register a test user
    payload = {
        "username": "inventorytester",
        "password": "invpass",
        "roles": ["admin"],
        "grants": ["inventory"],
    }
    test_client.post(f"/saas/{TEST_CLIENT_ID}/users/register", json=payload)

    # Login to get token
    login_payload = {"username": "inventorytester", "password": "invpass"}
    response = test_client.post(f"/saas/{TEST_CLIENT_ID}/users/login", json=login_payload)
    assert response.status_code == 200
    return response.json()["data"]["access_token"]

@pytest.fixture
def auth_headers(access_token):
    return {"Authorization": f"Bearer {access_token}"}

# ------------------ Sample payloads ------------------ #
sample_inventory = {
    "client_id": TEST_CLIENT_ID,
    "inventory_id": 1,
    "line_item_id": [101, 102],
    "name": "Test Item",
    "description": "Test Description",
    "category_id": "cat1",
    "realm": "default",
    "availability": 10,
    "unit": "kg",
    "unit_price": 50.0,
    "unit_cst": 5.0,
    "unit_gst": 2.5,
    "unit_total_price": 57.5,
    "price": 50.0,
    "cst": 5.0,
    "gst": 2.5,
    "discount": 0.0,
    "total_price": 57.5,
    "slug": "test-item",
    "created_by": "tester",
    "updated_by": "tester"
}

sample_category = {
    "id": "cat1",
    "client_id": TEST_CLIENT_ID,
    "name": "Test Category",
    "description": "Category description",
    "sub_categories": ["sub1", "sub2"],
    "slug": "test-category",
    "created_by": "tester",
    "updated_by": "tester"
}

# ------------------ Inventory Tests ------------------ #
def test_create_inventory(client, auth_headers):
    global inventory_id
    response = client.post(
        f"/saas/{TEST_CLIENT_ID}/inventory/create", json=sample_inventory, headers=auth_headers
    )
    assert response.status_code == 200
    inventory_id = response.json()["data"]["id"]

def test_read_inventory(client, auth_headers):
    response = client.get(
        f"/saas/{TEST_CLIENT_ID}/inventory/read?client_id={TEST_CLIENT_ID}", headers=auth_headers
    )
    assert response.status_code == 200

def test_update_inventory(client, auth_headers):
    global inventory_id
    updates = {"id": inventory_id, "name": "Updated Test Item", "availability": 20}
    response = client.post(
        f"/saas/{TEST_CLIENT_ID}/inventory/update", json=updates, headers=auth_headers
    )
    assert response.status_code == 200

def test_delete_inventory(client, auth_headers):
    global inventory_id
    payload = {"id": inventory_id}
    response = client.post(
        f"/saas/{TEST_CLIENT_ID}/inventory/delete?client_id={TEST_CLIENT_ID}",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200

def test_delete_nonexistent_inventory(client, auth_headers):
    payload = {"id": 999999}
    response = client.post(
        f"/saas/{TEST_CLIENT_ID}/inventory/delete?client_id={TEST_CLIENT_ID}",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 404

# ------------------ Category Tests ------------------ #
def test_create_category(client, auth_headers):
    global category_id
    response = client.post(
        f"/saas/{TEST_CLIENT_ID}/inventory/create_category",
        json=sample_category,
        headers=auth_headers,
    )
    assert response.status_code == 200
    category_id = response.json()["data"]["id"]

def test_read_category(client, auth_headers):
    response = client.get(
        f"/saas/{TEST_CLIENT_ID}/inventory/read_category?client_id={TEST_CLIENT_ID}",
        headers=auth_headers,
    )
    assert response.status_code == 200

def test_update_category(client, auth_headers):
    global category_id
    updates = {"id": category_id, "name": "Updated Category"}
    response = client.post(
        f"/saas/{TEST_CLIENT_ID}/inventory/update_category",
        json=updates,
        headers=auth_headers,
    )
    assert response.status_code == 200

def test_delete_category(client, auth_headers):
    global category_id
    payload = {"id": category_id}
    response = client.post(
        f"/saas/{TEST_CLIENT_ID}/inventory/delete_category?client_id={TEST_CLIENT_ID}",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200

def test_delete_nonexistent_category(client, auth_headers):
    payload = {"id": "nonexistent"}
    response = client.post(
        f"/saas/{TEST_CLIENT_ID}/inventory/delete_category?client_id={TEST_CLIENT_ID}",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 404
