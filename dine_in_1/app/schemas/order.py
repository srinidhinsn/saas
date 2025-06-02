from pydantic import BaseModel
from typing import List, Literal
from datetime import datetime
from enum import Enum
from uuid import UUID

class OrderItemBase(BaseModel):
    item_id: UUID
    item_type: Literal["item", "combo"]
    quantity: int

class OrderCreate(BaseModel):
    table_id: str
    items: List[OrderItemBase]

class OrderRead(OrderCreate):

    id: UUID
    table_id: UUID
    items: List[OrderItemBase]
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

class OrderStatusEnum(str, Enum):
    pending   = "pending"
    preparing = "preparing"
    served    = "served"
    cancelled = "cancelled"

class OrderStatusUpdate(BaseModel):
    status: OrderStatusEnum

class OrderUpdate(BaseModel):
    items: List[OrderItemBase]

class StatusUpdateRequest(BaseModel):
    status: str


