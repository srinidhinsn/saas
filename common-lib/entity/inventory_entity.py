from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import declarative_base
from models.inventory_model import InventoryModel
import datetime

Base = declarative_base()

# Inventory Table
class Inventory(Base):
    __tablename__ = "Inventory"

    id = Column(Integer, primary_key=True)
    clientId = Column(String, nullable=True)
    inventoryId = Column(String, nullable=True)
    itemId = Column(String, nullable=True)
    lineItemId = Column(ARRAY(String), nullable=True)
    name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    category = Column(String, nullable=True)
    realm = Column(String, nullable=True)
    availability = Column(Integer, nullable=True)
    unit = Column(String, nullable=True)
    unitPrice = Column(Float, nullable=True)
    unitCst = Column(Float, nullable=True)
    unitGst = Column(Float, nullable=True)
    unitTotalPrice = Column(Float, nullable=True)
    price = Column(Float, nullable=True)
    cst = Column(Float, nullable=True)
    gst = Column(Float, nullable=True)
    discount = Column(Float, nullable=True)
    totalPrice = Column(Float, nullable=True)
    createdBy = Column(String, nullable=True)
    updatedBy = Column(String, nullable=True)
    createdDateTime = Column(DateTime, default=datetime.datetime.utcnow)
    updatedDateTime = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


    @staticmethod
    def copyToModel(inventory):
        inventoryModel = InventoryModel(**inventory.__dict__)
        inventoryModel.__dict__.pop("_sa_instance_state", None)
        return inventoryModel

    @staticmethod
    def copyFromModel(inventoryModel):
        return Inventory(**inventoryModel.dict(exclude_unset=True))

    @staticmethod
    def copyToModels(inventories):
        inventoryModels = [InventoryModel(**item.__dict__) for item in inventories]
        for model in inventoryModels:
            model.__dict__.pop("_sa_instance_state", None)
        return inventoryModels

    @staticmethod
    def copyFromModels(inventoryModels):
        return [Inventory(**model.dict(exclude_unset=True)) for model in inventoryModels]

