from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from entity.order_entity import DineinOrder as DBOrder, OrderItem as DBOrderItem
from entity.order_entity import DineinOrder as Db_Order_Entity, OrderItem as Db_OrderItem_Entity
from entity.inventory_entity import InventoryEntity, InventoryTransactionEntity, CategoryEntity
from models.order_model import TransactionTypeEnum, MovementTypeEnum, OrderStatusEnum
from models.inventory_model import InventoryTransaction
from utils.transaction import create_transaction , TxPayload
from decimal import Decimal
from models.response_model import ResponseModel
from fastapi import HTTPException
from models.order_model import DineinOrderModel 
from .order_status import _status_label,resolve_realm_from_context, resolve_base_status
from models.saas_context import SaasContext
from datetime import datetime

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


# ── Private helpers ──────────────────────────────────────────────────────────

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
    all_cancelled = all((o.status or "").lower() == OrderStatusEnum.cancelled.value for o in orders)
    for order in orders:
        for item in order.items:
            if not all_cancelled and (item.status or "").lower() == OrderStatusEnum.cancelled.value:
                continue
            m = Db_OrderItem_Entity.copyToModel(item).dict()
            m["batch_label"] = order.dinein_order_id
            m["sub_order_id"] = order.id
            # ✅ FIX: explicitly carry parent_item_key so frontend can re-group
            m["parent_item_key"] = getattr(item, "parent_item_key", None)
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

    # ✅ FIX: only sum parent items (no parent_item_key) to avoid double-counting
    total_price = sum(
        (item.get("unit_price") or 0) * (item.get("quantity") or 1)
        for item in merged_items
        if not item.get("parent_item_key")
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

# ── Stock deduction ──────────────────────────────────────────────────────────
def _deduct_stock_for_order(db: Session, client_id: str, order_id: int, context=SaasContext, rental_only: bool = False) -> None:

    def _tx(item_id, tx_type, qty, remarks, ref_id=None, reference_type=None):
        create_transaction(
            db=db, context=context,
            payload=TxPayload(item_id=item_id, tx_type=tx_type, ref_id=ref_id or order_id, qty=qty, remarks=remarks, reference_type=reference_type)
        )

    def _deduct_single_item(menu_item, ordered_qty, label):
        """Deduct one inventory item + its recipe ingredients."""
        serving_qty  = float(menu_item.serving_quantity or 0)
        serving_unit = (menu_item.serving_unit or "").strip()
        stock_unit   = (menu_item.unit or "").strip()

        if serving_qty > 0 and serving_unit and stock_unit:
            try:
                total = round(
                    _convert(serving_qty, serving_unit, stock_unit) * ordered_qty, 6
                )
                _tx(
                    menu_item.id,
                    TransactionTypeEnum.order_deduction,
                    total,
                    f"[{label}] Order #{order_id} | {menu_item.name} x{ordered_qty}",
                )
            except ValueError:
                _tx(
                    menu_item.id,
                    TransactionTypeEnum.order_deduction,
                    ordered_qty,
                    f"[{TransactionTypeEnum.order_deduction.value}] Order #{order_id} | {menu_item.name} x{ordered_qty}",
                )
        else:
            _tx(
                menu_item.id,
                TransactionTypeEnum.order_deduction,
                ordered_qty,
                f"[{TransactionTypeEnum.order_deduction.value}] Order #{order_id} | {menu_item.name} x{ordered_qty}",
            )

        # Recipe ingredients
        for ingredient in (menu_item.recipe or []):
            stock_item_id = ingredient.get("stock_item_id")
            recipe_qty    = float(ingredient.get("quantity_required") or 0)
            recipe_unit   = (ingredient.get("unit") or "").strip()

            if not stock_item_id or recipe_qty <= 0:
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

            ing_stock_unit = (stock_item.unit or "").strip()

            try:
                total = round(
                    _convert(recipe_qty, recipe_unit, ing_stock_unit) * ordered_qty, 6
                )
                _tx(
                    stock_item.id,
                    TransactionTypeEnum.order_deduction,
                    total,
                    f"[{label}_RECIPE] Order #{order_id} | {menu_item.name}",
                )
            except ValueError:
                continue

    order_items = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.order_id == order_id,
            Db_OrderItem_Entity.client_id == client_id,
            Db_OrderItem_Entity.status != OrderStatusEnum.cancelled,
        )
        .all()
    )
    rented_label = (_status_label(context, OrderStatusEnum.served) if context else None) or "rented"
    for order_item in order_items:

        ordered_qty = order_item.quantity or 1
        is_rental = resolve_realm_from_context(context) == "rental"
        if rental_only and not is_rental:
           continue
        if not rental_only and is_rental:
            continue
        menu_item = (
            db.query(InventoryEntity)
            .filter(InventoryEntity.id == int(order_item.item_id), InventoryEntity.client_id == client_id)
            .first()
        )

        if not menu_item:
            continue
        if is_rental:
            _tx(
                menu_item.id,
                TransactionTypeEnum.order_deduction,
                ordered_qty,
                f"[RENTAL_OUT] Order #{order_id} | OrderItem #{order_item.id} | {menu_item.name} x{ordered_qty}",
                ref_id=order_item.id,          # order_item id, so returns can match back to exactly this deduction
                reference_type="order_item",
            )
            order_item.status = rented_label
            continue
        # Check if this is a combo by category name
        category = (
            db.query(CategoryEntity)
            .filter(CategoryEntity.id == menu_item.category_id)
            .first()
        )
        is_combo = category and (category.name or "").lower().startswith("combo")

        if is_combo:
            # Skip deducting the combo parent itself — it's just a container.
            # Derive and deduct each child from line_item_id instead.
            for child_id in (menu_item.line_item_id or []):
                child_item = (
                    db.query(InventoryEntity)
                    .filter(
                        InventoryEntity.id == int(child_id),
                        InventoryEntity.client_id == client_id,
                    )
                    .first()
                )
                if not child_item:
                    continue
                _deduct_single_item(child_item, ordered_qty, "COMBO_CHILD")
        else:
            # Regular item or addon — deduct directly
            _deduct_single_item(menu_item, ordered_qty, "ITEM")
            

