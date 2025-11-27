from typing import List, Dict, Any
from sqlalchemy.orm import Session
from entity.order_entity import DineinOrder as DBOrder, OrderItem as DBOrderItem
# from .billing_client import push_order_to_billing
from billing_client import push_order_to_billing_public

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




# # services/inventory_update_service.py
# from sqlalchemy.orm import Session
# from entity.inventory_entity import InventoryEntity
# from entity.inventory_entity import MenuInventoryLink
# from entity.order_entity import OrderItem

# def deduct_inventory_after_order(client_id: str, order_id: int, db: Session):
#     # Get all order items for that order
#     order_items = db.query(OrderItem).filter(
#         OrderItem.client_id == client_id,
#         OrderItem.order_id == order_id
#     ).all()

#     for item in order_items:
#         # Find mapped ingredients for that menu item
#         mappings = db.query(MenuInventoryLink).filter(
#             MenuInventoryLink.client_id == client_id,
#             MenuInventoryLink.menu_item_id == item.item_id
#         ).all()

#         for map_entry in mappings:
#             total_required = (map_entry.quantity_required or 0) * (item.quantity or 1)

#             inv = db.query(InventoryEntity).filter(
#                 InventoryEntity.id == map_entry.inventory_id,
#                 InventoryEntity.client_id == client_id
#             ).first()

#             if inv and inv.availability is not None:
#                 inv.availability = max(inv.availability - total_required, 0)
#                 db.add(inv)

#     db.commit()

# def restore_inventory_after_cancellation(client_id: str, order_id: int, db: Session):
#     order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
#     for item in order_items:
#         mappings = db.query(MenuInventoryLink).filter(
#             MenuInventoryLink.menu_item_id == item.item_id,
#             MenuInventoryLink.client_id == client_id
#         ).all()

#         for map_entry in mappings:
#             total_restore = (map_entry.quantity_required or 0) * (item.quantity or 1)
#             inv = db.query(InventoryEntity).filter(
#                 InventoryEntity.id == map_entry.inventory_id,
#                 InventoryEntity.client_id == client_id
#             ).first()
#             if inv:
#                 inv.availability += total_restore
#                 db.add(inv)
#     db.commit()


