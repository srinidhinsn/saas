from sqlalchemy import Column, Text, DateTime, func, ARRAY,String,TIMESTAMP,BigInteger
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database.base import Base
from models.client_model import ClientModel, AddressModel


class Client(Base):
    __tablename__ = "client"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    realm = Column(Text)
    email = Column(Text, unique=True, nullable=True)
    phone = Column(Text, nullable=True)
    logo = Column(Text, nullable=True)
    saved_address_ids = Column(ARRAY(Text), nullable=True)
    created_date_time = Column(DateTime, default=func.now())
    updated_date_time = Column(DateTime, default=func.now(), onupdate=func.now())


    @staticmethod
    def copyToModel(client):
        model = ClientModel(**client.__dict__)
        model.__dict__.pop("_sa_instance_state", None)
        return model

class Address(Base):
    __tablename__ = "address"  

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    address_line1 = Column(String, nullable=False)  
    address_line2 = Column(String, nullable=False)  
    city = Column(String, nullable=False)  
    country = Column(String, nullable=False)  
    state = Column(String, nullable=False)  
    pincode = Column(String, nullable=False)  
    contact_name  = Column(String, nullable=False)  
    contact_number   = Column(String, nullable=False)  
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now())  
    
    @staticmethod
    def copyToModel(address):
        model=AddressModel(**address.__dict__)
        model.__dict__.pop("_sa_instance_state",None)
        return model
