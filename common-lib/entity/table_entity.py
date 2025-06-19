from sqlalchemy import Column, BigInteger, Text, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
import uuid

# common-lib imports
from database.base import Base
from models.table_model import Table

class DiningTable(Base):
    __tablename__  = "tables"

    id             = Column(BigInteger, primary_key=True, index=True)
    client_id      = Column(Text, nullable=True)
    table_number   = Column(Text, nullable=True)
    table_type     = Column(Text, nullable=True)
    status         = Column(Text, nullable=True, default="Vacant")
    location_zone  = Column(Text, nullable=True)
    qr_code_url    = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=func.now())
    updated_at     = Column(DateTime, default=func.now(), onupdate=func.now())

    @staticmethod
    def copyToModel(table): 
        model = Table(**table.__dict__)
        model.__dict__.pop("_sa_instance_state", None)
        return model

    @staticmethod
    def copyToModels(tables):
        models = [Table(**table.__dict__) for table in tables]
        for m in models:
            m.__dict__.pop("_sa_instance_state", None)
        return models
    


