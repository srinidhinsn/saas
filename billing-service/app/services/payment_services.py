from dotenv import load_dotenv
load_dotenv()
from fastapi import  HTTPException
import os
from sqlalchemy.orm import Session
from entity.billing_entity import BillingDocumentEntity
from datetime import datetime
import hmac, hashlib
import uuid
from models.billing_model import get_phonepe_client, get_razorpay_client
from zoneinfo import ZoneInfo
from sqlalchemy.orm.attributes import flag_modified
from phonepe.sdk.pg.payments.v2.models.request.standard_checkout_pay_request import (StandardCheckoutPayRequest,)
from phonepe.sdk.pg.common.exceptions import PhonePeException
TIMEZONE = os.getenv("TIMEZONE", "UTC")

def create_razorpay_order_service(client_id: str,amount: int,currency: str,receipt: str,notes: dict,) -> dict:
    razorpay_client = get_razorpay_client(client_id)
    try:
        order_data = {"amount": amount, "currency": currency, "receipt": receipt, "notes": notes}
        return razorpay_client.order.create(data=order_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create Razorpay order: {str(e)}")


def verify_razorpay_payment_service(db: Session,client_id: str,document_id: int,razorpay_payment_id: str,razorpay_order_id: str,razorpay_signature: str,) -> dict:
    razorpay_client = get_razorpay_client(client_id)

    body_str = f"{razorpay_order_id}|{razorpay_payment_id}"
    env_key = "".join(c if c.isalnum() else "_" for c in client_id).upper()
    key = os.getenv(f"RAZORPAY_KEY_SECRET_{env_key}", "")
    if not key:
        raise HTTPException(status_code=500, detail=f"RAZORPAY_KEY_SECRET_{env_key} not configured")

    generated_signature = hmac.new(
        key.encode("utf-8"), body_str.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    if generated_signature != razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    try:
        payment = razorpay_client.payment.fetch(razorpay_payment_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch payment: {str(e)}")

    if payment["status"] not in ["captured", "authorized"]:
        raise HTTPException(status_code=400, detail=f"Payment not captured: {payment['status']}")

    invoice = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == document_id,
        BillingDocumentEntity.client_id == client_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice not found: id={document_id}")

    existing_methods = list(invoice.payment_method or [])
    updated_methods = []
    matched = False

    for pm in existing_methods:
        if not isinstance(pm, dict):
            updated_methods.append(pm)
            continue

        is_exact_match = pm.get("razorpay_order_id") == razorpay_order_id
        is_unverified_slot = (
            pm.get("method", "").startswith("razorpay")
            and not pm.get("razorpay_order_id")
            and not matched
        )

        if is_exact_match or is_unverified_slot:
            pm = {
                **pm,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_order_id": razorpay_order_id,
                "razorpay_signature": razorpay_signature,
                "razorpay_status": payment["status"],
                "verified_at": datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
            }
            matched = True

        updated_methods.append(pm)

    if not matched:
        updated_methods.append({
            "method": "razorpay",
            "amount": payment.get("amount", 0) / 100,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_order_id": razorpay_order_id,
            "razorpay_signature": razorpay_signature,
            "razorpay_status": payment["status"],
            "verified_at": datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
        })

    invoice.payment_method = updated_methods
    flag_modified(invoice, "payment_method")
    invoice.payment_status = "Paid"
    invoice.approval_status = "Approved"
    invoice.status = "Issued"
    invoice.updated_at = datetime.now(ZoneInfo(TIMEZONE))

    if not invoice.customer_id:
        invoice.customer_id = payment.get("contact", "")
    if not invoice.contact_phone:
        invoice.contact_phone = payment.get("contact", "")
    if not invoice.contact_email:
        invoice.contact_email = payment.get("email", "")

    db.commit()
    db.refresh(invoice)

    return {"invoice_id": invoice.id,"payment_method": updated_methods,"payment_status": invoice.payment_status,}

def create_phonepe_order_service(db: Session,client_id: str,document_id: int,amount: int,redirect_url: str | None,) -> dict:
    phonepe_client = get_phonepe_client(client_id)

    invoice = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == document_id,
        BillingDocumentEntity.client_id == client_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice not found: id={document_id}")

    merchant_order_id = f"{client_id}-{document_id}-{uuid.uuid4().hex[:8]}"
    pay_request = StandardCheckoutPayRequest.build_request(merchant_order_id=merchant_order_id,amount=amount,redirect_url=redirect_url)

    try:
        pay_response = phonepe_client.pay(pay_request)
    except PhonePeException as e:
        raise HTTPException(status_code=400, detail=f"Failed to create PhonePe order: {str(e)}")

    existing_methods = list(invoice.payment_method or [])
    existing_methods = [
        pm for pm in existing_methods
        if not (isinstance(pm, dict) and pm.get("method") == "phonepe" and pm.get("phonepe_status") != "COMPLETED")
    ]
    existing_methods.append({
        "method": "phonepe",
        "amount": amount / 100,
        "merchant_order_id": merchant_order_id,
        "phonepe_status": "PENDING",
    })
    invoice.payment_method = existing_methods
    flag_modified(invoice, "payment_method")
    db.commit()

    return {"merchant_order_id": merchant_order_id, "token_url": pay_response.redirect_url}

def verify_phonepe_payment_service(db: Session,client_id: str,document_id: int,merchant_order_id: str,) -> dict:
    phonepe_client = get_phonepe_client(client_id)

    try:
        status_response = phonepe_client.get_order_status(merchant_order_id=merchant_order_id)
    except PhonePeException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch PhonePe status: {str(e)}")

    if status_response.state != "COMPLETED":
        raise HTTPException(status_code=400, detail=f"Payment not completed: {status_response.state}")

    invoice = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == document_id,
        BillingDocumentEntity.client_id == client_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice not found: id={document_id}")

    existing_methods = list(invoice.payment_method or [])
    updated_methods = []
    matched = False

    for pm in existing_methods:
        if not isinstance(pm, dict):
            updated_methods.append(pm)
            continue

        is_exact_match = pm.get("method") == "phonepe" and pm.get("merchant_order_id") == merchant_order_id

        if is_exact_match:
            pm = {
                **pm,
                "phonepe_order_id": getattr(status_response, "order_id", None),
                "phonepe_status": status_response.state,
                "verified_at": datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
            }
            matched = True

        updated_methods.append(pm)

    if not matched:
        updated_methods.append({
            "method": "phonepe",
            "merchant_order_id": merchant_order_id,
            "phonepe_status": status_response.state,
            "verified_at": datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
        })

    invoice.payment_method = updated_methods
    flag_modified(invoice, "payment_method")
    invoice.payment_status = "Paid"
    invoice.approval_status = "Approved"
    invoice.status = "Issued"
    invoice.updated_at = datetime.now(ZoneInfo(TIMEZONE))

    db.commit()
    db.refresh(invoice)

    return {"invoice_id": invoice.id,"payment_method": updated_methods,"payment_status": invoice.payment_status,}