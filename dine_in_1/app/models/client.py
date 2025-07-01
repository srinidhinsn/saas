from sqlalchemy import Column, String, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    company_name = Column(String)
    contact_number = Column(String)
    email = Column(String)
    client_code = Column(String, unique=True, index=True)
    services = Column(String)  # Store as comma-separated or JSON
    enabled_features = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    duration = Column(String)
