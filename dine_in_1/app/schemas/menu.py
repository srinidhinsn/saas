from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime

# ---- CATEGORIES ----
class MenuCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class MenuCategoryCreate(MenuCategoryBase):
    client_id: UUID4

class MenuCategoryUpdate(MenuCategoryBase):
    pass

class MenuCategoryOut(MenuCategoryBase):
    id: UUID4
    client_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ---- ITEMS ----

class MenuItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    is_available: Optional[bool] = True
    image_url: Optional[str] = None

class MenuItemCreate(MenuItemBase):
    client_id: UUID4
    category_id: UUID4

class MenuItemUpdate(MenuItemBase):
    pass

class MenuItemOut(MenuItemBase):
    id: UUID4
    client_id: UUID4
    category_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
