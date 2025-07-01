from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID

class ComboItemCreate(BaseModel):
    menu_item_id: UUID
    quantity: int = 1

class ComboCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    client_id: UUID
    items: List[ComboItemCreate]

class ComboItemOut(BaseModel):
    menu_item_id: UUID
    quantity: int

    class Config:
        orm_mode = True

class ComboOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    price: float
    items: List[ComboItemOut]

    class Config:
        orm_mode = True

class ComboUpdate(ComboCreate):
    pass



