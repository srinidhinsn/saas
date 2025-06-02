from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID

class ComboItem(BaseModel):
    menu_item_id: UUID
    quantity: int = 1

    class Config:
        orm_mode = True

class Combo(BaseModel):
    id: Optional[UUID] = None
    client_id: UUID
    name: str
    description: Optional[str] = None
    price: float
    items: List[ComboItem]

    class Config:
        orm_mode = True
