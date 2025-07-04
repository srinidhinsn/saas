from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    clientid: Optional[str] = None
    username: str
    password: str
    role: str
    email: str
    phone: str

class LoginInput(BaseModel):
    clientid: str
    username: str
    password: str
    role: str

class ForgotPasswordInput(BaseModel):
    clientid: str
    username: str
    role: str
    method: str

class ResetPassword(BaseModel):
    clientid: str
    role: str
    username: str
    otp: str
    new_password: str

class OTPVerifyRequest(BaseModel):
    clientid: str
    otp: str
