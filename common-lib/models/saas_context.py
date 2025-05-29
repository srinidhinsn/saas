from typing import List, Optional
from pydantic import BaseModel
import contextvars

saasContext = contextvars.ContextVar("saasContext", default={})


class SaasContext(BaseModel):
    clientId: Optional[str] = None
    roles: List[str] = []
    grants: List[str] = []
    userId: Optional[str] = None
    module: Optional[str] = None
    operation: Optional[str] = None

    def __init__(self, clientId: Optional[str] = None, module: Optional[str] = None, operation: Optional[str] = None,
                 userId: Optional[str] = None, roles: List[str] = None, grants: List[str] = None):
        roles = roles or []
        grants = grants or []
        super().__init__(clientId=clientId, module=module, operation=operation, userId=userId, roles=roles, grants=grants)