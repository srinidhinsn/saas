from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
from entity.inventory_entity import InventoryTransactionEntity
import uuid

 

def build_category_tree_by_id(categories, root_id):
    lookup = {cat.id: cat for cat in categories}

    def recurse(current_id):
        category = lookup.get(current_id)
        if not category:
            return None

        # Recursively fetch subcategories
        subcats = []
        if category.sub_categories:
            for sub_id in category.sub_categories:
                result = recurse(sub_id)
                if result:
                    subcats.append(result)

        print("subcats - ", subcats)
        return {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "slug": category.slug,
            "subCategories": subcats
        }

    return recurse(root_id)


def build_category_tree(categories, category_id):
    tree = []

    if category_id is not None and category_id != "":
        # Build tree for the given category_id
        node = build_category_tree_by_id(categories, category_id)
        print("node - ", node)
        tree.append(node)
    else:
        # Build tree for all root categories
        for category in categories:
            node = build_category_tree_by_id(categories, category.id)
            print("node - ", node)
            tree.append(node)

    return tree


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
