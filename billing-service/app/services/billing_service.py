from sqlalchemy.orm import Session
from fastapi import HTTPException
from entity.billing_entity import BillingDocumentEntity, BillingDocumentItemEntity
from models.billing_model import BillingDocument, BillingDocumentItem
from typing import List, Dict, Any, Optional
# billing_service.py
from models.billing_model import PaymentStatusEnum, ApprovalStatusEnum 

from sqlalchemy import and_, or_
from datetime import datetime, timedelta



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
# def create_items_service(document_id: int, items: list[BillingDocumentItem], client_id: str, db: Session) -> list[BillingDocumentItem]:
#     for item in items:
#         db_item = BillingDocumentItemEntity(
#             **item.dict(exclude_unset=True),
#             document_id=document_id
#         )
#         db.add(db_item)

#     db.commit()
#     return get_billing_document_items(document_id, client_id, db)

# 5. /create (billing_document_items)
def create_items_service(document_id: int, items: list[BillingDocumentItem], client_id: str, db: Session) -> list[BillingDocumentItem]:
    for item in items:
        payload = item.dict(exclude_unset=True, exclude_defaults=True)
        db_item = BillingDocumentItemEntity(**payload, document_id=document_id)

        # Ensure unit_price present or derive it (if you map from order items)
        if db_item.unit_price is None:
            db_item.unit_price = 0.0  # or lookup from order-service payload

        # Recompute total on the server side
        db_item.total = (db_item.quantity or 0) * (db_item.unit_price or 0)
        # If you have discount/tax fields, do:
        # net = (db_item.quantity or 0) * (db_item.unit_price or 0)
        # net_after_discount = net * (1 - (db_item.discount or 0)/100)
        # db_item.total = net_after_discount * (1 + (db_item.tax_rate or 0)/100)

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

# ----------------------------------------- for invoice  -------------------------------------------------------------

# def upsert_from_order_payload(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
#     """
#     Upserts a draft billing document and replaces its items from an order summary.
#     Enforces one editable doc per (client_id, order_id) while status is Draft/Created/Pending.
#     """
#     client_id = payload.get("client_id")
#     order_id  = str(payload.get("order_id"))
#     if not client_id or not order_id:
#         raise ValueError("client_id and order_id are required")

#     editable_statuses = ("Draft", "Created", "Pending", None)

#     doc = db.query(BillingDocumentEntity).filter(
#         and_(
#             BillingDocumentEntity.client_id == client_id,
#             BillingDocumentEntity.order_id == order_id,
#             BillingDocumentEntity.status.in_(editable_statuses),
#         )
#     ).first()

#     if not doc:
#         doc = BillingDocumentEntity(
#             client_id=client_id,
#             document_type="Invoice",
#             status="Draft",
#             order_id=order_id,
#             currency="INR",
#             notes="Synced from order-service",
#         )
#         db.add(doc)
#         db.flush()

#     # Optional reference
#     table_id = payload.get("table_id")
#     if table_id is not None:
#         doc.reference_number = f"Table-{table_id}"

#     # Replace lines
#     db.query(BillingDocumentItemEntity).filter(
#         BillingDocumentItemEntity.document_id == doc.id
#     ).delete()

#     items: List[Dict[str, Any]] = payload.get("items") or []
#     line_no = 1
#     for it in items:
#         desc = it.get("item_name") or it.get("slug") or f"Item-{it.get('item_id')}"
#         qty  = float(it.get("quantity") or 0.0)
#         db.add(BillingDocumentItemEntity(
#             document_id   = doc.id,
#             item_ref_id   = str(it.get("item_id")) if it.get("item_id") is not None else None,
#             description   = desc,
#             quantity      = qty,
#             unit_price    = 0.0,  # update later if you start storing per-line prices
#             discount      = 0.0,
#             tax_rate      = 0.0,
#             total         = 0.0,
#             item_category = None,
#             item_discount = 0.0,
#             item_tax_code = "Standard",
#         ))
#         line_no += 1

#     # Totals mapped from order header
#     totals = payload.get("totals") or {}
#     price = float(totals.get("price") or 0.0)
#     gst   = float(totals.get("gst") or 0.0)
#     cst   = float(totals.get("cst") or 0.0)
#     disc  = float(totals.get("discount") or 0.0)
#     grand = float(totals.get("total_price") or 0.0)

#     # Simple, explicit mapping:
#     doc.subtotal        = price or (grand - (gst + cst) + disc)
#     doc.tax_amount      = gst + cst
#     doc.discount_amount = disc
#     doc.total_amount    = grand

#     db.commit()
#     return {"invoice_id": doc.id, "invoice_number": doc.document_number, "document_status": doc.status}



