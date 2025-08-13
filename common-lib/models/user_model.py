from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import date

class ResetpasswordRequest(BaseModel):
    old_password: str
    new_password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class PersonModel(BaseModel):
    id: Optional[UUID] = None
    client_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        orm_mode = True

class UserModel(PersonModel):
    id: Optional[UUID] = None
    client_id: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    roles: Optional[List[str]] = []
    grants: Optional[List[str]] = []
    hashed_password: Optional[str] = None

    class Config:
        orm_mode = True



class PageDefinitionModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    module: Optional[str] = None
    operations: Optional[list[str]] = []
    role: Optional[str] = None
    screen_id: Optional[str] = None
    load_type: Optional[str] = None


