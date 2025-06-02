from pydantic import BaseModel
from typing import List, Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class UserModel(BaseModel):
    id: int
    clientId: Optional[str]
    username: Optional[str]
    roles: Optional[list[str]] = []
    grants: Optional[list[str]] = []
    hashed_password: Optional[str]


class PageDefinitionModel(BaseModel):
    id: int
    clientId: Optional[str]
    module: Optional[str]
    operations: Optional[list[str]] = []
    role: Optional[str]
    screenId: Optional[str]
    loadType: Optional[str]


