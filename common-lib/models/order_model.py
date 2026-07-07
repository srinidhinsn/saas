from pydantic import BaseModel
from typing import Optional, List
import datetime
from enum import Enum
import os, re
from dotenv import load_dotenv
from functools import lru_cache

load_dotenv()

class OrderStatusEnum(str, Enum):
    draft = "draft"
    pending = "pending"
    preparing = "preparing"
    ready = "ready"
    served = "served"
    cancelled = "cancelled"
    completed = "completed"

_BASE_STATUS_KEYS: List[str] = list(OrderStatusEnum.__members__)

_REALM_ENV_PATTERN = re.compile(
    r"^ORDERSTATUS_(.+)_(" + "|".join(k.upper() for k in _BASE_STATUS_KEYS) + r")$"
) 

@lru_cache(maxsize=None)
def _discover_realms():
    realms = set()
    for env_key in os.environ:
        m = _REALM_ENV_PATTERN.match(env_key)
        if m:
            realms.add(m.group(1).lower())
    return frozenset(realms)

@lru_cache(maxsize=None)
def get_order_status_enum(realm):
    realm_key = (realm or "").strip().upper()
    prefix = f"ORDERSTATUS_{realm_key}_"

    members = {
        status_key: os.getenv(f"{prefix}{status_key.upper()}", status_key)
        for status_key in _BASE_STATUS_KEYS
    }
    return Enum(f"OrderStatusEnum_{realm_key or 'DEFAULT'}", members, type=str)

def resolve_realm_from_context(context):
    known_realms = _discover_realms()
    grants = getattr(context, "grants", None) or []
    for g in grants:
        if isinstance(g, str) and g.lower() in known_realms:
            return g.lower()
    return None

def resolve_base_status(context, realm_status_value):
    if realm_status_value is None:
        return None
    realm = resolve_realm_from_context(context)
    if not realm:
        return realm_status_value
    try:
        realm_enum = get_order_status_enum(realm)
        for member in realm_enum:
            if member.value == realm_status_value:
                return member.name
    except Exception:
        pass
    return realm_status_value

class TransactionTypeEnum(str, Enum):
    order_deduction = "ORDER_DEDUCTION"
    menu_item_deduction = "MENU_ITEM_DEDUCTION"
    item_cancelled = "ITEM_CANCELLED"
    wastage = "WASTAGE"
    order_cancelled = "ORDER_CANCELLED"
    combo_child_wastage = "COMBO_CHILD_WASTAGE"
    combo_child_cancelled = "COMBO_CHILD_CANCELLED"
    recipe_cancel = "RECIPE_CANCEL"
    ingredient_reversal = "INGREDIENT_REVERSAL"


class MovementTypeEnum(str, Enum):
    out = "OUT"
    reversal = "REVERSAL"
    none = "NONE"


class OrderItemModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    order_id: Optional[int] = None
    item_id: Optional[int] = None
    item_name: Optional[str] = None
    slug: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    line_total: Optional[float] = None
    status: Optional[str] = None
    frontend_unique_key: Optional[str] = None

    class Config:
        orm_mode = True


class DineinOrderModel(BaseModel):
    id: Optional[int] = None
    client_id: Optional[str] = None
    dinein_order_id: Optional[str] = None
    table_id: Optional[int] = None
    invoice_id: Optional[str] = None
    handler_id: Optional[str] = None
    invoice_status: Optional[str] = None
    price: Optional[float] = None
    cst: Optional[float] = None
    gst: Optional[float] = None
    discount: Optional[float] = None
    total_price: Optional[float] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    status: Optional[str] = None
    items: Optional[List[OrderItemModel]] = []
    customer_id: Optional[str] = None
    delivery_address: Optional[str] = None

    class Config:
        orm_mode = True
