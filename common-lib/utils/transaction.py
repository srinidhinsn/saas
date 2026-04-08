from entity.inventory_entity import CategoryEntity, InventoryEntity, InventoryTransactionEntity
from database.postgres import get_db
from sqlalchemy.orm import Session
from models.order_model import TransactionTypeEnum, MovementTypeEnum
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



def record_transaction(
    db: Session,
    *,
    client_id: str,
    stock_item_id: int,
    inventory_id: Optional[str],
    name: Optional[str],
    transaction_type: TransactionTypeEnum,
    movement_type: MovementTypeEnum,
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
        transaction_type=transaction_type.value,
        movement_type=movement_type.value,
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
    

    menu_item = (
        db.query(InventoryEntity)
        .filter(
            InventoryEntity.id == item.item_id,
            InventoryEntity.client_id == client_id,
        )
        .first()
    )
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

    if transaction_type == TransactionTypeEnum.item_cancelled:
        record_transaction(
            db,
            client_id=client_id,
            stock_item_id=menu_item.id,
            inventory_id=menu_item.inventory_id,
            name=menu_item.name,
            transaction_type=TransactionTypeEnum.item_cancelled,
            movement_type=MovementTypeEnum.none,
            quantity=Decimal(str(remove_qty)),
            unit=stock_unit or "pcs",
            before_stock=Decimal(str(menu_item.availability or 0)),
            after_stock=Decimal(str(menu_item.availability or 0)),
            reference_id=str(order_id),
            reference_type="order",
            remarks=f"[ITEM_CANCELLED_PARTIAL] Order #{order_id} — {base_remarks}",
        )

    elif transaction_type == TransactionTypeEnum.wastage:
        if serving_qty > 0 and serving_unit and stock_unit:
            try:
                converted = _convert(serving_qty, serving_unit, stock_unit)
                reversal = Decimal(str(round(converted * remove_qty, 6)))
                before = Decimal(str(menu_item.availability or 0))
                after = before + reversal
                record_transaction(
                    db,
                    client_id=client_id,
                    stock_item_id=menu_item.id,
                    inventory_id=menu_item.inventory_id,
                    name=menu_item.name,
                    transaction_type=TransactionTypeEnum.wastage,
                    movement_type=MovementTypeEnum.reversal,
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
                recipe_qty = float(ingredient.get("quantity_required") or 0)
                recipe_unit = (ingredient.get("unit") or "").strip()

                if not stock_item_id_raw or recipe_qty <= 0:
                    continue

                stock_item = (
                    db.query(InventoryEntity)
                    .filter(
                        InventoryEntity.id == int(stock_item_id_raw),
                        InventoryEntity.client_id == client_id,
                    )
                    .first()
                )
                if not stock_item:
                    continue

                ing_stock_unit = (stock_item.unit or "").strip()
                try:
                    reversal = _convert(recipe_qty, recipe_unit, ing_stock_unit) * remove_qty
                except ValueError:
                    continue

                reversal_decimal = Decimal(str(round(reversal, 6)))
                before_ing = Decimal(str(stock_item.availability or 0))
                after_ing = before_ing + reversal_decimal

                record_transaction(
                    db,
                    client_id=client_id,
                    stock_item_id=stock_item.id,
                    inventory_id=stock_item.inventory_id,
                    name=stock_item.name,
                    transaction_type=TransactionTypeEnum.wastage,
                    movement_type=MovementTypeEnum.reversal,
                    quantity=reversal_decimal,
                    unit=ing_stock_unit,
                    before_stock=before_ing,
                    after_stock=after_ing,
                    reference_id=str(order_id),
                    reference_type="order",
                    remarks=f"[INGREDIENT_REVERSAL_PARTIAL] Order #{order_id} — {base_remarks}",
                )
                stock_item.availability = after_ing