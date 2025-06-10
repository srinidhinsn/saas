from pydantic import BaseModel
from typing import List, Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class UserModel(BaseModel):
    id: Optional[int] = None
    clientId: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    roles: Optional[List[str]] = []
    grants: Optional[List[str]] = []
    hashed_password: Optional[str] = None



class PageDefinitionModel(BaseModel):
    id: Optional[int] = None
    clientId: Optional[str] = None
    module: Optional[str] = None
    operations: Optional[list[str]] = []
    role: Optional[str] = None
    screenId: Optional[str] = None
    loadType: Optional[str] = None


