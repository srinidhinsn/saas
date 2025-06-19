from typing import List, Optional
from pydantic import BaseModel
import contextvars
from models.user_model import PageDefinitionModel

saasContext = contextvars.ContextVar("saasContext", default={})

class SaasContext(BaseModel):
    client_id: Optional[str] = None
    roles: List[str] = []
    grants: List[str] = []
    userId: Optional[str] = None
    module: Optional[str] = None
    operation: Optional[str] = None
    screenId: Optional[str] = None

    def __init__(self, client_id: Optional[str] = None, module: Optional[str] = None, operation: Optional[str] = None,
                 userId: Optional[str] = None, roles: List[str] = None, grants: List[str] = None, screenId: Optional[str] = None):
        roles = roles or []
        grants = grants or []
        super().__init__(client_id=client_id, module=module, operation=operation, userId=userId, roles=roles, grants=grants, screenId=screenId)