from typing import List, Dict, Any
from sqlalchemy.orm import Session
from entity.order_entity import DineinOrder as DBOrder, OrderItem as DBOrderItem
from entity.order_entity import DineinOrder as Db_Order_Entity, OrderItem as Db_OrderItem_Entity

# # from .billing_client import push_order_to_billing
# from billing_client import push_order_to_billing_public

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


# ── Private helpers ─────────────────────────────────────────────────────────

def _root_dinein_id(dinein_order_id: str) -> str:
    """Return the root part of a dinein_order_id.  "1001-2" → "1001" """
    return dinein_order_id.split("-")[0] if dinein_order_id else dinein_order_id


STATUS_PRIORITY = {"new": 0, "pending": 1, "preparing": 2, "ready": 3, "served": 4}


def _order_row_to_flat(order) -> dict:
    """Convert a single DB order row to a flat dict for KDS (no merging)."""
    items = []
    for item in order.items:
        m = Db_OrderItem_Entity.copyToModel(item).dict()
        items.append(m)
    return {
        "id": order.id,
        "dinein_order_id": order.dinein_order_id,
        "table_id": order.table_id,
        "client_id": order.client_id,
        "status": order.status,
        "created_at": order.created_at,
        "items": items,
        "total_price": order.total_price or 0,
        "is_sub_order": "-" in (order.dinein_order_id or ""),
    }


def _merge_group(orders: list) -> dict:
    """
    Merge root + sub-order DB rows into one response dict for /dinein/table.
    Used by TakeOrder floor view to show one entry per table group.
    Includes sub_orders metadata so the frontend can calculate:
      - timer (root created_at)
      - order count (len(sub_orders) + 1)
      - total price (sum of all items unit_price * quantity)
    Items carry batch_label and sub_order_id for the view-order cart reconstruction.
    """
    orders = sorted(orders, key=lambda o: o.created_at or 0)
    root = orders[0]
    merged_items = []
    for order in orders:
        for item in order.items:
            m = Db_OrderItem_Entity.copyToModel(item).dict()
            m["batch_label"] = order.dinein_order_id
            m["sub_order_id"] = order.id
            merged_items.append(m)

    statuses = [o.status for o in orders if o.status]
    overall = min(statuses, key=lambda s: STATUS_PRIORITY.get(s, 99)) if statuses else "pending"

    # sub_orders metadata for TakeOrder (timer, count, price)
    sub_orders_meta = [
        {
            "id": o.id,
            "dinein_order_id": o.dinein_order_id,
            "created_at": o.created_at,
            "status": o.status,
            "total_price": o.total_price or 0,
        }
        for o in orders
    ]

    # Total price = sum of all items' unit_price * quantity (no GST/CST)
    total_price = sum(
        (item.unit_price or 0) * (item.quantity or 1)
        for order in orders
        for item in order.items
    )

    return {
        "id": root.id,
        "dinein_order_id": root.dinein_order_id,
        "table_id": root.table_id,
        "client_id": root.client_id,
        "status": overall,
        "created_at": root.created_at,          # oldest = root timer
        "items": merged_items,
        "total_price": total_price,
        "item_names": [i.get("item_name", "") for i in merged_items],
        "sub_orders": sub_orders_meta,           # for TakeOrder count + timer
        "order_count": len(orders),              # total batches incl. root
    }

# ───────────────────────────────────────────────────────────────────────────
