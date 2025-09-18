import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from database.postgres import get_db
from entity.user_entity import PageDefinition
from utils.auth import create_access_token

client = TestClient(app)


# ------------------ Fixtures ------------------ #

@pytest.fixture(scope="module")
def db():
    """Yields a database session."""
    session = next(get_db())
    yield session
    session.close()


@pytest.fixture(autouse=True)
def cleanup_db(db: Session):
    """Rollback after each test to avoid cross-test contamination."""
    yield
    db.rollback()


@pytest.fixture(scope="module")
def auth_headers():
    """Returns valid auth headers with JWT token for documents module."""
    payload = {
        "client_id": "testclient",
        "user_id": "doc_tester",
        "roles": ["admin"],
        "grants": ["document"], 
    }
    token = create_access_token(payload)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def setup_page_definitions(db: Session):
    """Sets up required PageDefinition entry for documents module."""
    db.query(PageDefinition).filter(
        PageDefinition.client_id == "testclient",
        PageDefinition.role == "admin",
        PageDefinition.module == "document",
    ).delete()
    db.commit()

    page_def = PageDefinition(
        client_id="testclient",
        role="admin",
        module="document",
        screen_id="document_screen",
        operations=["ALL"],
        load_type="include",
    )
    db.add(page_def)
    db.commit()
    db.refresh(page_def)
    return True


# ------------------ Document Tests ------------------ #

@pytest.fixture
def uploaded_doc(auth_headers, setup_page_definitions):
    """Uploads a sample document and returns its ID."""
    file_content = io.BytesIO(b"Hello, this is a test document.")
    response = client.post(
        "/saas/testclient/document/upload",
        files={"file": ("test.txt", file_content, "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()["data"]
    return data["id"]


def test_upload_document(auth_headers, setup_page_definitions):
    file_content = io.BytesIO(b"Sample doc upload test.")
    response = client.post(
        "/saas/testclient/document/upload",
        files={"file": ("upload.txt", file_content, "text/plain")},
        headers=auth_headers,
    )
    print("Upload Document Response:", response.json())
    assert response.status_code == 200
    assert "id" in response.json()["data"]


def test_read_documents(auth_headers, setup_page_definitions):
    response = client.get(
        "/saas/testclient/document/read",
        headers=auth_headers,
    )
    print("Read Documents Response:", response.json())
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)


def test_download_document(auth_headers, uploaded_doc):
    response = client.get(
        f"/saas/testclient/document/download?doc_id={uploaded_doc}",
        headers=auth_headers,
    )
    print("Download Document Response Headers:", response.headers)
    assert response.status_code == 200
    assert "content-type" in response.headers


def test_replace_document(auth_headers, uploaded_doc):
    new_file = io.BytesIO(b"Replaced file content.")
    response = client.post(
        f"/saas/testclient/document/replace?doc_id={uploaded_doc}",
        files={"file": ("replace.txt", new_file, "text/plain")},
        headers=auth_headers,
    )
    print("Replace Document Response:", response.json())
    assert response.status_code == 200
    assert response.json()["message"] == "Document replaced successfully"


def test_delete_document(auth_headers, uploaded_doc):
    response = client.delete(
        f"/saas/testclient/document?doc_id={uploaded_doc}",
        headers=auth_headers,
    )
    print("Delete Document Response:", response.json())
    assert response.status_code == 200
