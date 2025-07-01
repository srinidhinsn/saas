from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, Boolean, Date, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base


class Client(Base):
    __tablename__ = "clients"

    # Primary key (UUID)
    id = Column(UUID(as_uuid=True), primary_key=True,
                index=True, default=uuid.uuid4)

    # Basic Info
    name = Column(String)
    company_name = Column(String)
    location = Column(String)
    contact_number = Column(String)

    # Company Details
    company_number = Column(String)
    company_address = Column(Text)
    client_address = Column(Text)

    # Legal Identifiers
    fssai_number = Column(String)
    gst_number = Column(String)
    pan_number = Column(String)
    aadhar_number = Column(String)
    license_number = Column(String)
    food_license_number = Column(String)

    # Contact
    email = Column(String)
    website = Column(String)

    # External Client ID (custom code for UI)
    client_code = Column(String, unique=True, index=True)

    # Billing Info
    bill_paid = Column(Boolean, default=False)
    bill_due_date = Column(Date, nullable=True)
    last_name = Column(String)
    dob = Column(Date)
    gender = Column(String)
    city = Column(String)
    state = Column(String)
    country = Column(String)
    country_code = Column(String)
    password = Column(String)  # Store hashed

    services = Column(String, nullable=True)
    enabled_features = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    duration = Column(Integer, nullable=True)


class ClientUser(Base):
    __tablename__ = "client_users"

    id = Column(UUID(as_uuid=True), primary_key=True,
                index=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey(
        "clients.id"))  # FK to Client

    name = Column(String)
    customer_number = Column(String)
    review = Column(Text)
    address = Column(Text)
    email = Column(String)
    rating = Column(Integer)
    password = Column(String)  # ✅ Add this to store hashed passwords

    created_at = Column(TIMESTAMP, server_default=func.now())


class ClientService(Base):
    __tablename__ = "client_services"

    id = Column(UUID(as_uuid=True), primary_key=True,
                index=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"))
    service_name = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    duration = Column(Integer)