def upsert_from_order_payload(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Upserts a draft/created invoice for (client_id, order_id) and replaces its items
    using an order summary payload coming from order-service.
    Copies per-line unit_price and line_total (as total) when available.
    """
    def _flt(x, d=0.0):
        try:
            return round(float(x), 2)
        except Exception:
            return d

    # -------- Required keys --------
    client_id = payload.get("client_id")
    order_id  = str(payload.get("order_id"))
    if not client_id or not order_id:
        raise ValueError("client_id and order_id are required")

    # -------- Find or create editable doc for this (client, order) --------
    editable_statuses = ("Draft", "Created", "Pending")
    doc = (
        db.query(BillingDocumentEntity)
        .filter(
            and_(
                BillingDocumentEntity.client_id == client_id,
                BillingDocumentEntity.order_id == order_id,
                or_(
                    BillingDocumentEntity.status.in_(editable_statuses),
                    BillingDocumentEntity.status.is_(None),
                ),
            )
        )
        .first()
    )

    if not doc:
        doc = BillingDocumentEntity(
            client_id=client_id,
            document_type="Invoice",
            status="Draft",
            order_id=order_id,
            currency="INR",
            notes="Synced from order-service",
        )
        db.add(doc)
        db.flush()  # get doc.id

    # Optional reference: "Table-<id>"
    table_id = payload.get("table_id")
    if table_id is not None:
        doc.reference_number = f"Table-{table_id}"

    # -------- Replace lines --------
    db.query(BillingDocumentItemEntity).filter(
        BillingDocumentItemEntity.document_id == doc.id
    ).delete(synchronize_session=False)

    items: List[Dict[str, Any]] = payload.get("items") or []
    for it in items:
        desc = it.get("item_name") or it.get("slug") or f"Item-{it.get('item_id')}"
        qty  = _flt(it.get("quantity"), 0.0)
        unit_price = _flt(it.get("unit_price"), 0.0)   # <-- COPY unit price from order payload
        line_total = _flt(it.get("line_total"), qty * unit_price)  # <-- COPY line total; fallback compute

        db.add(
            BillingDocumentItemEntity(
                document_id     = doc.id,
                item_ref_id     = str(it.get("item_id")) if it.get("item_id") is not None else None,
                description     = desc,
                quantity        = qty,
                unit_price      = unit_price,   # <-- set
                discount        = _flt(it.get("discount"), 0.0),
                tax_rate        = _flt(it.get("tax_rate"), 0.0),
                total           = line_total,   # <-- set (billing column is "total", not "line_total")
                unit_of_measure = "Unit",
                item_category   = None,
                item_discount   = _flt(it.get("item_discount"), 0.0),
                item_tax_code   = it.get("item_tax_code") or "Standard",
                is_active       = True,
            )
        )

    # -------- Map header totals --------
    totals = payload.get("totals") or {}
    price = _flt(totals.get("price"))          # subtotal
    gst   = _flt(totals.get("gst"))
    cst   = _flt(totals.get("cst"))
    disc  = _flt(totals.get("discount"))
    grand = _flt(totals.get("total_price"))

    # If subtotal not explicitly provided, back-calc from grand:
    if price == 0.0 and (grand or 0) != 0:
        price = _flt(grand - (gst + cst) + disc)

    doc.subtotal        = price
    doc.tax_amount      = _flt(gst + cst)
    doc.discount_amount = disc
    doc.total_amount    = grand

    db.commit()
    db.refresh(doc)
    return {
        "invoice_id": doc.id,
        "invoice_number": doc.document_number,
        "document_status": doc.status,
    }


def validate_invoice_ready(db: Session, doc: BillingDocumentEntity) -> None:
    """
    Basic validations before marking an invoice as Created.
    Expand as needed (party info, tax rules, etc.).
    """
    # must be a draft-like status
    if doc.status not in ("Draft", "Created", "Pending"):
        raise ValueError(f"Document not in a generatable state (status={doc.status})")

    # at least one line
    lines_exist = db.query(BillingDocumentItemEntity.id)\
                    .filter(BillingDocumentItemEntity.document_id == doc.id)\
                    .first()
    if not lines_exist:
        raise ValueError("No line items on the document")

    # totals should exist (header)
    if doc.total_amount is None:
        raise ValueError("Total amount missing")

def generate_invoice(db: Session, client_id: str, invoice_id: int,
                     document_date: Optional[datetime] = None,
                     due_in_days: int = 0) -> dict:
    """
    Move Draft -> Created, set document_date (if missing), and due_date (optional).
    Does NOT assign a document_number (that happens on 'issue').
    """
    doc = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == invoice_id,
        BillingDocumentEntity.client_id == client_id
    ).first()
    if not doc:
        raise ValueError("Invoice not found")

    # validations
    validate_invoice_ready(db, doc)

    # set dates
    if not document_date:
        document_date = datetime.now()
    doc.document_date = doc.document_date or document_date
    if due_in_days and not doc.due_date:
        doc.due_date = document_date + timedelta(days=due_in_days)

    # move to Created (lock draft)
    doc.status = "Created"

    db.commit()
    return {
        "invoice_id": doc.id,
        "status": doc.status,
        "document_number": doc.document_number,
        "document_date": doc.document_date.isoformat() if doc.document_date else None,
        "due_date": doc.due_date.isoformat() if doc.due_date else None,
        "total_amount": doc.total_amount
    }

def issue_invoice(db: Session, client_id: str, invoice_id: int) -> dict:
    doc = db.query(BillingDocumentEntity).filter(
        BillingDocumentEntity.id == invoice_id,
        BillingDocumentEntity.client_id == client_id
    ).first()
    if not doc:
        raise ValueError("Invoice not found")

    # Only allow Create/Draft to be issued
    if doc.status not in ("Created", "Draft"):
        raise ValueError(f"Cannot issue invoice in status {doc.status}")

    # Assign number if missing
    if not doc.document_number:
        # Simple sequence: INV-YYYY-<id>  (replace with your own numbering logic)
        year = datetime.now().strftime("%Y")
        doc.document_number = f"INV-{year}-{invoice_id:06d}"

    doc.status = "Issued"
    doc.invoice_date = datetime.now()
    db.commit()
    db.refresh(doc)
    return {
        "invoice_id": doc.id,
        "document_number": doc.document_number,
        "status": doc.status,
        "invoice_date": doc.invoice_date.isoformat()
    }






