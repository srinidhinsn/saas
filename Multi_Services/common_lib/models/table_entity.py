from sqlalchemy import Column, String, Text, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
import uuid

from sqlalchemy.orm import relationship
from database import Base

class DiningTable(Base):
    __tablename__  = "tables"
    __table_args__ = (UniqueConstraint("client_id", "table_number", name="uq_client_table"),)

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id      = Column(UUID(as_uuid=True), nullable=False)
    table_number   = Column(String(50), nullable=False)
    table_type     = Column(String(50))
    status         = Column(String(20), default="Vacant")
    location_zone  = Column(String(50))
    qr_code_url    = Column(Text)
    created_at     = Column(DateTime, default=func.now())
    updated_at     = Column(DateTime, default=func.now(), onupdate=func.now())
