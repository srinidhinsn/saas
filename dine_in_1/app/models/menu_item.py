from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from sqlalchemy.orm import relationship


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey(
        "menu_categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    is_available = Column(Boolean, default=True)
    image_url = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    category = relationship(
        "MenuCategory",
        back_populates="items"
    )
