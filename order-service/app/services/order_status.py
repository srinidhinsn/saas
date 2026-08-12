from typing import Optional
from models.order_model import get_order_status_enum, resolve_realm_from_context


def _status_label(context, status) -> Optional[str]:
    if status is None:
        return None
    status_key = status.value if hasattr(status, "value") else str(status)
    realm = resolve_realm_from_context(context)
    if not realm:
        return status_key
    try:
        realm_enum = get_order_status_enum(realm)
        return realm_enum[status_key].value
    except KeyError:
        return status_key
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