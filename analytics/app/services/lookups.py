import logging
from typing import List, NamedTuple, Optional

from pydantic import ValidationError

from models.inventory_model import Inventory, InventoryTransaction
from models.order_model import MovementTypeEnum, OrderStatusEnum

from .constants import (
    NOT_RECORDED, SERVICE_BY_TABLE_TYPE, UNCATEGORISED, UNKNOWN, ServiceMode, TableStatus,
)
from .context import AnalyticsContext
from .schemas import AnalyzedDocument, AnalyzedLine, AnalyzedOrder, DiningTableView, RecipeIngredient
from .utils import as_key, convert_quantity, to_float, to_naive

logger = logging.getLogger(__name__)


class OrderTotals(NamedTuple):
    sales: float
    net: float
    gst: float
    cost: float


# ---------------------------------------------------------------- orders & lines
def lines_of(ctx: AnalyticsContext, order: AnalyzedOrder) -> List[AnalyzedLine]:
    return ctx.lines_by_order.get(as_key(order.id), [])


def live_lines(ctx: AnalyticsContext, order: AnalyzedOrder) -> List[AnalyzedLine]:
    return [l for l in lines_of(ctx, order) if l.order_status != OrderStatusEnum.cancelled]


def line_quantity(line: AnalyzedLine) -> float:
    return to_float(line.quantity or 1)


def served_orders(ctx: AnalyticsContext) -> List[AnalyzedOrder]:
    return [o for o in ctx.orders if o.order_status == OrderStatusEnum.served]


def line_name(ctx: AnalyticsContext, line: AnalyzedLine) -> str:
    menu_item = ctx.menu_items.get(as_key(line.item_id))
    return str(line.item_name or (menu_item.name if menu_item else None) or UNKNOWN)


def item_category(ctx: AnalyticsContext, item_id) -> str:
    key = as_key(item_id)
    item = ctx.menu_items.get(key) or ctx.inventory.get(key)
    category = ctx.categories.get(as_key(item.category_id)) if item else None
    return str(category.name) if category and category.name else UNCATEGORISED


def line_category(ctx: AnalyticsContext, line: AnalyzedLine) -> str:
    return item_category(ctx, line.item_id)


def line_kitchen(ctx: AnalyticsContext, line: AnalyzedLine) -> str:
    # The inventory model has no kitchen/counter column yet.
    return NOT_RECORDED


# ---------------------------------------------------------------- costs
def recipe_ingredients(item: Inventory) -> List[RecipeIngredient]:
    ingredients = []
    for raw in item.recipe or []:
        try:
            ingredients.append(RecipeIngredient.model_validate(raw))
        except ValidationError:
            logger.warning("Invalid recipe ingredient on item %s", item.id)
    return ingredients


def recipe_cost(ctx: AnalyticsContext, item: Inventory) -> float:
    total = 0.0
    for ingredient in recipe_ingredients(item):
        stock = ctx.inventory.get(as_key(ingredient.stock_item_id))
        if stock:
            total += convert_quantity(ingredient.quantity_required, ingredient.unit, stock.unit) * to_float(stock.unit_cst)
    return total


def unit_cost(ctx: AnalyticsContext, item_id) -> float:
    key = as_key(item_id)
    if key not in ctx.unit_cost_cache:
        item = ctx.menu_items.get(key) or ctx.inventory.get(key)
        cost = to_float(item.unit_cst) if item else 0.0
        ctx.unit_cost_cache[key] = cost if cost > 0 else (recipe_cost(ctx, item) if item else 0.0)
    return ctx.unit_cost_cache[key]


def order_totals(ctx: AnalyticsContext, order: AnalyzedOrder) -> OrderTotals:
    sales = to_float(order.total_price)
    gst = to_float(order.gst) + to_float(order.cst)
    price = to_float(order.price)
    net = price - to_float(order.discount) if price else sales - gst
    cost = sum(unit_cost(ctx, l.item_id) * line_quantity(l) for l in live_lines(ctx, order))
    return OrderTotals(sales, net, gst, cost)


# ---------------------------------------------------------------- tables
def is_dining_table(table: DiningTableView) -> bool:
    kind = (table.table_type or "").strip().lower()
    return SERVICE_BY_TABLE_TYPE.get(kind, ServiceMode.dine_in) == ServiceMode.dine_in


def table_status(table: DiningTableView) -> Optional[TableStatus]:
    try:
        return TableStatus((table.status or "").strip().lower())
    except ValueError:
        return None


# ---------------------------------------------------------------- documents & transactions
def period_documents(ctx: AnalyticsContext) -> List[AnalyzedDocument]:
    f = ctx.filters
    order_ids = {as_key(o.id) for o in ctx.orders}
    result = []
    for doc in ctx.documents:
        if doc.doc_day is None or not (f.start <= doc.doc_day <= f.end):
            continue
        if f.is_narrowed and (not doc.order_id or doc.order_id not in order_ids):
            continue
        result.append(doc)
    return result


def transaction_time(txn: InventoryTransaction):
    return to_naive(txn.created_at)


def period_transactions(ctx: AnalyticsContext) -> List[InventoryTransaction]:
    f = ctx.filters
    return [t for t in ctx.transactions
            if transaction_time(t) and f.start <= transaction_time(t).date() <= f.end]


def is_inbound(txn: InventoryTransaction) -> bool:
    return (txn.movement_type or "").upper() == MovementTypeEnum.in_.value


def is_outbound(txn: InventoryTransaction) -> bool:
    return (txn.movement_type or "").upper() == MovementTypeEnum.out.value