from uuid import UUID
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class Table(BaseModel):
    id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    table_number: Optional[str] = None
    table_type: Optional[str] = None
    status: Optional[str] = None
    location_zone: Optional[str] = None
    qr_code_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
