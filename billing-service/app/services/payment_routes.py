from fastapi import APIRouter
from typing import Dict, Any
from pydantic import BaseModel
import razorpay
import os


router = APIRouter()

razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

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
