from entity.inventory_entity import CategoryEntity, InventoryEntity, InventoryTransactionEntity
from database.postgres import get_db
from sqlalchemy.orm import Session
from models.order_model import TransactionTypeEnum, MovementTypeEnum
from models.inventory_model import InventoryTransaction
from decimal import Decimal
from typing import Optional
import uuid
from entity.inventory_entity import InventoryEntity
# ─────────────────────────────────────────────────────────────────────────────
# Shared transaction helpers — used by order_service and order_router
# ─────────────────────────────────────────────────────────────────────────────

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

def _compute_current_stock(db: Session, client_id: str, stock_item_id: int) -> Decimal:
    """
    Sum all transactions for a stock item to get the live stock level.
    IN transactions add, OUT transactions subtract.
    """
    rows = (
        db.query(InventoryTransactionEntity)
        .filter(
            InventoryTransactionEntity.client_id == client_id,
            InventoryTransactionEntity.stock_item_id == stock_item_id,
        )
        .all()
    )
    total = Decimal("0")
    for row in rows:
        qty = Decimal(str(row.quantity))
        if row.movement_type == "IN":
            total += qty
        else:
            total -= qty
    return total
 

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


def create_transaction(
    db: Session,
    *,
    client_id: str,
    item_id: int,
    tx_type,
    ref_id: str | int,
    qty,
    remarks: str = "",
    after_stock: Optional[Decimal] = None,
    movement_type: Optional[str] = None,   # ✅ NEW
):
    # 🔹 Fetch item
    item = db.query(InventoryEntity).filter(
        InventoryEntity.id == item_id,
        InventoryEntity.client_id == client_id,
    ).first()

    if not item:
        return None

    qty = Decimal(str(qty or 0))
    before = Decimal(str(item.availability or 0))

    tx_type_str = str(tx_type).upper()

    # =========================================================
    # ✅ 1. PRIORITY: Explicit after_stock (used in adjustments)
    # =========================================================
    if after_stock is not None:
        after = Decimal(str(after_stock))

        if after > before:
            movement = "IN"
        elif after < before:
            movement = "OUT"
        else:
            movement = "NONE"

    # =========================================================
    # ✅ 2. PRIORITY: Explicit movement_type (inventory service)
    # =========================================================
    elif movement_type:
        movement = movement_type.upper()

        if movement == "IN":
            after = before + qty
        elif movement == "OUT":
            after = before - qty
        else:
            after = before

    # =========================================================
    # ✅ 3. FALLBACK: Order-service logic (existing behavior)
    # =========================================================
    else:
        if tx_type_str in ["WASTAGE"]:
            movement = "IN"
            after = before + qty

        elif tx_type_str in ["ITEM_CANCELLED"]:
            movement = "NONE"
            after = before

        # =====================================================
        # ✅ 4. GENERIC DEFAULT (inventory-safe fallback)
        # =====================================================
        elif tx_type_str in ["STOCK_IN", "RETURN"]:
            movement = "IN"
            after = before + qty

        elif tx_type_str in ["ORDER_DEDUCTION", "STOCK_OUT", "CANCELLATION"]:
            movement = "OUT"
            after = before - qty

        else:
            # safest fallback
            movement = "NONE"
            after = before

    # =========================================================
    # 🔹 Create transaction
    # =========================================================
    tx = InventoryTransactionEntity(
        transaction_id=str(uuid.uuid4()),
        client_id=client_id,

        stock_item_id=item.id,
        inventory_id=item.inventory_id,
        name=item.name,

        transaction_type=tx_type_str,
        movement_type=movement,

        quantity=qty,
        unit=item.unit or "pcs",

        before_stock=before,
        after_stock=after,

        reference_id=str(ref_id),
        reference_type="order",  # you can override later if needed
        remarks=remarks or tx_type_str,
    )

    db.add(tx)

    # 🔥 Single source of truth
    item.availability = after

    return tx

def record_partial_transaction(
    db: Session,
    *,
    client_id: str,
    item,
    remove_qty: int,
    transaction_type: TransactionTypeEnum,
    reason: Optional[str],
    order_id: int,
) -> None:

    menu_item = db.query(InventoryEntity).filter(
        InventoryEntity.id == item.item_id,
        InventoryEntity.client_id == client_id,
    ).first()

    if not menu_item:
        return

    base_remarks = (
        f"{reason or transaction_type.value} | "
        f"{item.item_name} x{remove_qty} (partial) | "
        f"[key={item.frontend_unique_key}]"
    )

    stock_unit = (menu_item.unit or "").strip()
    serving_qty = float(menu_item.serving_quantity or 0)
    serving_unit = (menu_item.serving_unit or "").strip()

    # 🔹 ITEM CANCELLED (no stock change)
    if transaction_type == TransactionTypeEnum.item_cancelled:
        create_transaction(
            db=db,
            client_id=client_id,
            item_id=menu_item.id,
            tx_type=TransactionTypeEnum.item_cancelled,
            ref_id=order_id,
            qty=remove_qty,
            remarks=f"[ITEM_CANCELLED_PARTIAL] Order #{order_id} — {base_remarks}",
        )

    # 🔹 WASTAGE
    elif transaction_type == TransactionTypeEnum.wastage:

        # 🔸 Menu item reversal (serving based)
        if serving_qty > 0 and serving_unit and stock_unit:
            try:
                converted = _convert(serving_qty, serving_unit, stock_unit)
                reversal_qty = round(converted * remove_qty, 6)

                create_transaction(
                    db=db,
                    client_id=client_id,
                    item_id=menu_item.id,
                    tx_type=TransactionTypeEnum.wastage,
                    ref_id=order_id,
                    qty=reversal_qty,
                    remarks=f"[WASTAGE_PARTIAL] Order #{order_id} — {base_remarks}",
                )
            except ValueError:
                pass

        # 🔸 Ingredient reversal
        for ingredient in menu_item.recipe or []:
            stock_item_id_raw = ingredient.get("stock_item_id")
            recipe_qty = float(ingredient.get("quantity_required") or 0)
            recipe_unit = (ingredient.get("unit") or "").strip()

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
                reversal_qty = round(reversal, 6)

                create_transaction(
                    db=db,
                    client_id=client_id,
                    item_id=stock_item.id,
                    tx_type=TransactionTypeEnum.wastage,
                    ref_id=order_id,
                    qty=reversal_qty,
                    remarks=f"[INGREDIENT_REVERSAL_PARTIAL] Order #{order_id} — {base_remarks}",
                )
            except ValueError:
                continue