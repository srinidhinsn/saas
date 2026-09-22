from dotenv import load_dotenv
load_dotenv()
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import razorpay
import os
from phonepe.sdk.pg.payments.v2.standard_checkout_client import StandardCheckoutClient
from phonepe.sdk.pg.env import Env

router = APIRouter()


class RazorpayVerifyRequest(BaseModel):
    document_id: int
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
class RazorpayOrderRequest(BaseModel):
    amount: int  # in paise
    currency: str = "INR"
    receipt: str
    notes: Dict[str, Any] = {}

class PhonePeOrderRequest(BaseModel):
    amount: int          
    document_id: int
    redirect_url: Optional[str] = None

class PhonePeVerifyRequest(BaseModel):
    document_id: int
    merchant_order_id: str

def _env_key(client_id: str) -> str:
    """'easyfood' -> 'EASYFOOD', 'foodys-cafe' -> 'FOODYS_CAFE'"""
    return "".join(c if c.isalnum() else "_" for c in client_id).upper()


_razorpay_clients: Dict[str, razorpay.Client] = {}
_phonepe_clients: Dict[str, StandardCheckoutClient] = {}


def get_razorpay_client(client_id: str) -> razorpay.Client:
    if client_id in _razorpay_clients:
        return _razorpay_clients[client_id]

    key = _env_key(client_id)
    key_id = os.getenv(f"RAZORPAY_KEY_ID_{key}")
    key_secret = os.getenv(f"RAZORPAY_KEY_SECRET_{key}")

    if not key_id or not key_secret:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Razorpay credentials not configured for client '{client_id}' "
                f"(expected RAZORPAY_KEY_ID_{key} / RAZORPAY_KEY_SECRET_{key} in .env)"
            ),
        )

    client = razorpay.Client(auth=(key_id, key_secret))
    _razorpay_clients[client_id] = client
    return client


def get_phonepe_client(client_id: str) -> StandardCheckoutClient:
    if client_id in _phonepe_clients:
        return _phonepe_clients[client_id]

    key = _env_key(client_id)
    pp_client_id = os.getenv(f"PHONEPE_{key}")
    pp_client_secret = os.getenv(f"PHONEPE_{key}_SECRET")
    pp_client_version = int(os.getenv(f"PHONEPE_{key}_VERSION", "1"))
    pp_env = Env.PRODUCTION if os.getenv("PHONEPE_ENV") == "PRODUCTION" else Env.SANDBOX

    if not pp_client_id or not pp_client_secret:
        raise HTTPException(
            status_code=500,
            detail=(
                f"PhonePe credentials not configured for client '{client_id}' "
                f"(expected PHONEPE_{key} / PHONEPE_{key}_SECRET in .env)"
            ),
        )

    client = StandardCheckoutClient.get_instance(
        client_id=pp_client_id,
        client_secret=pp_client_secret,
        client_version=pp_client_version,
        env=pp_env,
        should_publish_events=False,
    )
    _phonepe_clients[client_id] = client
    return client