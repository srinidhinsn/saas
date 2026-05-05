from pydantic import BaseModel
from typing import Optional, List
import datetime
from enum import Enum


class OrderStatusEnum(str, Enum):
    draft = "draft"
    pending = "pending"
    preparing = "preparing"
    ready = "ready"
    served = "served"
    cancelled = "cancelled"
    completed = "completed"


class TransactionTypeEnum(str, Enum):
    order_deduction = "ORDER_DEDUCTION"
    menu_item_deduction = "MENU_ITEM_DEDUCTION"
    item_cancelled = "ITEM_CANCELLED"
    wastage = "WASTAGE"
    order_cancelled = "ORDER_CANCELLED"
    combo_child_wastage = "COMBO_CHILD_WASTAGE"
    combo_child_cancelled = "COMBO_CHILD_CANCELLED"
    recipe_cancel = "RECIPE_CANCEL"
    ingredient_reversal = "INGREDIENT_REVERSAL"


class MovementTypeEnum(str, Enum):
    out = "OUT"
    reversal = "REVERSAL"
    none = "NONE"


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