from sqlalchemy import Column, String, Text, ForeignKey, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class MenuCombo(Base):
    __tablename__ = "menu_combos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)

    combo_items = relationship("ComboItem", back_populates="combo", cascade="all, delete-orphan")


class ComboItem(Base):
    __tablename__ = "menu_combo_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    combo_id = Column(UUID(as_uuid=True), ForeignKey("menu_combos.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(UUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1)

    combo = relationship("MenuCombo", back_populates="combo_items")