def update_order_status_service(client_id: str, body: DineinOrderModel, context, db: Session):
    returnResponseModel = None

    order = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.id == body.id,
            Db_Order_Entity.client_id == client_id
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail=f"Order {body.id} not found"
        )

    # ── Cancel entire order group ───────────────────────────────────────────
    if body.status == OrderStatusEnum.cancelled:
        root_id = _root_dinein_id(order.dinein_order_id)

        related_orders = (
            db.query(Db_Order_Entity)
            .filter(
                Db_Order_Entity.client_id == client_id,
                Db_Order_Entity.dinein_order_id.like(f"{root_id}%"),
            )
            .all()
        )

        for o in related_orders:
            o.status = _status_label(context, body.status) or body.status

            order_items = (
                db.query(Db_OrderItem_Entity)
                .filter(
                    Db_OrderItem_Entity.order_id == o.id,
                    Db_OrderItem_Entity.client_id == client_id,
                )
                .all()
            )

            for item in order_items:
                item.status = _status_label(context, OrderStatusEnum.cancelled) or OrderStatusEnum.cancelled

        cancellation_reason = getattr(body, "cancellation_reason", None)
        if cancellation_reason:
            for o in related_orders:
                if hasattr(o, "cancellation_reason"):
                    o.cancellation_reason = cancellation_reason

        db.commit()

        returnResponseModel = ResponseModel(
            screen_id=context.screen_id,
            data={
                "message": "Order and all sub-orders cancelled",
                "cancelled_count": len(related_orders),
            },
        )

    # ── Served / completed — only the single order passed in ───────────────
    if body.status in [OrderStatusEnum.served, OrderStatusEnum.completed]:
        mapped_status = _status_label(context, body.status) or body.status
        current_base_status = resolve_base_status(context, order.status)
        should_deduct = current_base_status not in [
            OrderStatusEnum.served.value,
            OrderStatusEnum.completed.value
        ]

        order.status = mapped_status

        order_items = (
            db.query(Db_OrderItem_Entity)
            .filter(
                Db_OrderItem_Entity.order_id == order.id,
                Db_OrderItem_Entity.client_id == client_id,
            )
            .all()
        )
        cancelled_label = _status_label(context, OrderStatusEnum.cancelled) or OrderStatusEnum.cancelled

        for item in order_items:
            if item.status != cancelled_label:
                item.status = mapped_status

        db.flush()

        deducted_count = 0
        if should_deduct:
            _deduct_stock_for_order(db=db, client_id=client_id, order_id=order.id,context=context)
            deducted_count += 1

        db.commit()

        returnResponseModel = ResponseModel(
            screen_id=context.screen_id,
            data={
                "message": "All related orders marked as served",
                "updated_count": len(order_items),
                "deducted_count": deducted_count,
            },
        )

    # ── Normal single order update (for other statuses) ────────────────────
    if body.status not in [OrderStatusEnum.cancelled, OrderStatusEnum.served, OrderStatusEnum.completed]:
        if body.status is not None:
            order.status = _status_label(context, body.status) or body.status

        if body.total_price is not None:
            order.total_price = body.total_price

        if body.table_id is not None:
            order.table_id = body.table_id

        if body.dinein_order_id is not None:
            order.dinein_order_id = body.dinein_order_id

        db.commit()
        db.refresh(order)

        returnResponseModel = ResponseModel(
            screen_id=context.screen_id,
            data={
                "message": "Status updated",
                "new_status": order.status,"new_status_label": _status_label(context, order.status),
            },
        )

    return returnResponseModel

