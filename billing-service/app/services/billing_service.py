from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from entity.billing_entity import BillingDocumentEntity, BillingDocumentItemEntity
from models.billing_model import BillingDocument, BillingDocumentItem

# Create Document + Items
def create_billing_document(doc: BillingDocument, items: list[BillingDocumentItem], db: Session) -> BillingDocument:
    try:
        db_doc = BillingDocumentEntity(**doc.dict(exclude_unset=True))
        db.add(db_doc)
        db.flush()  # To get db_doc.id before adding items

        for item in items:
            db_item = BillingDocumentItemEntity(
                **item.dict(exclude_unset=True),
                document_id=db_doc.id
            )
            db.add(db_item)

        db.commit()
        return BillingDocumentEntity.copyToModel(db_doc)

    except Exception as e:
        db.rollback()
        raise e

# Get One Document by ID
def get_billing_document_by_id(id: int, client_id: str, db: Session) -> BillingDocument | None:
    entity = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == id,
        BillingDocumentEntity.client_id == client_id,
        BillingDocumentEntity.is_active == True
    ).first()
    return BillingDocumentEntity.copyToModel(entity) if entity else None

# Get List of Documents
def get_billing_documents(client_id: str, document_type: str = None, status: str = None, db: Session = None, limit=100, offset=0):
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

# Update billing document
def update_billing_document_service(updates: BillingDocument, client_id: str, db: Session) -> BillingDocument:
    db_doc = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == updates.id,
        BillingDocumentEntity.client_id == client_id,
        BillingDocumentEntity.is_active == True
    ).first()

    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_doc, key, value)

    db.commit()
    db.refresh(db_doc)
    return BillingDocumentEntity.copyToModel(db_doc)

# Soft delete billing document
def soft_delete_billing_document(id: int, client_id: str, db: Session) -> BillingDocument:
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
