from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from entity.order_entity import DineinOrder as DBOrder, OrderItem as DBOrderItem
from entity.order_entity import DineinOrder as Db_Order_Entity, OrderItem as Db_OrderItem_Entity
from entity.inventory_entity import InventoryEntity, InventoryTransactionEntity
from models.order_model import TransactionTypeEnum, MovementTypeEnum
from utils.transaction import record_transaction
from decimal import Decimal


def build_billing_payload_from_order(order: DBOrder, items: List[DBOrderItem]) -> Dict[str, Any]:
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
                "item_id": itm.item_id,
                "item_name": getattr(itm, "item_name", None),
                "slug": getattr(itm, "slug", None),
                "quantity": int(itm.quantity or 0),
                "unit_price": itm.unit_price,
                "line_total": itm.line_total,
            }
            for itm in items
        ],
    }


def sync_served_order_to_billing_public(order: DBOrder, user_jwt: str) -> dict:
    payload = build_billing_payload_from_order(order, list(order.items))
    return push_order_to_billing_public(order.client_id, user_jwt, payload)


# ── Private helpers ──────────────────────────────────────────────────────────

def _root_dinein_id(dinein_order_id: str) -> str:
    """Return the root part of a dinein_order_id.  '1001-2' → '1001'"""
    return dinein_order_id.split("-")[0] if dinein_order_id else dinein_order_id


STATUS_PRIORITY = {"new": 0, "pending": 1, "preparing": 2, "ready": 3, "served": 4}


def _order_row_to_flat(order) -> dict:
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
    orders = sorted(orders, key=lambda o: o.created_at or 0)
    root = orders[0]
    merged_items = []
    for order in orders:
        for item in order.items:
            if (item.status or "").lower() == "cancelled":
                continue
            m = Db_OrderItem_Entity.copyToModel(item).dict()
            m["batch_label"] = order.dinein_order_id
            m["sub_order_id"] = order.id
            merged_items.append(m)

    statuses = [o.status for o in orders if o.status]
    overall = (
        min(statuses, key=lambda s: STATUS_PRIORITY.get(s, 99)) if statuses else "pending"
    )

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


# ── Unit conversion ──────────────────────────────────────────────────────────

UNIT_TO_BASE = {
    "g": 1,
    "kg": 1000,
    "ml": 1,
    "litre": 1000,
    "pcs": 1,
}

WEIGHT_UNITS = {"g", "kg"}
VOLUME_UNITS = {"ml", "litre"}
COUNT_UNITS = {"pcs"}


def _convert(recipe_qty: float, recipe_unit: str, stock_unit: str) -> float:
    ru, su = recipe_unit.strip(), stock_unit.strip()

    if ru == su:
        return recipe_qty

    if ru not in UNIT_TO_BASE or su not in UNIT_TO_BASE:
        raise ValueError(f"Unknown unit: recipe='{ru}', stock='{su}'")

    for group in (WEIGHT_UNITS, VOLUME_UNITS, COUNT_UNITS):
        if ru in group and su in group:
            return (recipe_qty * UNIT_TO_BASE[ru]) / UNIT_TO_BASE[su]

    raise ValueError(f"Incompatible unit dimensions: recipe='{ru}', stock='{su}'")


# ── Stock deduction ──────────────────────────────────────────────────────────

def _deduct_stock_for_order(db: Session, client_id: str, order_id: int) -> None:
    order_items = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.order_id == order_id,
            Db_OrderItem_Entity.client_id == client_id,
        )
        .all()
    )

    already_deducted_keys: set[str] = set(
        row.remarks
        for row in db.query(InventoryTransactionEntity.remarks).filter(
            InventoryTransactionEntity.reference_id == str(order_id),
            InventoryTransactionEntity.reference_type == "order",
            InventoryTransactionEntity.transaction_type.in_([
                TransactionTypeEnum.order_deduction.value,
                TransactionTypeEnum.menu_item_deduction.value,
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
        serving_qty = float(menu_item.serving_quantity or 0)
        serving_unit = (menu_item.serving_unit or "").strip()
        stock_unit = (menu_item.unit or "").strip()

        # 1. Menu item self-deduction
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
                    print(
                        f"[WARN] Skipping menu item deduction for item_id={menu_item.id}: {e}"
                    )
                    converted_serving = None

                if converted_serving is not None:
                    total_menu_deduction = Decimal(
                        str(round(converted_serving * ordered_qty, 6))
                    )
                    before_stock = Decimal(str(menu_item.availability or 0))
                    after_stock = max(before_stock - total_menu_deduction, Decimal("0"))

                    record_transaction(
                        db,
                        client_id=client_id,
                        stock_item_id=menu_item.id,
                        inventory_id=menu_item.inventory_id,
                        name=menu_item.name,
                        transaction_type=TransactionTypeEnum.menu_item_deduction,
                        movement_type=MovementTypeEnum.out,
                        quantity=total_menu_deduction,
                        unit=stock_unit,
                        before_stock=before_stock,
                        after_stock=after_stock,
                        reference_id=str(order_id),
                        reference_type="order",
                        remarks=menu_dedup_key,
                    )

                    menu_item.availability = after_stock
                    already_deducted_keys.add(menu_dedup_key)

        elif serving_qty > 0:
            print(
                f"[WARN] Skipping menu item deduction for item_id={menu_item.id} "
                f"'{menu_item.name}': serving_unit='{serving_unit}' stock_unit='{stock_unit}'"
            )

        # 2. Ingredient deduction
        if not menu_item.recipe:
            continue

        for ingredient in menu_item.recipe:
            stock_item_id = ingredient.get("stock_item_id")
            recipe_qty = float(ingredient.get("quantity_required") or 0)
            recipe_unit = (ingredient.get("unit") or "").strip()

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
                print(
                    f"[WARN] Skipping ingredient deduction for stock_item_id={stock_item_id}: {e}"
                )
                continue

            deduction_decimal = Decimal(str(round(deduction, 6)))
            before_stock = Decimal(str(stock_item.availability or 0))
            after_stock = max(before_stock - deduction_decimal, Decimal("0"))

            record_transaction(
                db,
                client_id=client_id,
                stock_item_id=stock_item.id,
                inventory_id=stock_item.inventory_id,
                name=stock_item.name,
                transaction_type=TransactionTypeEnum.order_deduction,
                movement_type=MovementTypeEnum.out,
                quantity=deduction_decimal,
                unit=stock_unit,
                before_stock=before_stock,
                after_stock=after_stock,
                reference_id=str(order_id),
                reference_type="order",
                remarks=dedup_key,
            )

            stock_item.availability = after_stock
            already_deducted_keys.add(dedup_key)