from sqlalchemy import Column, String, Text, Boolean, DateTime, Numeric, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import uuid

class ItemCategory(Base):
    __tablename__ = "menu_categories"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id   = Column(UUID(as_uuid=True), nullable=False)
    name        = Column(String(100), nullable=False)
    description = Column(Text)
    created_at  = Column(DateTime, default=func.now())
    updated_at  = Column(DateTime, default=func.now(), onupdate=func.now())

class Item(Base):
    __tablename__ = "menu_items"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id    = Column(UUID(as_uuid=True), nullable=False)
    category_id  = Column(UUID(as_uuid=True), ForeignKey("menu_categories.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String(100), nullable=False)
    description  = Column(Text)
    price        = Column(Numeric(10, 2), nullable=False)
    is_available = Column(Boolean, default=True)
    image_url    = Column(Text)
    created_at   = Column(DateTime, default=func.now())
    updated_at   = Column(DateTime, default=func.now(), onupdate=func.now())

