from pydantic import BaseModel
from typing import Optional
import datetime

class DineinOrderModel(BaseModel):
    id: Optional[int] = None
    clientId: Optional[str] = None
    dineinOrderId: Optional[str] = None
    tableNumber: Optional[int] = None
    invoiceId: Optional[str] = None
    handlerId: Optional[str] = None
    invoiceStatus: Optional[str] = None
    price: Optional[float] = None
    cst: Optional[float] = None
    gst: Optional[float] = None
    discount: Optional[float] = None
    totalPrice: Optional[float] = None
    createdBy: Optional[str] = None
    updatedBy: Optional[str] = None
    createdDateTime: Optional[datetime.datetime]
    updatedDateTime: Optional[datetime.datetime]
    status: Optional[str] = None

class OrderItemModel(BaseModel):
    id: Optional[int] = None
    clientId: Optional[str] = None
    orderId: Optional[str] = None
    orderItemId: Optional[str] = None
    itemId: Optional[str] = None
    quantity: Optional[int] = None
