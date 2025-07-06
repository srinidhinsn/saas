from pydantic import BaseModel
from typing import List, Literal, Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class OrderStatusEnum(str, Enum):
    pending = "pending"
    preparing = "preparing"
    served = "served"
    cancelled = "cancelled"

class StatusUpdateRequest(BaseModel):
    order_id: UUID
    status: OrderStatusEnum

class OrderItem(BaseModel):
    item_id: UUID
    item_type: Literal["item", "combo"]
    quantity: int

    class Config:
        orm_mode = True

class Order(BaseModel):
    id: Optional[UUID] = None
    table_id: UUID
    items: List[OrderItem]
    status: Optional[OrderStatusEnum] = OrderStatusEnum.pending
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class OrderUpdateRequest(BaseModel):
    order_id: UUID
    items: List[OrderItem]


