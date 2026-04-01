from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from entity.order_entity import DineinOrder as DBOrder, OrderItem as DBOrderItem
from entity.order_entity import DineinOrder as Db_Order_Entity, OrderItem as Db_OrderItem_Entity
from entity.inventory_entity import InventoryEntity, InventoryTransactionEntity
from decimal import Decimal
import uuid


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
            if (item.status or "").lower() == "cancelled":  # skip cancelled items
                continue
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

    # Total price = sum of active (non-cancelled) items only
    total_price = sum(
        (item.get("unit_price") or 0) * (item.get("quantity") or 1)
        for item in merged_items
    )

    return {
        "id": root.id,
        "dinein_order_id": root.dinein_order_id,
        "table_id": root.table_id,
        "client_id": root.client_id,
        "status": overall,
        "created_at": root.created_at,
        "items": merged_items,
        "total_price": total_price,
        "item_names": [i.get("item_name", "") for i in merged_items],
        "sub_orders": sub_orders_meta,
        "order_count": len(orders),
    }
# ───────────────────────────────────────────────────────────────────────────


UNIT_TO_BASE = {
    "g":     1,
    "kg":    1000,
    "ml":    1,
    "litre": 1000,
    "pcs":   1,
}

WEIGHT_UNITS  = {"g", "kg"}
VOLUME_UNITS  = {"ml", "litre"}
COUNT_UNITS   = {"pcs"}


def _convert(recipe_qty: float, recipe_unit: str, stock_unit: str) -> float:
    """
    Convert recipe_qty from recipe_unit into stock_unit.

    Examples:
      30g   → kg  : (30 * 1) / 1000  = 0.03
      500ml → litre: (500 * 1) / 1000 = 0.5
      2kg   → g   : (2 * 1000) / 1    = 2000
      5pcs  → pcs : 5
    """
    ru, su = recipe_unit.strip(), stock_unit.strip()

    if ru == su:
        return recipe_qty

    # Both units must be known and in the same dimension
    if ru not in UNIT_TO_BASE or su not in UNIT_TO_BASE:
        raise ValueError(f"Unknown unit: recipe='{ru}', stock='{su}'")

    for group in (WEIGHT_UNITS, VOLUME_UNITS, COUNT_UNITS):
        if ru in group and su in group:
            return (recipe_qty * UNIT_TO_BASE[ru]) / UNIT_TO_BASE[su]

    raise ValueError(f"Incompatible unit dimensions: recipe='{ru}', stock='{su}'")


# -------------------- STOCK DEDUCTION --------------------

def _record_transaction(
    db: Session,
    *,
    client_id: str,
    stock_item_id: int,
    inventory_id: Optional[str],
    name: Optional[str],
    transaction_type: str,
    movement_type: str,
    quantity: Decimal,
    unit: Optional[str],
    before_stock: Decimal,
    after_stock: Decimal,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None,
    created_by: Optional[str] = None,
    remarks: Optional[str] = None,
) -> InventoryTransactionEntity:
    tx = InventoryTransactionEntity(
        transaction_id=str(uuid.uuid4()),
        client_id=client_id,
        stock_item_id=stock_item_id,
        inventory_id=inventory_id,
        name=name,
        transaction_type=transaction_type,
        movement_type=movement_type,
        quantity=quantity,
        unit=unit,
        before_stock=before_stock,
        after_stock=after_stock,
        reference_id=reference_id,
        reference_type=reference_type,
        created_by=created_by,
        remarks=remarks,
    )
    db.add(tx)
    return tx
 


