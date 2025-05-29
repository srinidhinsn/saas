from pydantic import BaseModel
from typing import List


class LoginRequest(BaseModel):
    username: str
    password: str


class UserModel(BaseModel):
    id: str
    username: str
    password: str
    roles: List[str]
    grants: List[str]

