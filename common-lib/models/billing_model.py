from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class BillingDocument(BaseModel):
    id:                   Optional[int]       = None
    client_id:            Optional[str]       = None
    document_type:        Optional[str]       = None  # invoice, quotation, po, dc, credit_note
    document_number:      Optional[str]       = None
    document_date:        Optional[datetime]  = None
    due_date:             Optional[datetime]  = None
    reference_number:     Optional[str]       = None  # optional external ref
    order_id:             Optional[str]       = None
    customer_id:          Optional[str]       = None
    vendor_id:            Optional[str]       = None
    currency:             Optional[str]       = "INR"
    status:               Optional[str]       = "Draft"
    contact_email:        Optional[str]       = None
    contact_phone:        Optional[str]       = None
    terms:                Optional[str]       = None
    notes:                Optional[str]       = None
    subtotal:             Optional[float]     = 0.0
    tax_amount:           Optional[float]     = 0.0
    discount_amount:      Optional[float]     = 0.0
    total_amount:         Optional[float]     = 0.0
    linked_document_ids:  Optional[str]       = None  # comma-separated UUIDs or doc_numbers
    is_active:            Optional[bool]      = True
    created_by:           Optional[str]       = None
    updated_by:           Optional[str]       = None
    created_at:           Optional[datetime]  = None
    updated_at:           Optional[datetime]  = None

    class Config:
        orm_mode = True


class BillingDocumentItem(BaseModel):
    id:             Optional[int]       = None
    document_id:    Optional[int]       = None
    item_ref_id:    Optional[str]       = None
    description:    Optional[str]       = None
    quantity:       Optional[float]     = 0.0
    unit_price:     Optional[float]     = 0.0
    discount:       Optional[float]     = 0.0
    tax_rate:       Optional[float]     = 0.0
    total:          Optional[float]     = 0.0
    is_active:      Optional[bool]      = True
    created_at:     Optional[datetime]  = None
    updated_at:     Optional[datetime]  = None

    class Config:
        orm_mode = True
