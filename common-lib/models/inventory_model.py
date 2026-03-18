from typing import Optional, List, Dict, Any, TypeVar, Generic
from pydantic import BaseModel
from datetime import datetime

# Generic for categories
Q = TypeVar("Q")

class Inventory(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    inventory_id: Optional[str] = None
    line_item_id: Optional[List[int]] = None
    recipe: Optional[List[Dict[str, Any]]] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    zone_config_id: Optional[int] = None
    realm: Optional[str] = None 
    serving_quantity: Optional[float] = None
    serving_unit: Optional[str] = None
    availability: Optional[float] = None
    unit: Optional[str] = None
    code: Optional[str] = None
    image_id: Optional[str] = None
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


class Category(BaseModel, Generic[Q]):
    id: Optional[str] = None
    client_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    sub_categories: Optional[List[Q]] = None
    slug: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
