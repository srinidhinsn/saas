from pydantic import BaseModel
from typing import Optional, List
import datetime
from enum import Enum


class OrderStatusEnum(str, Enum):
    new = "new"
    pending = "pending"
    preparing = "preparing"
    ready = "ready"
    served = "served"
    cancelled = "cancelled"


class OrderItemModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    order_id: Optional[int] = None
    item_id: Optional[int] = None
    item_name: Optional[str] = None
    slug: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    line_total: Optional[float] = None
    status: Optional[OrderStatusEnum] = None
    frontend_unique_key: Optional[str] = None

    class Config:
        orm_mode = True


class DineinOrderModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None

    # Business-facing order identifier.
    # Fresh orders: dinein_order_id == str(id), e.g. "1001"
    # Sub-orders:   dinein_order_id == "<parent_dinein_order_id>-<n>", e.g. "1001-1"
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
    status: Optional[OrderStatusEnum] = None
    items: Optional[List[OrderItemModel]] = []

    class Config:
        orm_mode = True