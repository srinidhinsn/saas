from sqlalchemy.orm import Session
from fastapi import HTTPException
from entity.billing_entity import BillingDocumentEntity, BillingDocumentItemEntity
from models.billing_model import BillingDocument, BillingDocumentItem
from typing import List, Dict, Any, Optional
# billing_service.py
from models.billing_model import PaymentStatusEnum, ApprovalStatusEnum 

# ---------------------------------- support functions ----------------------------------
# Get Items by Document ID
def get_billing_document_items(document_id: int, client_id: str, db: Session) -> list[BillingDocumentItem]:
    items = db.query(BillingDocumentItemEntity).join(BillingDocumentEntity).filter(
        BillingDocumentItemEntity.document_id == document_id,
        BillingDocumentEntity.client_id == client_id,
        BillingDocumentItemEntity.is_active == True
    ).all()
    return BillingDocumentItemEntity.copyToModels(items)

# ---------------------------------- endpoint functions ----------------------------------

# 1. /create_document
def create_document_service(doc: BillingDocument, db: Session) -> BillingDocument:
    try:
        # Convert the Pydantic model to a dictionary and map to the SQLAlchemy model
        document_data = doc.dict(exclude_unset=True)

        # Ensure default values for missing fields
        if "payment_status" not in document_data:
            document_data["payment_status"] = PaymentStatusEnum.pending
        if "approval_status" not in document_data:
            document_data["approval_status"] = ApprovalStatusEnum.pending
        if "document_version" not in document_data:
            document_data["document_version"] = 1

        # Create the SQLAlchemy object using the cleaned data
        db_doc = BillingDocumentEntity(**document_data)

        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        # Return the Pydantic model after inserting into the database
        return BillingDocumentEntity.copyToModel(db_doc)
    except Exception as e:
        db.rollback()
        print(f"Error while creating document: {e}")
        raise e


# 2. /read_document
def read_documents_service(client_id: str, document_type: str = None, status: str = None, db: Session = None, limit=100, offset=0):
    query = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.client_id == client_id,
        BillingDocumentEntity.is_active == True
    )
    if document_type:
        query = query.filter(BillingDocumentEntity.document_type == document_type)
    if status:
        query = query.filter(BillingDocumentEntity.status == status)
    
    query = query.offset(offset).limit(limit)
    results = query.all()
    return BillingDocumentEntity.copyToModels(results)

# 3. /update_document
def update_document_service(updates: BillingDocument, client_id: str, db: Session) -> BillingDocument:
    db_doc = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == updates.id,
        BillingDocumentEntity.client_id == client_id,
        BillingDocumentEntity.is_active == True
    ).first()

    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update the new fields
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_doc, key, value)

    db.commit()
    db.refresh(db_doc)
    return BillingDocumentEntity.copyToModel(db_doc)


# 4. /delete_document
def delete_document_service(id: int, client_id: str, db: Session) -> BillingDocument:
    db_doc = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == id,
        BillingDocumentEntity.client_id == client_id,
        BillingDocumentEntity.is_active == True
    ).first()

    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db_doc.is_active = False
    db.commit()
    db.refresh(db_doc)
    return BillingDocumentEntity.copyToModel(db_doc)

# 5. /create (billing_document_items)
def create_items_service(document_id: int, items: list[BillingDocumentItem], client_id: str, db: Session) -> list[BillingDocumentItem]:
    for item in items:
        db_item = BillingDocumentItemEntity(
            **item.dict(exclude_unset=True),
            document_id=document_id
        )
        db.add(db_item)

    db.commit()
    return get_billing_document_items(document_id, client_id, db)

# 6. /read (billing_document_items)
def read_items_service(document_id: Optional[int], client_id: str, db: Session) -> list[BillingDocumentItem]:
    query = db.query(BillingDocumentItemEntity).join(BillingDocumentEntity).filter(
        BillingDocumentItemEntity.is_active == True,
        BillingDocumentEntity.client_id == client_id
    )

    if document_id:
        query = query.filter(BillingDocumentItemEntity.document_id == document_id)

    results = query.all()
    return BillingDocumentItemEntity.copyToModels(results)

# 7. /update (billing_document_items)
def update_items_service(items: list[BillingDocumentItem], client_id: str, db: Session) -> list[BillingDocumentItem]:
    updated_items = []
    for item in items:
        db_item = db.query(BillingDocumentItemEntity).filter(
            BillingDocumentItemEntity.id == item.id,
            BillingDocumentItemEntity.is_active == True
        ).first()
        if not db_item:
            raise HTTPException(status_code=404, detail=f"Item with ID {item.id} not found")

        for key, value in item.dict(exclude_unset=True).items():
            setattr(db_item, key, value)

        db.commit()
        db.refresh(db_item)
        updated_items.append(BillingDocumentItemEntity.copyToModel(db_item))

    return updated_items

# 8. /delete (billing_document_items)
def delete_items_service(ids: list[int], client_id: str, db: Session) -> list[BillingDocumentItem]:
    deleted_items = []
    items = db.query(BillingDocumentItemEntity).join(BillingDocumentEntity).filter(
        BillingDocumentItemEntity.id.in_(ids),
        BillingDocumentEntity.client_id == client_id,
        BillingDocumentItemEntity.is_active == True
    ).all()

    for item in items:
        item.is_active = False
        db.commit()
        db.refresh(item)
        deleted_items.append(item)

    return BillingDocumentItemEntity.copyToModels(deleted_items)



