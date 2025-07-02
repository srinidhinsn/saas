from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

# # -------- CATEGORY MODEL --------
# class ItemCategory(BaseModel):
#     id: Optional[UUID] = None
#     client_id: Optional[UUID] = None
#     name: str
#     description: Optional[str] = None
#     created_at: Optional[datetime] = None
#     updated_at: Optional[datetime] = None

#     class Config:
#         orm_mode = True

# -------- CATEGORY MODEL --------
class ItemCategoryModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: Optional[int] = None
    parent_id: Optional[str] = None
    kds_section: Optional[str] = None
    is_active: Optional[bool] = True
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# -------- ITEM MODEL --------
# class ItemModel(BaseModel):
#     id: Optional[UUID] = None
#     client_id: Optional[UUID] = None
#     category_id: Optional[UUID] = None
#     name: str
#     description: Optional[str] = None
#     price: float
#     veg_type: Optional[str] = None  # "Veg" or "Non Veg"
#     is_available: Optional[bool] = True
#     image_url: Optional[str] = None
#     created_at: Optional[datetime] = None
#     updated_at: Optional[datetime] = None

#     class Config:
#         orm_mode = True


# -------- ITEM MODEL --------
class ItemModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[int] = None
    item_code: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None

    cgst_percent: Optional[float] = 0.0
    sgst_percent: Optional[float] = 0.0
    igst_percent: Optional[float] = 0.0

    discount: Optional[float] = 0.0
    preparation_time: Optional[str] = None
    is_veg: Optional[bool] = None
    is_available: Optional[bool] = True
    sort_order: Optional[int] = None
    kds_section: Optional[str] = None
    is_active: Optional[bool] = True

    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True