def _deduct_stock_for_order(db: Session, client_id: str, order_id: int) -> None:
    """
    Called exactly once when the whole order transitions to 'served'.
    Two deductions per order item:
      1. Menu item itself  → deduct (serving_quantity in serving_unit → converted to stock unit) × ordered_qty
                             from the menu item's own availability in InventoryEntity
      2. Ingredients       → deduct (recipe qty converted × ordered_qty) from each linked stock item
    Both are idempotent via remarks-based dedup keys.
    """
    order_items = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.order_id == order_id,
            Db_OrderItem_Entity.client_id == client_id,
        )
        .all()
    )

    # Fetch all dedup keys already recorded for this order (both deduction types)
    already_deducted_keys: set[str] = set(
        row.remarks
        for row in db.query(InventoryTransactionEntity.remarks).filter(
            InventoryTransactionEntity.reference_id == str(order_id),
            InventoryTransactionEntity.reference_type == "order",
            InventoryTransactionEntity.transaction_type.in_([
                "ORDER_DEDUCTION",
                "MENU_ITEM_DEDUCTION",
            ]),
        ).all()
        if row.remarks
    )

    for order_item in order_items:
        menu_item = (
            db.query(InventoryEntity)
            .filter(
                InventoryEntity.id == order_item.item_id,
                InventoryEntity.client_id == client_id,
            )
            .first()
        )

        if not menu_item:
            continue

        ordered_qty = order_item.quantity or 1

        # ------------------------------------------------------------------ #
        # 1. MENU ITEM SELF-DEDUCTION                                         #
        #    serving_quantity (in serving_unit) → convert to stock unit       #
        #    then × ordered_qty → deduct from menu_item.availability          #
        # ------------------------------------------------------------------ #
        serving_qty  = float(menu_item.serving_quantity or 0)
        serving_unit = (menu_item.serving_unit or "").strip()
        stock_unit   = (menu_item.unit or "").strip()

        if serving_qty > 0 and serving_unit and stock_unit:
            menu_dedup_key = (
                f"Menu item deduction Order #{order_id} — "
                f"{order_item.item_name} x{ordered_qty} "
                f"[key={order_item.frontend_unique_key}]"
            )

            if menu_dedup_key not in already_deducted_keys:
                try:
                    converted_serving = _convert(serving_qty, serving_unit, stock_unit)
                except ValueError as e:
                    print(f"[WARN] Skipping menu item deduction for item_id={menu_item.id}: {e}")
                    converted_serving = None

                if converted_serving is not None:
                    total_menu_deduction = Decimal(str(round(converted_serving * ordered_qty, 6)))
                    before_stock = Decimal(str(menu_item.availability or 0))
                    after_stock  = max(before_stock - total_menu_deduction, Decimal("0"))

                    _record_transaction(
                        db,
                        client_id=client_id,
                        stock_item_id=menu_item.id,
                        inventory_id=menu_item.inventory_id,
                        name=menu_item.name,
                        transaction_type="MENU_ITEM_DEDUCTION",
                        movement_type="OUT",
                        quantity=total_menu_deduction,
                        unit=stock_unit,
                        before_stock=before_stock,
                        after_stock=after_stock,
                        reference_id=str(order_id),
                        reference_type="order",
                        remarks=menu_dedup_key,
                    )

                    menu_item.availability = after_stock
                    already_deducted_keys.add(menu_dedup_key)  # in-session guard

        elif serving_qty > 0:
            # serving_unit or stock_unit is missing — log and skip safely
            print(
                f"[WARN] Skipping menu item deduction for item_id={menu_item.id} "
                f"'{menu_item.name}': serving_unit='{serving_unit}' stock_unit='{stock_unit}'"
            )

        # ------------------------------------------------------------------ #
        # 2. INGREDIENT DEDUCTION (existing logic, unchanged)                 #
        # ------------------------------------------------------------------ #
        if not menu_item.recipe:
            continue

        for ingredient in menu_item.recipe:
            stock_item_id = ingredient.get("stock_item_id")
            recipe_qty    = float(ingredient.get("quantity_required") or 0)
            recipe_unit   = (ingredient.get("unit") or "").strip()

            if not stock_item_id or recipe_qty <= 0:
                continue

            dedup_key = (
              f"order={order_id}|"
              f"item={order_item.item_id}|"
              f"ingredient={stock_item_id}|"
              f"fkey={order_item.frontend_unique_key}"
            )
            if dedup_key in already_deducted_keys:
                continue

            stock_item = (
                db.query(InventoryEntity)
                .filter(
                    InventoryEntity.id == int(stock_item_id),
                    InventoryEntity.client_id == client_id,
                )
                .first()
            )

            if not stock_item:
                continue

            stock_unit = (stock_item.unit or "").strip()

            try:
                deduction = _convert(recipe_qty, recipe_unit, stock_unit) * ordered_qty
            except ValueError as e:
                print(f"[WARN] Skipping ingredient deduction for stock_item_id={stock_item_id}: {e}")
                continue

            deduction_decimal = Decimal(str(round(deduction, 6)))
            before_stock = Decimal(str(stock_item.availability or 0))
            after_stock  = max(before_stock - deduction_decimal, Decimal("0"))

            _record_transaction(
                db,
                client_id=client_id,
                stock_item_id=stock_item.id,
                inventory_id=stock_item.inventory_id,
                name=stock_item.name,
                transaction_type="ORDER_DEDUCTION",
                movement_type="OUT",
                quantity=deduction_decimal,
                unit=stock_unit,
                before_stock=before_stock,
                after_stock=after_stock,
                reference_id=str(order_id),
                reference_type="order",
                remarks=dedup_key,
            )

            stock_item.availability = after_stock
            already_deducted_keys.add(dedup_key)  # in-session guard
     


