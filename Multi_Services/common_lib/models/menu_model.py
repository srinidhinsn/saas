from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

# -------- CATEGORY MODEL --------
class ItemCategory(BaseModel):
    id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# -------- ITEM MODEL --------
class Item(BaseModel):
    id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    price: float
    is_available: Optional[bool] = True
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
