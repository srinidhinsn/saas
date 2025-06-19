from sqlalchemy import Column, String, Text, Boolean, DateTime, Numeric, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import uuid

class ItemCategory(Base):
    __tablename__ = "item_categories"

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    client_id   = Column(Text, nullable=True)
    name        = Column(Text, nullable=True)
    slug        = Column(Text, unique=True, nullable=True)
    description = Column(Text, nullable=True)
    image_url   = Column(Text, nullable=True)
    sort_order  = Column(Text, nullable=True)
    parent_id   = Column(Text, nullable=True)
    kds_section = Column(Text, nullable=True)
    is_active   = Column(Text, nullable=True, default="true")
    created_by  = Column(Text, nullable=True)
    updated_by  = Column(Text, nullable=True)
    created_at  = Column(TIMESTAMP, server_default=func.now(), nullable=True)
    updated_at  = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=True)

i
class Item(Base):
    __tablename__ = "items"

    id           = Column(BigInteger, primary_key=True, index=True)
    client_id    = Column(Text, nullable=True)
    category_id  = Column(UUID(as_uuid=True), ForeignKey("menu_categories.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String(100), nullable=False)
    description  = Column(Text)
    price        = Column(Numeric(10, 2), nullable=False)
    veg_type     = Column(String(20))
    is_available = Column(Boolean, default=True)
    image_url    = Column(Text)
    created_at   = Column(DateTime, default=func.now())
    updated_at   = Column(DateTime, default=func.now(), onupdate=func.now())