def _record_partial_transaction(
    db,
    client_id,
    item,
    remove_qty,
    transaction_type,
    reason,
    order_id,
):

    menu_item = db.query(InventoryEntity).filter(
        InventoryEntity.id == item.item_id,
        InventoryEntity.client_id == client_id,
    ).first()
    if not menu_item:
        return

    base_remarks = (
        f"{reason or transaction_type} | "
        f"{item.item_name} x{remove_qty} (partial) | "
        f"[key={item.frontend_unique_key}]"
    )
    stock_unit   = (menu_item.unit or "").strip()
    serving_qty  = float(menu_item.serving_quantity or 0)
    serving_unit = (menu_item.serving_unit or "").strip()

    if transaction_type == "ITEM_CANCELLED":
        _record_transaction(
            db,
            client_id=client_id,
            stock_item_id=menu_item.id,
            inventory_id=menu_item.inventory_id,
            name=menu_item.name,
            transaction_type="ITEM_CANCELLED",
            movement_type="NONE",
            quantity=Decimal(str(remove_qty)),
            unit=stock_unit or "pcs",
            before_stock=Decimal(str(menu_item.availability or 0)),
            after_stock=Decimal(str(menu_item.availability or 0)),
            reference_id=str(order_id),
            reference_type="order",
            remarks=f"[ITEM_CANCELLED_PARTIAL] Order #{order_id} — {base_remarks}",
        )

    elif transaction_type == "WASTAGE":
        if serving_qty > 0 and serving_unit and stock_unit:
            try:
                converted = _convert(serving_qty, serving_unit, stock_unit)
                reversal  = Decimal(str(round(converted * remove_qty, 6)))
                before    = Decimal(str(menu_item.availability or 0))
                after     = before + reversal
                _record_transaction(
                    db,
                    client_id=client_id,
                    stock_item_id=menu_item.id,
                    inventory_id=menu_item.inventory_id,
                    name=menu_item.name,
                    transaction_type="WASTAGE",
                    movement_type="REVERSAL",
                    quantity=reversal,
                    unit=stock_unit,
                    before_stock=before,
                    after_stock=after,
                    reference_id=str(order_id),
                    reference_type="order",
                    remarks=f"[WASTAGE_PARTIAL] Order #{order_id} — {base_remarks}",
                )
                menu_item.availability = after
            except ValueError:
                pass

        if menu_item.recipe:
            for ingredient in menu_item.recipe:
                stock_item_id_raw = ingredient.get("stock_item_id")
                recipe_qty        = float(ingredient.get("quantity_required") or 0)
                recipe_unit       = (ingredient.get("unit") or "").strip()

                if not stock_item_id_raw or recipe_qty <= 0:
                    continue

                stock_item = db.query(InventoryEntity).filter(
                    InventoryEntity.id == int(stock_item_id_raw),
                    InventoryEntity.client_id == client_id,
                ).first()
                if not stock_item:
                    continue

                ing_stock_unit = (stock_item.unit or "").strip()
                try:
                    reversal = _convert(recipe_qty, recipe_unit, ing_stock_unit) * remove_qty
                except ValueError:
                    continue

                reversal_decimal = Decimal(str(round(reversal, 6)))
                before_ing       = Decimal(str(stock_item.availability or 0))
                after_ing        = before_ing + reversal_decimal

                _record_transaction(
                    db,
                    client_id=client_id,
                    stock_item_id=stock_item.id,
                    inventory_id=stock_item.inventory_id,
                    name=stock_item.name,
                    transaction_type="WASTAGE",
                    movement_type="REVERSAL",
                    quantity=reversal_decimal,
                    unit=ing_stock_unit,
                    before_stock=before_ing,
                    after_stock=after_ing,
                    reference_id=str(order_id),
                    reference_type="order",
                    remarks=f"[INGREDIENT_REVERSAL_PARTIAL] Order #{order_id} — {base_remarks}",
                )
                stock_item.availability = after_ing