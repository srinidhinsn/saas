from pydantic import BaseModel
from typing import Optional, List
import datetime

class InventoryModel(BaseModel):
    id: int
    clientId: Optional[str]
    inventoryId: Optional[str]
    itemId: Optional[str]
    lineItemId: Optional[List[str]]  # ARRAY converted to Python List[str]
    name: Optional[str]
    description: Optional[str]
    category: Optional[str]
    realm: Optional[str]
    availability: Optional[int]
    unit: Optional[str]
    unitPrice: Optional[float]
    unitCst: Optional[float]
    unitGst: Optional[float]
    unitTotalPrice: Optional[float]
    price: Optional[float]
    cst: Optional[float]
    gst: Optional[float]
    discount: Optional[float]
    totalPrice: Optional[float]
    createdBy: Optional[str]
    updatedBy: Optional[str]
    createdDateTime: Optional[datetime.datetime]
    updatedDateTime: Optional[datetime.datetime]