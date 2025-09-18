# import pytest
# from fastapi.testclient import TestClient
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker
# from fastapi import status
# from app.main import app
# from database.postgres import Base, get_db
# from entity.table_entity import DiningTable
# from jose import jwt
# import datetime
# from utils.auth import SECRET_KEY,ALGORITHM

# # -------------------------------
# # Test DB setup
# # -------------------------------
# TEST_DATABASE_URL = "postgresql://postgres:admin123@localhost:5432/test_db"

# engine = create_engine(TEST_DATABASE_URL)
# TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# @pytest.fixture(scope="session", autouse=True)
# def setup_test_db():
#     Base.metadata.drop_all(bind=engine)
#     Base.metadata.create_all(bind=engine)
#     yield
#     Base.metadata.drop_all(bind=engine)

# def override_get_db():
#     db = TestingSessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# app.dependency_overrides[get_db] = override_get_db

# client = TestClient(app)             


# # -----------------------------
# # Helper to generate test tokens
# # -----------------------------
# def generate_test_token(client_id="testclient"):
#     payload = {
#         "client_id": client_id,
#         "screen_id": "home",
#         "roles": ["admin"],
#         "grants": ["all"],
#         "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=30),
#     }
#     return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# @pytest.fixture
# def auth_headers():
#     token = generate_test_token()
#     return {"Authorization": f"Bearer {token}"}









# # -------------------------------
# # Fake JWT Context override
# # -------------------------------
# from models.saas_context import SaasContext

# def fake_verify_token():
#     return SaasContext(screen_id="test_screen", client_id="testclient")

# app.dependency_overrides[f"utils.auth.verify_token"] = fake_verify_token

# # -------------------------------
# # Fixtures
# # -------------------------------
# @pytest.fixture
# def table_payload():
#     return {
#         "client_id": "testclient",
#         "name": "Table 1",
#         "table_type": "AC",
#         "description": "Near window",
#         "status": "Vacant",
#         "section": "Main Hall",
#         "location_zone": "A1",
#         "sort_order": 1,
#         "is_active": True,
#         "created_by": "tester"
#     }

# # -------------------------------
# # Tests
# # -------------------------------

# def test_create_table(table_payload,auth_headers):
#     response = client.post("/saas/testclient/tables/create", json=table_payload, headers=auth_headers)
#     assert response.status_code == status.HTTP_200_OK
#     data = response.json()["data"]
#     assert data["name"] == "Table 1"
#     assert data["status"] == "Vacant"
#     assert data["client_id"] == "testclient"

# def test_read_tables(table_payload,auth_headers):
#     # Ensure at least one table exists
#     client.post("/saas/testclient/tables/create", json=table_payload, headers=auth_headers)

#     response = client.get("/saas/testclient/tables/read?client_id=testclient")
#     assert response.status_code == status.HTTP_200_OK
#     data = response.json()["data"]
#     assert isinstance(data, list)
#     assert any(t["name"] == "Table 1" for t in data)

# def test_update_table(table_payload,auth_headers):
#     # Create first
#     res = client.post("/saas/testclient/tables/create", json=table_payload, headers=auth_headers)
#     table_id = res.json()["data"]["id"]

#     # Update
#     update_payload = {
#         "id": table_id,
#         "client_id": "testclient",
#         "name": "Updated Table",
#         "status": "Occupied"
#     }
#     response = client.post("/saas/testclient/tables/update", json=update_payload, headers=auth_headers)
#     assert response.status_code == status.HTTP_200_OK
#     data = response.json()["data"]
#     assert data["name"] == "Updated Table"
#     assert data["status"] == "Occupied"

# def test_update_table_missing_id(table_payload,auth_headers):
#     bad_payload = {**table_payload}
#     bad_payload.pop("id", None)

#     response = client.post("/saas/testclient/tables/update", json=bad_payload, headers=auth_headers)
#     assert response.status_code == 400
#     assert response.json()["detail"] == "Missing table ID in body"

# def test_delete_table(table_payload,auth_headers):
#     # Create
#     res = client.post("/saas/testclient/tables/create", json=table_payload, headers=auth_headers)
#     table_id = res.json()["data"]["id"]

