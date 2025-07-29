from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models.billing_model import BillingDocument, BillingDocumentItem
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token
from database.postgres import get_db
from ..services.billing_service import (
    create_billing_document,
    get_billing_document_by_id,
    get_billing_documents,
    soft_delete_billing_document,
    update_billing_document_service
)

router = APIRouter()

# GET all billing documents


@router.get("/read", response_model=ResponseModel[List[BillingDocument]])
def read_billing_documents(
    client_id: str,
    document_type: str = None,
    status: str = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    documents = get_billing_documents(client_id, document_type, status, db)
    return ResponseModel[List[BillingDocument]](
        screen_id=context.screen_id,
        data=documents
    )


# GET one document by ID
@router.get("/read/{id}", response_model=ResponseModel[BillingDocument])
def read_billing_document_by_id(
    client_id: str,
    id: int,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    document = get_billing_document_by_id(id, client_id, db)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return ResponseModel[BillingDocument](
        screen_id=context.screen_id,
        data=document
    )


# POST to create a new billing document
@router.post("/create", response_model=ResponseModel[BillingDocument])
def create_billing(
    billing: BillingDocument,
    items: List[BillingDocumentItem],
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    billing.client_id = client_id
    result = create_billing_document(billing, items, db)
    return ResponseModel[BillingDocument](
        screen_id=context.screen_id,
        status="success",
        message="Billing document created successfully",
        data=result
    )


@router.post("/update", response_model=ResponseModel[BillingDocument])
def update_billing_document(
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

    updated_doc = update_billing_document_service(updates, client_id, db)
    return ResponseModel[BillingDocument](
        screen_id=context.screen_id,
        status="success",
        message="Billing document updated successfully",
        data=updated_doc
    )


@router.post("/delete", response_model=ResponseModel[BillingDocument])
def delete_billing_document(
    client_id: str,
    billing: BillingDocument,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if not billing.id:
        raise HTTPException(status_code=400, detail="Missing document ID")

    deleted_doc = soft_delete_billing_document(billing.id, client_id, db)

    return ResponseModel[BillingDocument](
        screen_id=context.screen_id,
        status="success",
        message="Billing document deleted successfully",
        data=deleted_doc
    )
