from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class ClientModel(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    realm: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    logo: Optional[str] = None

class AddressModel(BaseModel):
    id: Optional[int] = None
    address_line1: Optional[str]=None
    address_line2: Optional[str]=None
    city: Optional[str]=None
    country: Optional[str]=None
    state: Optional[str]=None
    pincode: Optional[str]=None
    contact_name : Optional[str]=None
    contact_number : Optional[str]=None
    created_at:    Optional[datetime] = None
    updated_at:    Optional[datetime] = None
