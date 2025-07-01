from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base
from uuid import uuid4

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid4()))
    order_id = Column(String, ForeignKey("orders.id"))
    item_id = Column(String)  # Can be item or combo ID
    item_type = Column(String)  # "item" or "combo"
    quantity = Column(Integer)

    order = relationship("Order", back_populates="items")
