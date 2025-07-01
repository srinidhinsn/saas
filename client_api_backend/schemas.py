from typing import Optional
from pydantic import BaseModel, model_validator, field_validator
from typing import Optional, List
from datetime import date
from uuid import UUID
import re

# ---------- Shared Base ----------


class ClientBase(BaseModel):
    name: str
    company_name: str
    location: Optional[str]
    contact_number: str
    email: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if len(v) > 20:
            raise ValueError("First name must be at most 20 characters")
        return v

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Company name is required")
        return v


# ---------- Client Create ----------

class ClientCreate(BaseModel):
    name: str
    company_name: str
    contact_number: str
    email: str
    password: str
    confirm_password: str

    location: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None

    company_number: Optional[str] = None
    company_address: Optional[str] = None
    client_address: Optional[str] = None
    fssai_number: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    aadhar_number: Optional[str] = None
    license_number: Optional[str] = None
    food_license_number: Optional[str] = None
    website: Optional[str] = None
    bill_paid: Optional[bool] = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if len(v) > 20:
            raise ValueError("First name must be at most 20 characters")
        return v

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Company name is required")
        return v

    @field_validator("last_name")
    @classmethod
    def validate_last_name(cls, v):
        if v and len(v) > 10:
            raise ValueError("Last name must be at most 10 characters")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if len(v) > 30:
            raise ValueError("Email must be at most 30 characters")
        return v

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, v):
        if v and v > date(2010, 1, 1):
            raise ValueError("DOB must be before 2010")
        return v

    @field_validator("company_address", "client_address")
    @classmethod
    def validate_addresses(cls, v):
        if v and len(v) > 200:
            raise ValueError("Address must be at most 200 characters")
        return v

    @field_validator("city", "state", "country")
    @classmethod
    def validate_location_fields(cls, v):
        if v and len(v) > 30:
            raise ValueError("Must be at most 30 characters")
        return v

    @field_validator("contact_number", "company_number")
    @classmethod
    def validate_phone_numbers(cls, v):
        if v and not re.fullmatch(r"\d{10}", v):
            raise ValueError("Number must be exactly 10 digits")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[^\w\s]", v):
            raise ValueError(
                "Password must include at least one special character")
        return v

    @model_validator(mode="after")
    def validate_passwords(cls, values):
        if values.password != values.confirm_password:
            raise ValueError("Passwords do not match")
        return values

# ---------- Client Update ----------


class ClientUpdate(BaseModel):
    name: Optional[str]
    last_name: Optional[str]
    dob: Optional[date]
    gender: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    country_code: Optional[str]

    company_name: Optional[str]
    location: Optional[str]
    contact_number: Optional[str]
    company_number: Optional[str]
    company_address: Optional[str]
    client_address: Optional[str]

    fssai_number: Optional[str]
    gst_number: Optional[str]
    pan_number: Optional[str]
    aadhar_number: Optional[str]
    license_number: Optional[str]
    food_license_number: Optional[str]

    email: Optional[str]
    website: Optional[str]
    bill_paid: Optional[bool]
    bill_due_date: Optional[date]

    class Config:
        from_attributes = True


# ---------- Client Output (Safe Response) ----------

class ClientOut(BaseModel):
    id: UUID
    name: str
    last_name: Optional[str]
    company_name: str
    location: Optional[str]
    contact_number: str
    company_number: Optional[str]
    company_address: Optional[str]
    client_address: Optional[str]
    fssai_number: Optional[str]
    gst_number: Optional[str]
    pan_number: Optional[str]
    aadhar_number: Optional[str]
    license_number: Optional[str]
    food_license_number: Optional[str]
    email: str
    website: Optional[str]
    bill_paid: Optional[bool]
    bill_due_date: Optional[date]
    client_code: Optional[str]
    dob: Optional[date]
    gender: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    country_code: Optional[str]

    class Config:
        from_attributes = True


# ---------- ClientUser ----------

class ClientUserBase(BaseModel):
    name: str
    last_name: Optional[str]
    customer_number: str
    email: Optional[str]
    dob: Optional[date]
    gender: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    password: Optional[str]
    review: str
    rating: int

    # 🔐 Optional: Validate password if present
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if v is not None:
            if len(v) < 8:
                raise ValueError("Password must be at least 8 characters")
            if not re.search(r"[^\w\s]", v):
                raise ValueError(
                    "Password must include at least one special character")
        return v

    @field_validator("email")
    @classmethod
    def validate_email_length(cls, v):
        if v and len(v) > 50:
            raise ValueError("Email must be at most 50 characters")
        return v

    @field_validator("address", "city", "state", "country")
    @classmethod
    def validate_string_lengths(cls, v):
        if v and len(v) > 100:
            raise ValueError("Field exceeds maximum character length (100)")
        return v


class ClientUser(BaseModel):
    id: UUID
    client_id: UUID
    name: str
    customer_number: str
    review: str
    rating: int

    # 🛠 THESE MUST BE OPTIONAL to avoid 500 errors
    last_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    password: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class ClientUserCreate(ClientUserBase):
    pass

# ---------- Service Assignment ----------


class ServiceAssignment(BaseModel):
    client_id: UUID
    services: List[str]
    features: List[str]
    start_date: date
    end_date: date
    duration: str


class LoginRequest(BaseModel):
    client_code: str
    username: str
    password: str


class LoginResponse(BaseModel):
    client_id: str
    client_code: str
    username: str
