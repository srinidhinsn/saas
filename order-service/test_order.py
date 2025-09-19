


# def test_update_single_order_item(auth_headers):
#     global order_id

#     # 1️⃣ Create an order with at least one item if not already created
#     order_payload = {
#         "table_id": 1,
#         "price": 100,
#         "gst": 5,
#         "cst": 0,
#         "discount": 0,
#         "total_price": 105,
#         "status": "new",
#         "items": [
#             {"item_id": 101, "quantity": 2, "status": "new"}
#         ]
#     }

#     # Create order
#     create_response = client.post(
#         f"/saas/testclient/dinein/create?client_id=testclient",
#         json=order_payload,
#         headers=auth_headers
#     ).json()
#     order_id = create_response["data"]["id"]

#     # 2️⃣ Fetch order from DB to get actual DBOrderItem IDs
#     order_response = client.get(
#         f"/saas/testclient/dinein/order?client_id=testclient&order_id={order_id}",
#         headers=auth_headers
#     ).json()
#     order_data = order_response["data"]

#     # 3️⃣ Make sure there is at least one item
#     assert len(order_data["items"]) > 0, "Order has no items"

#     # 4️⃣ Use the actual DBOrderItem ID for update
#     item_id = order_data["items"][0]["id"]

#     item_update_payload = {
#         "id": item_id,
#         "item_id": 101,
#         "quantity": 4,
#         "status": "served"
#     }

#     update_response = client.post(
#         f"/saas/testclient/order_item/update?client_id=testclient&order_id={order_id}",
#         json=item_update_payload,
#         headers=auth_headers
#     )

#     print("Update Single Order Item Response:", update_response.json())
#     assert update_response.status_code == 200
#     assert update_response.json()["data"]["message"] == "Order items updated successfully"



# def test_delete_order_item(auth_headers):
#     global order_id
#     # Get order again to fetch latest item_id
#     order = client.get(
#         f"/saas/testclient/dinein/order?client_id=testclient&order_id={order_id}",
#         headers=auth_headers,
#     ).json()["data"]
#     item_id = order["items"][0]["id"]

#     response = client.delete(
#         f"/saas/testclient/order_item/delete?client_id=testclient&order_item_id={item_id}",
#         headers=auth_headers,
#     )
#     print("Delete Order Item Response:", response.json())
#     assert response.status_code == 200


# def test_get_kds_orders(auth_headers):
#     response = client.get(
#         "/saas/testclient/kds/orders?client_id=testclient",
#         headers=auth_headers,
#     )
#     print("Get KDS Orders Response:", response.json())
#     assert response.status_code == 200

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
    """Returns valid auth headers with JWT token for dinein module."""
    payload = {
        "client_id": "testclient",
        "user_id": "tester",
        "roles": ["admin"],
        "grants": ["dinein", "kds", "order_items", "order_item"], 
    }
    token = create_access_token(payload)
    return {"Authorization": f"Bearer {token}"}
    
@pytest.fixture(scope="module")
def setup_page_definitions(db: Session):
    """Sets up required PageDefinition entries."""
    for module in ["dinein", "kds"]:
        db.query(PageDefinition).filter(
            PageDefinition.client_id == "testclient",
            PageDefinition.role == "admin",
            PageDefinition.module == module,
        ).delete()
        db.commit()

        page_def = PageDefinition(
            client_id="testclient",
            role="admin",
            module=module,
            screen_id=f"{module}_screen",
            operations=["ALL"],
            load_type="include",
        )
        db.add(page_def)
        db.commit()
        db.refresh(page_def)
    return True

# ------------------ Sample Order ------------------ #

sample_order = {
    "table_id": 42,
    "invoice_id": "100",
    "handler_id": "1", 
    "invoice_status": "unpaid",
    "price": 100.0,
    "cst": 5.0,
    "gst": 2.5,
    "discount": 0.0,
    "total_price": 107.5,
    "status": "new",
    "items": [
        {
            "item_id": 101,
            "quantity": 2,
            "status": "new",
            "item_name": "Test Item",
            "slug": "test-item"
        }
    ]
}

@pytest.fixture
def created_order(auth_headers):
    """Creates a fresh order for each test needing it."""
    response = client.post(
        "/saas/testclient/dinein/create",
        json=sample_order,
        headers=auth_headers,
    )
    assert response.status_code == 200
    order_id = response.json()["data"]["id"]
    return order_id

# ------------------ Orders Tests ------------------ #

def test_create_dinein_order(auth_headers):
    response = client.post(
        "/saas/testclient/dinein/create",
        json=sample_order,
        headers=auth_headers,
    )
    print("Create Order Response:", response.json())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["table_id"] == sample_order["table_id"]
    assert len(data["items"]) == len(sample_order["items"])

def test_get_order_by_id(auth_headers, created_order):
    response = client.get(
        f"/saas/testclient/dinein/order?client_id=testclient&order_id={created_order}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == created_order
    assert len(data["items"]) == len(sample_order["items"])

def test_get_orders_for_table(auth_headers):
    # Create a fresh order for table 42
    response_create = client.post(
        "/saas/testclient/dinein/create",
        json=sample_order,
        headers=auth_headers,
    )
    assert response_create.status_code == 200

    response = client.get(
        "/saas/testclient/dinein/table?client_id=testclient&table_id=42",
        headers=auth_headers,
    )
    print("Get Orders For Table Response:", response.json())
    assert response.status_code == 200
    data = response.json()["data"]
    assert any(o["table_id"] == 42 for o in data)

def test_update_order_status(auth_headers, created_order):
    updates = {"id": created_order, "status": "preparing"}
    response = client.post(
        "/saas/testclient/dinein/update?client_id=testclient",
        json=updates,
        headers=auth_headers,
    )
    print("Update Order Status Response:", response.json())
    assert response.status_code == 200
    assert response.json()["data"]["new_status"] == "preparing"

def test_update_order_items(auth_headers, created_order):
    items_update = [
        {"item_id": 101, "quantity": 3, "status": "preparing"}
    ]
    response = client.post(
        f"/saas/testclient/order_items/update?client_id=testclient&order_id={created_order}",
        json=items_update,
        headers=auth_headers,
    )
    print("Update Order Items Response:", response.json())
    assert response.status_code == 200

def test_update_single_order_item(auth_headers, created_order):
    # Fetch the order to get DBOrderItem IDs
    order_resp = client.get(
        f"/saas/testclient/dinein/order?client_id=testclient&order_id={created_order}",
        headers=auth_headers,
    )
    order_data = order_resp.json()["data"]
    assert len(order_data["items"]) > 0
    item_id = order_data["items"][0]["id"]

    item_update = {"id": item_id, "item_id": 101, "quantity": 4, "status": "served"}
    response = client.post(
        f"/saas/testclient/order_item/update?client_id=testclient&order_id={created_order}",
        json=item_update,
        headers=auth_headers,
    )
    print("Update Single Order Item Response:", response.json())
    assert response.status_code == 200

def test_delete_order(auth_headers, created_order):
    response = client.delete(
        f"/saas/testclient/dinein/delete?client_id=testclient&dinein_order_id={created_order}",
        headers=auth_headers,
    )
    print("Delete Order Response:", response.json())
    assert response.status_code == 200

def test_delete_nonexistent_order(auth_headers):
    response = client.delete(
        "/saas/testclient/dinein/delete?client_id=testclient&dinein_order_id=999999",
        headers=auth_headers,
    )
    print("Delete Nonexistent Order Response:", response.json())
    assert response.status_code == 404
