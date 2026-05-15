from fastapi import APIRouter, Depends, HTTPException,Header
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from entity.billing_entity import BillingDocumentEntity
from models.billing_model import BillingDocument, BillingDocumentItem
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token
from database.postgres import get_db
from ..services.billing_service import (
    create_document_service, read_documents_service, update_document_service, delete_document_service,
    create_items_service, read_items_service, update_items_service, delete_items_service, upsert_from_order_payload,
    generate_invoice, issue_invoice
)
from ..services.payment_routes import razorpay_client, RazorpayOrderRequest,RazorpayVerifyRequest
import os
from zoneinfo import ZoneInfo
import hmac
import hashlib
from datetime import datetime
from sqlalchemy.orm.attributes import flag_modified
router = APIRouter()
from dotenv import load_dotenv
load_dotenv()
TIMEZONE = os.getenv("TIMEZONE", "UTC")
router = APIRouter()
# ------------------------------ billing documents ------------------------------


@router.get("/read_document", response_model=ResponseModel[List[BillingDocument]])
def read_billing_documents(
    client_id: str,
    document_type: str = None,
    status: str = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    documents = read_documents_service(client_id, document_type, status, db)
    return ResponseModel[List[BillingDocument]](
        screen_id=context.screen_id,
        data=documents
    )


@router.post("/create_document", response_model=ResponseModel[BillingDocument])
def create_billing_document_route(
    billing: BillingDocument,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # Set default fields that might not be provided by the client (like payment_status)
    if not billing.payment_status:
        billing.payment_status = "Pending"
    if not billing.approval_status:
        billing.approval_status = "Pending"
    if not billing.document_version:
        billing.document_version = 1

    # Create the billing document
    result = create_document_service(billing, db)
    return ResponseModel[BillingDocument](
        screen_id=context.screen_id,
        status="success",
        message="Billing document created successfully",
        data=result
    )


@router.post("/update_document", response_model=ResponseModel[BillingDocument])
def update_billing_document_route(
    client_id: str,
    updates: BillingDocument,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing billing document ID")
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    # Ensure that the new columns are properly updated
    if updates.payment_status:
        updates.payment_status = updates.payment_status
    if updates.payment_due_date:
        updates.payment_due_date = updates.payment_due_date
    if updates.payment_method:
        updates.payment_method = updates.payment_method
    if updates.payment_reference:
        updates.payment_reference = updates.payment_reference
    if updates.approval_status:
        updates.approval_status = updates.approval_status
    if updates.gl_account_code:
        updates.gl_account_code = updates.gl_account_code
    if updates.tax_code:
        updates.tax_code = updates.tax_code

    # Call service to update document
    updated_doc = update_document_service(updates, client_id, db)
    return ResponseModel[BillingDocument](
        screen_id=context.screen_id,
        status="success",
        message="Billing document updated successfully",
        data=updated_doc
    )


@router.post("/delete_document", response_model=ResponseModel[BillingDocument])
def delete_billing_document_route(
    client_id: str,
    billing: BillingDocument,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if not billing.id:
        raise HTTPException(status_code=400, detail="Missing document ID")
    deleted_doc = delete_document_service(billing.id, client_id, db)
    return ResponseModel[BillingDocument](
        screen_id=context.screen_id,
        status="success",
        message="Billing document deleted successfully",
        data=deleted_doc
    )

# ------------------------------ billing document Items ------------------------------


@router.get("/read", response_model=ResponseModel[List[BillingDocumentItem]])
def read_billing_document_items(
    client_id: str,
    document_id: Optional[int] = None, 
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    items = read_items_service(document_id, client_id, db)
    return ResponseModel[List[BillingDocumentItem]](
        screen_id=context.screen_id,
        status="success",
        message="Billing items fetched successfully",
        data=items
    )


@router.post("/create", response_model=ResponseModel[List[BillingDocumentItem]])
def create_billing_items(
    document_id: int,
    items: List[BillingDocumentItem],
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    created_items = create_items_service(document_id, items, client_id, db)
    return ResponseModel[List[BillingDocumentItem]](
        screen_id=context.screen_id,
        status="success",
        message="Billing items created successfully",
        data=created_items
    )


@router.post("/update", response_model=ResponseModel[List[BillingDocumentItem]])
def update_billing_items(
    items: List[BillingDocumentItem],
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    updated_items = update_items_service(items, client_id, db)
    return ResponseModel[List[BillingDocumentItem]](
        screen_id=context.screen_id,
        status="success",
        message="Billing items updated successfully",
        data=updated_items
    )

@router.post("/delete", response_model=ResponseModel[List[BillingDocumentItem]])
def delete_billing_items(
    items: List[BillingDocumentItem],  # Now accepting full objects
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    item_ids = [item.id for item in items if item.id]
    deleted_items = delete_items_service(item_ids, client_id, db)
    return ResponseModel[List[BillingDocumentItem]](
        screen_id=context.screen_id,
        status="success",
        message="Billing items deleted successfully",
        data=deleted_items
    )

# --------------------------------------- invoice generation -------------------------------------------

# ------------------------------ internal intake (order-service -> billing-service) ------------------------------


def _verify_internal_service(authorization: Optional[str] = Header(None)):
    """
    Simple internal bearer auth for service-to-service calls.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing/invalid Authorization")
    token = authorization.split(" ", 1)[1]
    if token != os.getenv("BILLING_INT_TOKEN", "change-me"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return True

# @router.post("/from-order-service")
# def intake_from_order_service(
#     payload: Dict[str, Any],
#     _ok = Depends(_verify_internal_service),
#     db: Session = Depends(get_db),
# ):
#     try:
#         result = upsert_from_order_payload(db, payload)
#         return {"status": "ok", **result}
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))
# ...

@router.post("/from-order-service", response_model=ResponseModel[dict])
def intake_from_order_service_public(
    client_id: str,
    payload: Dict[str, Any],
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # AuthZ: client in JWT must match URL tenant
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Enforce the payload also targets the same tenant
    if payload.get("client_id") != client_id:
        raise HTTPException(status_code=400, detail="payload.client_id must match path client_id")

    result = upsert_from_order_payload(db, payload)
    return ResponseModel(
        screen_id=context.screen_id,
        status="success",
        message="Order summary ingested",
        data=result
    )


@router.post("/generate", response_model=ResponseModel[dict])
def generate_invoice_route(
    client_id: str,
    invoice_id: int,
    document_date: Optional[str] = None,   # ISO string, optional
    due_in_days: int = 0,                  # e.g., 0 for POS, 7/15 for credit terms
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        dt = datetime.fromisoformat(document_date) if document_date else None
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document_date; use ISO format (YYYY-MM-DD or full ISO)")

    try:
        result = generate_invoice(db, client_id, invoice_id, dt, due_in_days)
        return ResponseModel(screen_id=context.screen_id, status="success", message="Invoice generated", data=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/issue", response_model=ResponseModel[dict])
def issue_invoice_route(
    client_id: str,
    invoice_id: int,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    try:
        result = issue_invoice(db, client_id, invoice_id)
        return ResponseModel(screen_id=context.screen_id, status="success",
                             message="Invoice issued", data=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/razorpay")
def create_order(client_id: str, request_data: RazorpayOrderRequest, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        order_data = {"amount": request_data.amount, "currency": request_data.currency,
                      "receipt": request_data.receipt, "notes": request_data.notes}

        razorpay_order = razorpay_client.order.create(data=order_data)

        return ResponseModel(screen_id=context.screen_id, status="success", message="Razorpay order created", data=razorpay_order)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to create Razorpay order: {str(e)}")

@router.post("/verify")
async def verify_payment(client_id: str,body: RazorpayVerifyRequest,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    # Signature verification here
    body_str = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
    key = os.getenv("RAZORPAY_KEY_SECRET", "")
    if not key:
        raise HTTPException(status_code=500, detail="RAZORPAY_KEY_SECRET not configured")

    generated_signature = hmac.new(
        key.encode("utf-8"),
        body_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if generated_signature != body.razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    # Fetch from Razorpay
    try:
        payment = razorpay_client.payment.fetch(body.razorpay_payment_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch payment: {str(e)}")

    if payment["status"] not in ["captured", "authorized"]:
        raise HTTPException(status_code=400, detail=f"Payment not captured: {payment['status']}")
    # Load invoice
    invoice = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == body.document_id,
        BillingDocumentEntity.client_id == client_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice not found: id={body.document_id}")
    # Enrich payment_method JSONB
    existing_methods = list(invoice.payment_method or [])
    updated_methods  = []
    matched          = False

    for pm in existing_methods:
        if not isinstance(pm, dict):
            updated_methods.append(pm)
            continue

        is_exact_match     = pm.get("razorpay_order_id") == body.razorpay_order_id
        is_unverified_slot = (
            pm.get("method", "").startswith("razorpay")
            and not pm.get("razorpay_order_id")
            and not matched
        )

        if is_exact_match or is_unverified_slot:
            pm = {
                **pm,
                "razorpay_payment_id": body.razorpay_payment_id,
                "razorpay_order_id":   body.razorpay_order_id,
                "razorpay_signature":  body.razorpay_signature,
                "razorpay_status":     payment["status"],
                "verified_at":         datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
            }
            matched = True

        updated_methods.append(pm)

    if not matched:
        updated_methods.append({
            "method":              "razorpay",
            "amount":              payment.get("amount", 0) / 100,
            "razorpay_payment_id": body.razorpay_payment_id,
            "razorpay_order_id":   body.razorpay_order_id,
            "razorpay_signature":  body.razorpay_signature,
            "razorpay_status":     payment["status"],
            "verified_at":         datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
        })

    invoice.payment_method  = updated_methods
    flag_modified(invoice, "payment_method")
    invoice.payment_status  = "Paid"
    invoice.approval_status = "Approved"
    invoice.updated_at      = datetime.now(ZoneInfo(TIMEZONE))

    if not invoice.customer_id:
        invoice.customer_id   = payment.get("contact", "")
    if not invoice.contact_phone:
        invoice.contact_phone = payment.get("contact", "")
    if not invoice.contact_email:
        invoice.contact_email = payment.get("email", "")

    db.commit()
    db.refresh(invoice)

    return ResponseModel(
        screen_id=context.screen_id,
        status="success",
        message="Payment verified and stored",
        data={
            "invoice_id":     invoice.id,
            "payment_method": updated_methods,
            "payment_status": invoice.payment_status,
        }
    )