#     # Delete
#     delete_payload = {"id": table_id, "client_id": "testclient"}
#     response = client.post("/saas/testclient/tables/delete", json=delete_payload,headers=auth_headers)
#     assert response.status_code == status.HTTP_200_OK
#     assert response.json()["message"] == "Table deleted successfully"

# def test_delete_nonexistent_table(auth_headers):
#     payload = {"id": 9999, "client_id": "testclient"}
#     response = client.post("/saas/testclient/tables/delete", json=payload,headers=auth_headers)
#     assert response.status_code == 404
#     assert response.json()["detail"] == "Table not found"




import pytest
from fastapi.testclient import TestClient
from app.main import app
from database.postgres import get_db
from entity.user_entity import PageDefinition
from sqlalchemy.orm import Session
from utils.auth import create_access_token

client = TestClient(app)

# --- Fixtures ---

@pytest.fixture(scope="module")
def db():
    """Yields a database session."""
    session = next(get_db())
    yield session
    session.close()

@pytest.fixture(scope="module")
def auth_headers():
    """Returns valid auth headers with JWT token."""
    payload = {
        "client_id": "testclient",
        "user_id": "tester",
        "roles": ["admin"],
        "grants": ["tables"],  
    }
    token = create_access_token(payload)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def setup_page_definitions(db: Session):
    """Ensure PageDefinition exists for tables module."""
    # Delete if already exists
    db.query(PageDefinition).filter(
        PageDefinition.client_id == "testclient",
        PageDefinition.role == "admin",
        PageDefinition.module == "tables"
    ).delete()
    db.commit()

    page_def = PageDefinition(
        client_id="testclient",
        role="admin",
        module="tables",
        screen_id="tables_screen",
        operations=["ALL"],
        load_type="include"
    )
    db.add(page_def)
    db.commit()
    db.refresh(page_def)
    return page_def

@pytest.fixture
def table_payload():
    return {
        "client_id": "testclient",
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

# --- Tests ---

def test_create_table(table_payload, auth_headers, setup_page_definitions):
    response = client.post("/saas/testclient/tables/create", json=table_payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["description"] == table_payload["description"]

def test_read_tables(table_payload, auth_headers, setup_page_definitions):
    client.post("/saas/testclient/tables/create", json=table_payload, headers=auth_headers)
    response = client.get("/saas/testclient/tables/read?client_id=testclient", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1

def test_update_table(table_payload, auth_headers, setup_page_definitions):
    res = client.post("/saas/testclient/tables/create", json=table_payload, headers=auth_headers)
    table_id = res.json()["data"]["id"]
    updated_payload = {**table_payload, "id": table_id, "description": "Updated description"}
    response = client.post("/saas/testclient/tables/update", json=updated_payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"]["description"] == "Updated description"

def test_update_table_missing_id(table_payload, auth_headers, setup_page_definitions):
    bad_payload = table_payload.copy()
    bad_payload.pop("id", None)
    response = client.post("/saas/testclient/tables/update", json=bad_payload, headers=auth_headers)
    assert response.status_code == 400

def test_delete_table(table_payload, auth_headers, setup_page_definitions):
    res = client.post("/saas/testclient/tables/create", json=table_payload, headers=auth_headers)
    table_id = res.json()["data"]["id"]
    table_name=res.json()["data"]["name"]
    table_type=res.json()["data"]["table_type"]
    table_location=res.json()["data"]["location_zone"]
    table_payload = {"id": table_id, "name": table_name, "table_type": table_type, "location_zone": table_location}  
    response = client.post(f"/saas/testclient/tables/delete?client_id=testclient",json=table_payload,headers=auth_headers)
    assert response.status_code == 200

def test_delete_nonexistent_table(auth_headers, setup_page_definitions):
    payload = {"id": 9999,"name": "table01", "table_type":"AC", "location_zone":"first floor"}
    response = client.post(f"/saas/testclient/tables/delete?client_id=testclient", json=payload, headers=auth_headers)
    assert response.status_code == 404

