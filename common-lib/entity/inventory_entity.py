from sqlalchemy import Column, Integer, BigInteger, Text, DateTime, Float, func, ARRAY, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base
from models.inventory_model import Inventory, Category
from typing import List

class InventoryEntity(Base):
    __tablename__ = "inventory"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    client_id = Column(Text, nullable=False)

    # 1 => menu, 2 => stock (as requested)
    inventory_id = Column(BigInteger, nullable=True)

    # For compatibility: list of linked stock IDs (menu -> stock IDs)
    line_item_id = Column(ARRAY(BigInteger), nullable=True)

    # Structured recipe data (list of {"stock_item_id": int, "quantity_required": numeric, "unit": text})
    recipe = Column(JSONB, nullable=True, default=[])

    name = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    category_id = Column(Text, nullable=True)
    realm = Column(Text, nullable=True)

    # menu item serving qty (eg 250) and unit (eg 'ml') or for stock item it can be unused
    serving_quantity = Column(Float, nullable=True)
    serving_unit = Column(Text, nullable=True)

    # availability should allow decimals -> Numeric
    availability = Column(Numeric(18,6), default=0)

    unit = Column(Text, nullable=True)
    image_id = Column(Text, nullable=True)
    unit_price = Column(Float, nullable=True)
    unit_cst = Column(Float, nullable=True)
    unit_gst = Column(Float, nullable=True)
    unit_total_price = Column(Float, nullable=True)
    price = Column(Float, nullable=True)
    cst = Column(Float, nullable=True)
    gst = Column(Float, nullable=True)
    discount = Column(Float, nullable=True)
    total_price = Column(Float, nullable=True)
    slug = Column(Text, nullable=True)
    created_by = Column(Text, nullable=True)
    updated_by = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    @staticmethod
    def copyToModel(row):
        model = Inventory(**row.__dict__)
        model.__dict__.pop("_sa_instance_state", None)
        return model

    @staticmethod
    def copyToModels(rows):
        models = [Inventory(**row.__dict__) for row in rows]
        for m in models:
            m.__dict__.pop("_sa_instance_state", None)
        return models


class CategoryEntity(Base):
    __tablename__ = "category"

    id = Column(Text, primary_key=True)
    client_id = Column(Text, nullable=False)
    name = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    sub_categories = Column(ARRAY(Text), nullable=True)
    slug = Column(Text, nullable=True)
    created_by = Column(Text, nullable=True)
    updated_by = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    @staticmethod
    def copyToModel(row):
        model = Category(**row.__dict__)
        model.__dict__.pop("_sa_instance_state", None)
        return model

    @staticmethod
    def copyToModels(rows):
        models = [Category(**row.__dict__) for row in rows]
        for m in models:
            m.__dict__.pop("_sa_instance_state", None)
        return models
