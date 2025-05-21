from pydantic import BaseModel

class SaasModel(BaseModel):
    clientid: str | None = None
    roles: str | None = None
    grants: str | None = None
    userid: str | None = None
    module: str | None = None


class UserRequest(SaasModel):
    username: str
    password: str