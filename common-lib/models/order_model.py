from pydantic import BaseModel
from typing import Optional
import datetime

class DineinOrderModel(BaseModel):
    id: int
    clientId: str
    dineinOrderId: Optional[str]
    tableNumber: Optional[int]
    invoiceId: Optional[str]
    handlerId: Optional[str]
    invoiceStatus: Optional[str]
    price: Optional[float]
    cst: Optional[float]
    gst: Optional[float]
    discount: Optional[float]
    totalPrice: Optional[float]
    createdBy: Optional[str]
    updatedBy: Optional[str]
    createdDateTime: Optional[datetime.datetime]
    updatedDateTime: Optional[datetime.datetime]
    status: Optional[str]

class OrderItemModel(BaseModel):
    id: int
    clientId: Optional[str]
    orderId: Optional[str]
    orderItemId: Optional[str]
    itemId: Optional[str]
    quantity: int
