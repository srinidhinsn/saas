from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class Inventory(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    inventory_id: Optional[int] = None
    line_item_id: Optional[List[int]] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    realm: Optional[str] = None
    availability: Optional[int] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    unit_cst: Optional[float] = None
    unit_gst: Optional[float] = None
    unit_total_price: Optional[float] = None
    price: Optional[float] = None
    cst: Optional[float] = None
    gst: Optional[float] = None
    discount: Optional[float] = None
    total_price: Optional[float] = None
    slug: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class Category(BaseModel):
    id: Optional[str] = None
    client_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    sub_categories: Optional[List[str]] = None
    slug: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
