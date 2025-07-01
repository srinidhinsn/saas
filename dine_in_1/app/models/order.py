from sqlalchemy import Column, ForeignKey, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from app.database import Base
import enum
from sqlalchemy.dialects.postgresql import UUID



class OrderStatus(str, enum.Enum):
    pending = "pending"
    preparing = "preparing"
    served = "served"
    cancelled = "cancelled"

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid4()))
    client_id = Column(String, index=True)
    #table_id = Column(String, ForeignKey("tables.id"))
    table_id = Column(UUID(as_uuid=True), ForeignKey("tables.id"))
    status = Column(Enum(OrderStatus), default=OrderStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    #table = relationship("DiningTable", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
