from pydantic import BaseModel
from typing import Optional, List
import datetime

class InventoryModel(BaseModel):
    id: Optional[int] = None
    clientId: Optional[str] = None
    inventoryId: Optional[str] = None
    itemId: Optional[str] = None
    lineItemId: Optional[List[str]] = []  # ARRAY converted to Python List[str]
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    realm: Optional[str] = None
    availability: Optional[int] = None
    unit: Optional[str] = None
    unitPrice: Optional[float] = None
    unitCst: Optional[float] = None
    unitGst: Optional[float] = None
    unitTotalPrice: Optional[float] = None
    price: Optional[float] = None
    cst: Optional[float] = None
    gst: Optional[float] = None
    discount: Optional[float] = None
    totalPrice: Optional[float] = None
    createdBy: Optional[str] = None
    updatedBy: Optional[str] = None
    createdDateTime: Optional[datetime.datetime]
    updatedDateTime: Optional[datetime.datetime]