def _deduct_rental_items_for_order(db: Session, client_id: str, order_id: int, context) -> int:
    order_items = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.order_id == order_id,
            Db_OrderItem_Entity.client_id == client_id,
        )
        .all()
    )

    rented_label = _status_label(context, OrderStatusEnum.served) or "rented"
    deducted = 0

    for order_item in order_items:
        if '||RENTAL|' not in (order_item.slug or ''):
            continue

        menu_item = (
            db.query(InventoryEntity)
            .filter(
                InventoryEntity.id == int(order_item.item_id),
                InventoryEntity.client_id == client_id,
            )
            .first()
        )
        if not menu_item:
            continue

        qty = Decimal(str(order_item.quantity or 1))

        stock_before = Decimal(str(menu_item.availability or 0))
        stock_after = stock_before - qty
        menu_item.availability = stock_after

        db.add(InventoryTransactionEntity(
            client_id=client_id,
            stock_item_id=menu_item.id,
            inventory_id=str(menu_item.id),
            name=menu_item.name,
            transaction_type=TransactionTypeEnum.menu_item_deduction.value,
            movement_type=MovementTypeEnum.out.value,
            quantity=qty,
            unit="pcs",
            before_stock=stock_before,
            after_stock=stock_after,
            reference_id=str(order_item.id),  
            reference_type="order",
            created_by=getattr(context, "user_id", None),
            created_at=datetime.utcnow(),
            remarks=f"[menu_item_deduction] Order #{order_id} | OrderItem #{order_item.id} | {menu_item.name} x{int(qty)}",
        ))

        order_item.status = rented_label
        deducted += 1

    return deducted

def process_rental_return(db: Session, client_id: str, order_item_id: int, context) -> dict:
    item = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.id == order_item_id,
            Db_OrderItem_Entity.client_id == client_id,
        )
        .first()
    )
    if not item or '||RENTAL|' not in (item.slug or ''):
        raise HTTPException(status_code=404, detail="Rental item not found")

    returned_label = _status_label(context, OrderStatusEnum.completed) or "returned"
    if item.status == returned_label:
        raise HTTPException(status_code=409, detail="Item has already been returned")

    base, meta = item.slug.split('||RENTAL|')
    tier_id, duration_min, start_epoch, due_epoch, _, _ = meta.split('|')
    now_ms = int(datetime.utcnow().timestamp() * 1000)

    late_fee = 0.0
    if now_ms > int(due_epoch):
        overdue_hours = (now_ms - int(due_epoch)) / (1000 * 60 * 60)
        hourly_rate = (item.unit_price or 0) / max(int(duration_min) / 60, 1e-6)
        late_fee = round(overdue_hours * hourly_rate, 2)

    item.slug = f"{base}||RENTAL|{tier_id}|{duration_min}|{start_epoch}|{due_epoch}|{now_ms}|{late_fee}"
    item.status = returned_label

    if late_fee > 0:
        db.add(Db_OrderItem_Entity(
            client_id=client_id, order_id=item.order_id, item_id=item.item_id,
            item_name=f"Late fee — {item.item_name}", quantity=1,
            unit_price=late_fee, line_total=late_fee,
            status=_status_label(context, OrderStatusEnum.served) or "served",
            frontend_unique_key=f"latefee_{item.id}_{now_ms}",
        ))

    # Only restore stock if we can find the matching menu_item_deduction deduction for
    # THIS order item — skip rather than risk over-crediting if it's missing
    # (e.g. a legacy order placed before deduction-at-creation existed).
    new_availability = None
    restored = False
    skipped_reason = None

    menu_item = (
        db.query(InventoryEntity)
        .filter(InventoryEntity.id == item.item_id, InventoryEntity.client_id == client_id)
        .first()
    )

    matching_deduction = (
        db.query(InventoryTransactionEntity)
        .filter(
            InventoryTransactionEntity.client_id == client_id,
            InventoryTransactionEntity.stock_item_id == item.item_id,
            InventoryTransactionEntity.reference_id == str(item.id),
            InventoryTransactionEntity.transaction_type == TransactionTypeEnum.menu_item_deduction.value,
        )
        .first()
    )

    if not matching_deduction:
        skipped_reason = "No matching menu_item_deduction deduction found for this order item — stock not restored to avoid over-crediting."
    elif menu_item and menu_item.availability is not None:
        qty = Decimal(str(item.quantity or 1))
        stock_before = Decimal(str(menu_item.availability or 0))
        new_availability = stock_before + qty
        menu_item.availability = new_availability
        restored = True

        db.add(InventoryTransactionEntity(
            client_id=client_id,
            stock_item_id=menu_item.id,
            inventory_id=str(menu_item.id),
            name=menu_item.name,
            transaction_type=TransactionTypeEnum.item_cancelled.value,
            movement_type=MovementTypeEnum.in_.value,
            quantity=qty,
            unit="pcs",
            before_stock=stock_before,
            after_stock=new_availability,
            reference_id=str(item.id),
            reference_type="order",
            created_by=getattr(context, "user_id", None),
            created_at=datetime.utcnow(),
            remarks=f"[RENTAL_RETURN] Order #{item.order_id} | {menu_item.name} x{int(qty)}",
        ))

    db.flush()  # caller commits

    return {
        "late_fee": late_fee,
        "returned_at": now_ms,
        "item_id": item.item_id,
        "status": item.status,
        "availability": float(new_availability) if new_availability is not None else None,
        "stock_restored": restored,
        "skipped_reason": skipped_reason,
    }