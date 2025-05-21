from pydantic import BaseModel
from typing import Optional

class SaasModel(BaseModel):
    clientid: Optional[str] = None
    roles: List[str] = []  # Now an array of strings
    grants: List[str] = []
    userid: Optional[str] = None
    module: Optional[str] = None



class UserRequest(SaasModel):
    username: str
    password: str