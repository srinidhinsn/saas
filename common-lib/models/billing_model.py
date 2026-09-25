from typing import Optional,List,Dict,Any
from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from dotenv import load_dotenv
load_dotenv()
from fastapi import  HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import razorpay
import os
from phonepe.sdk.pg.payments.v2.standard_checkout_client import StandardCheckoutClient
from phonepe.sdk.pg.env import Env

TIMEZONE = os.getenv("TIMEZONE", "UTC")
class PaymentStatusEnum(str, Enum):
    pending  = "Pending"
    paid     = "Paid"
    partial  = "Partial"
    overdue  = "Overdue"

class ApprovalStatusEnum(str, Enum):
    pending  = "Pending"
    approved = "Approved"
    rejected = "Rejected"

class BillingDocument(BaseModel):
    id:                       Optional[int]      = None
    client_id:                Optional[str]      = None
    document_type:            Optional[str]      = None
    document_number:          Optional[str]      = None
    document_date:            Optional[datetime] = None
    due_date:                 Optional[datetime] = None
    reference_number:         Optional[str]      = None
    order_id:                 Optional[str]      = None
    customer_id:              Optional[str]      = None
    vendor_id:                Optional[str]      = None
    currency:                 Optional[str]      = "INR"
    status:                   Optional[str]      = "Draft"
    contact_email:            Optional[str]      = None
    contact_phone:            Optional[str]      = None
    terms:                    Optional[str]      = None
    notes:                    Optional[str]      = None
    subtotal:                 Optional[float]    = 0.0
    tax_amount:               Optional[float]    = 0.0
    discount_amount:          Optional[float]    = 0.0
    total_amount:             Optional[float]    = 0.0
    linked_document_ids:      Optional[str]      = None
    is_active:                Optional[bool]     = True
    created_by:               Optional[str]      = None
    updated_by:               Optional[str]      = None
    created_at:               Optional[datetime] = None
    updated_at:               Optional[datetime] = None
    payment_status:           Optional[PaymentStatusEnum] = PaymentStatusEnum.pending
    payment_due_date:         Optional[datetime] = None
    payment_method:           Optional[List[Dict[str, Any]]] = None
    payment_reference:        Optional[str]      = None
    approval_status:          Optional[ApprovalStatusEnum] = ApprovalStatusEnum.pending
    approved_by:              Optional[str]      = None
    approval_date:            Optional[datetime] = None
    gl_account_code:          Optional[str]      = None
    tax_code:                 Optional[str]      = None
    gst_number:               Optional[str]      = None
    accounting_period:        Optional[str]      = None
    currency_conversion_rate: Optional[float]    = None
    shipping_address:         Optional[str]      = None
    shipping_method:          Optional[str]      = None
    delivery_date:            Optional[datetime] = None
    tracking_number:          Optional[str]      = None
    document_version:         Optional[int]      = 1
    invoice_date:             Optional[datetime] = None
    note:                     Optional[str]      = None
    customer_terms:           Optional[str]      = None

    class Config:
        orm_mode = True

class BillingDocumentItem(BaseModel):
    id:              Optional[int]       = None
    document_id:     Optional[int]       = None
    item_ref_id:     Optional[str]       = None
    description:     Optional[str]       = None
    quantity:        Optional[float]     = 0.0
    unit_price:      Optional[float]     = 0.0
    discount:        Optional[float]     = 0.0
    tax_rate:        Optional[float]     = 0.0
    total:           Optional[float]     = 0.0
    is_active:       Optional[bool]      = True
    created_at:      Optional[datetime]  = None
    updated_at:      Optional[datetime]  = None
    unit_of_measure: Optional[str]       = "Unit"
    item_category:   Optional[str]       = None
    item_discount:   Optional[float]     = 0.0
    item_tax_code:   Optional[str]       = "Standard"

    class Config:
        orm_mode = True

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