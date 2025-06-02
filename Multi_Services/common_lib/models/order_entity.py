from sqlalchemy import Column, ForeignKey, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
import enum
from database import Base

# Enum for order status
class OrderStatus(str, enum.Enum):
    pending = "pending"
    preparing = "preparing"
    served = "served"
    cancelled = "cancelled"

# Order Table
class Order(Base):
    __tablename__ = "orders"

    id            = Column(String, primary_key=True, index=True, default=lambda: str(uuid4()))
    client_id     = Column(String, index=True)
    table_id      = Column(UUID(as_uuid=True), ForeignKey("tables.id"))
    status        = Column(Enum(OrderStatus), default=OrderStatus.pending)
    created_at    = Column(DateTime, default=datetime.utcnow)

    items         = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


# OrderItem Table
class OrderItem(Base):
    __tablename__ = "order_items"

    id            = Column(String, primary_key=True, index=True, default=lambda: str(uuid4()))
    order_id      = Column(String, ForeignKey("orders.id"))
    item_id       = Column(String)  # Can refer to item or combo
    item_type     = Column(String)  # "item" or "combo"
    quantity      = Column(Integer)

    order         = relationship("Order", back_populates="items")
