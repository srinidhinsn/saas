from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime

class TableBase(BaseModel):
    table_number: str
    table_type: Optional[str] = None
    status: Optional[str] = "Vacant"
    location_zone: Optional[str] = None
    qr_code_url: Optional[str] = None

class TableCreate(TableBase):
    client_id: UUID4

class TableUpdate(TableBase):
    pass

class TableOut(TableBase):
    id: UUID4
    client_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
