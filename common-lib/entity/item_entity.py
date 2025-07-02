from sqlalchemy import Column, String, Text, Boolean, BigInteger, Integer, DateTime, Numeric, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from database.base import Base
from models.item_model import ItemCategoryModel, ItemModel

class ItemCategoryEntity(Base):
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
    created_at  = Column(DateTime, default=func.now())
    updated_at  = Column(DateTime, default=func.now(), onupdate=func.now())

    @staticmethod
    def copyToModel(category):
        model = ItemCategoryModel(**category.__dict__)
        model.__dict__.pop("_sa_instance_state", None)
        return model

    @staticmethod
    def copyToModels(categories):
        models = [ItemCategoryModel(**cat.__dict__) for cat in categories]
        for m in models:
            m.__dict__.pop("_sa_instance_state", None)
        return models

class ItemEntity(Base):
    __tablename__ = "items"

    id               = Column(BigInteger, primary_key=True, autoincrement=True)
    client_id        = Column(Text, nullable=False)
    name             = Column(Text, nullable=False)
    slug             = Column(Text, unique=True, nullable=True)
    category_id      = Column(BigInteger, ForeignKey("item_categories.id", ondelete="SET NULL"), nullable=True)
    item_code        = Column(Text, unique=True, nullable=True)
    description      = Column(Text, nullable=True)
    image_url        = Column(Text, nullable=True)
    price            = Column(Numeric(10, 2), nullable=False)
    
    # GST-specific
    cgst_percent     = Column(Numeric(5, 2), nullable=True, default=0.0)
    sgst_percent     = Column(Numeric(5, 2), nullable=True, default=0.0)
    igst_percent     = Column(Numeric(5, 2), nullable=True, default=0.0)
    
    discount         = Column(Numeric(10, 2), nullable=True, default=0.0)
    preparation_time = Column(Text, nullable=True)
    is_veg           = Column(Boolean, nullable=True)
    is_available     = Column(Boolean, nullable=False, default=True)
    sort_order       = Column(Integer, nullable=True)
    kds_section      = Column(Text, nullable=True)
    is_active        = Column(Boolean, nullable=False, default=True)
    created_by       = Column(Text, nullable=True)
    updated_by       = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=func.now())
    updated_at       = Column(DateTime, default=func.now(), onupdate=func.now())

    @staticmethod
    def copyToModel(item):
        model = ItemModel(**item.__dict__)
        model.__dict__.pop("_sa_instance_state", None)
        return model

    @staticmethod
    def copyToModels(items):
        models = [ItemModel(**item.__dict__) for item in items]
        for m in models:
            m.__dict__.pop("_sa_instance_state", None)
        return models


