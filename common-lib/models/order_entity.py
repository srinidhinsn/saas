from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import declarative_base
import datetime
from order_model import OrderItemModel, DineinOrderModel
Base = declarative_base()


# DineinOrders Table
class DineinOrder(Base):
    __tablename__ = "DineinOrders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    clientId = Column(String, nullable=False)
    dineinOrderId = Column(String, unique=True, nullable=True)
    tableNumber = Column(Integer, nullable=True)
    invoiceId = Column(String, nullable=True)
    handlerId = Column(String, nullable=True)
    invoiceStatus = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    cst = Column(Float, nullable=True)
    gst = Column(Float, nullable=True)
    discount = Column(Float, nullable=True)
    totalPrice = Column(Float, nullable=True)
    createdBy = Column(String, nullable=True)
    updatedBy = Column(String, nullable=True)
    createdDateTime = Column(DateTime, default=datetime.datetime.utcnow)
    updatedDateTime = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    status = Column(String, nullable=True)


    @staticmethod
    def copyToModel(dineinOrder):
        """Convert SQLAlchemy DineinOrders entities into Pydantic models."""
        dineinOrderModel = DineinOrderModel(**order.__dict__)
        dineinOrderModel.__dict__.pop("_sa_instance_state", None)
        return dineinOrderModel

    @staticmethod
    def copyFromModel(dineinOrderModel):
        """Convert Pydantic DineinOrders models into SQLAlchemy entities."""
        return DineinOrder(**dineinOrderModel.dict(exclude_unset=True))

    @staticmethod
    def copyToModels(dinein_orders):
        """Convert SQLAlchemy DineinOrders entities into Pydantic models."""
        dineinOrdersModels = [DineinOrderModel(**order.__dict__) for order in dinein_orders]

        # Remove SQLAlchemy metadata (_sa_instance_state)
        for model in dineinOrdersModels:
            model.__dict__.pop("_sa_instance_state", None)

        return dineinOrdersModels

    @staticmethod
    def copyFromModels(dinein_orders_models):
        """Convert Pydantic DineinOrders models into SQLAlchemy entities."""
        return [DineinOrder(**model.dict(exclude_unset=True)) for model in dinein_orders_models]




# OrderItems Table
class OrderItem(Base):
    __tablename__ = "OrderItems"

    id = Column(Integer, primary_key=True, autoincrement=True)
    clientId = Column(String, nullable=False)
    orderId = Column(String, ForeignKey("dinein_orders.dineinOrderId"), nullable=False)
    orderItemId = Column(String, unique=True, nullable=False)
    itemId = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)

    @staticmethod
    def copyToModel(orderItem):
        """Convert SQLAlchemy OrderItems entities into Pydantic models."""
        orderItemModel = OrderItemsModel(**item.__dict__)
        orderItemModel.__dict__.pop("_sa_instance_state", None)
        return orderItemModel

    @staticmethod
    def copyFromModel(orderItemModel):
        """Convert Pydantic OrderItems models into SQLAlchemy entities."""
        return OrderItem(**model.dict(exclude_unset=True))

    @staticmethod
    def copyToModels(order_items):
        """Convert SQLAlchemy OrderItems entities into Pydantic models."""
        orderItemsModels = [OrderItemsModel(**item.__dict__) for item in order_items]
        for model in orderItemsModels:
            model.__dict__.pop("_sa_instance_state", None)
        return orderItemsModels

    @staticmethod
    def copyFromModels(order_items_models):
        """Convert Pydantic OrderItems models into SQLAlchemy entities."""
        return [OrderItems(**model.dict(exclude_unset=True)) for model in order_items_models]

