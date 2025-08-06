from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from uuid import UUID
from models.billing_model import BillingDocument, BillingDocumentItem
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token
from database.postgres import get_db
from app.services.billing_service import (
    create_document_service, read_documents_service, update_document_service, delete_document_service,
    create_items_service, read_items_service, update_items_service, delete_items_service
)

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
        raise HTTPException(
            status_code=400, detail="Missing billing document ID")
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
