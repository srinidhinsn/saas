from pydantic import BaseModel
from typing import Optional
import datetime

class DineinOrderModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    dinein_order_id: Optional[str] = None
    table_id: Optional[int] = None
    invoice_id: Optional[str] = None
    handler_id: Optional[str] = None
    invoice_status: Optional[str] = None
    price: Optional[float] = None
    cst: Optional[float] = None
    gst: Optional[float] = None
    discount: Optional[float] = None
    total_price: Optional[float] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    status: Optional[str] = None

class OrderItemModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    order_id: Optional[str] = None
    item_id: Optional[str] = None
    quantity: Optional[int] = None
