import os
import httpx

# BILLING_BASE_URL  = os.getenv("BILLING_BASE_URL", "http://localhost:9002")
# BILLING_INT_TOKEN = os.getenv("BILLING_INT_TOKEN", "change-me")

# def push_order_to_billing(payload: dict) -> dict:
#     """
#     Calls billing-service internal intake endpoint.
#     """
#     url = f"{BILLING_BASE_URL}/internal/intake/from-order-service"
#     headers = {"Authorization": f"Bearer {BILLING_INT_TOKEN}"}
#     with httpx.Client(timeout=15.0) as client:
#         r = client.post(url, json=payload, headers=headers)
#         r.raise_for_status()
#         return r.json()
    
BILLING_BASE_URL = os.getenv("BILLING_BASE_URL", "http://localhost:8002")

def push_order_to_billing_public(client_id: str, user_jwt: str, payload: dict) -> dict:
    """
    Calls billing-service public intake endpoint using the user's JWT.
    """
    url = f"{BILLING_BASE_URL}/saas/{client_id}/invoice/from-order-service"
    headers = {
        "Authorization": f"Bearer {user_jwt}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=15.0) as client:
        r = client.post(url, json=payload, headers=headers)
        r.raise_for_status()
        return r.json()

