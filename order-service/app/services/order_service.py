from typing import List, Dict, Any
from sqlalchemy.orm import Session
from entity.order_entity import DineinOrder as DBOrder, OrderItem as DBOrderItem
# from .billing_client import push_order_to_billing
from .billing_client import push_order_to_billing_public

# def build_billing_payload_from_order(order: DBOrder, items: List[DBOrderItem]) -> Dict[str, Any]:
#     """
#     Maps your order + items to a compact payload understood by billing-service.
#     """
#     return {
#         "client_id": order.client_id,
#         "order_id": str(order.id),
#         "table_id": order.table_id,
#         "totals": {
#             "price":       float(order.price or 0.0),
#             "gst":         float(order.gst or 0.0),
#             "cst":         float(order.cst or 0.0),
#             "discount":    float(order.discount or 0.0),
#             "total_price": float(order.total_price or 0.0),
#         },
#         "items": [
#             {
#                 "item_id":   itm.item_id,
#                 "item_name": getattr(itm, "item_name", None),
#                 "slug":      itm.slug,
#                 "quantity":  int(itm.quantity or 0),
#             } for itm in items
#         ],
#     }

# def sync_served_order_to_billing(order: DBOrder) -> dict:
#     """
#     Builds payload from the given order and pushes it to billing-service.
#     Safe to call right after you mark an order as 'served'.
#     Returns billing response or raises on HTTP errors.
#     """
#     items = list(order.items)  # relationship
#     payload = build_billing_payload_from_order(order, items)
#     return push_order_to_billing(payload)



def build_billing_payload_from_order(order: DBOrder, items: List[DBOrderItem]) -> Dict[str, Any]:
    """
    Map order-service DB entities to billing intake payload.
    """
    return {
        "client_id": order.client_id,
        "order_id": str(order.id),
        "table_id": order.table_id,
        "totals": {
            "price": float(order.price or 0.0),
            "gst": float(order.gst or 0.0),
            "cst": float(order.cst or 0.0),
            "discount": float(order.discount or 0.0),
            "total_price": float(order.total_price or 0.0),
        },
        "items": [
            {
                "item_id":   itm.item_id,
                "item_name": getattr(itm, "item_name", None),
                "slug":      getattr(itm, "slug", None),
                "quantity":  int(itm.quantity or 0),
                "unit_price": itm.unit_price,
                "line_total": itm.line_total
            } for itm in items
        ],
    }

def sync_served_order_to_billing_public(order: DBOrder, user_jwt: str) -> dict:
    """
    Build payload and call billing public endpoint with the user's JWT.
    """
    payload = build_billing_payload_from_order(order, list(order.items))
    return push_order_to_billing_public(order.client_id, user_jwt, payload)

