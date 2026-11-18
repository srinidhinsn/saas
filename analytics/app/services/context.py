import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Type

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from entity.billing_entity import BillingDocumentEntity
from entity.inventory_entity import CategoryEntity, InventoryEntity, InventoryTransactionEntity
from entity.order_entity import DineinOrder, OrderItem
from entity.table_entity import DiningTable
from entity.user_entity import Person, User
from models.inventory_model import Category, Inventory, InventoryTransaction
from models.billing_model import ApprovalStatusEnum, PaymentStatusEnum
from models.saas_context import SaasContext

from .constants import (
    ALL, MENU_INVENTORY_ID, NOT_RECORDED, ORDER_TYPE_BY_SERVICE, PAID_STATUSES, SERVICE_BY_TABLE_TYPE,
    STOCK_INVENTORY_ID, TIME_OF_DAY_HOURS, UNKNOWN, OrderType, ServiceMode, TimeOfDay,
)
from .schemas import AnalyzedDocument, AnalyzedLine, AnalyzedOrder, AnalyticsFilters, DiningTableView
from .utils import (
    as_key, hour_in_window, normalize_order_status, payment_method_label, resolve_employee,
    status_label, to_float, to_naive,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AnalyticsContext:
    db: Session
    client_id: str
    filters: AnalyticsFilters
    tables: Dict[str, DiningTableView]
    categories: Dict[str, Category]
    inventory: Dict[str, Inventory]
    menu_items: Dict[str, Inventory]
    stock_items: Dict[str, Inventory]
    transactions: List[InventoryTransaction]
    lines_by_order: Dict[str, List[AnalyzedLine]]
    all_orders: List[AnalyzedOrder]
    orders: List[AnalyzedOrder]
    orders_by_id: Dict[str, AnalyzedOrder]
    documents: List[AnalyzedDocument]
    user_names: Dict[str, str]
    unit_cost_cache: Dict[str, float] = field(default_factory=dict)


# ---------------------------------------------------------------- generic loading
def load_models(db: Session, entity, model: Type[BaseModel], client_id: str) -> list:
    """Load a client's rows through a Pydantic model; bad legacy rows are logged and skipped."""
    query = db.query(entity)
    if hasattr(entity, "client_id"):
        query = query.filter(entity.client_id == client_id)
    models = []
    for row in query.all():
        try:
            models.append(model.model_validate(row, from_attributes=True))
        except ValidationError as exc:
            logger.warning("Skipping invalid %s row: %s", entity.__name__, exc.errors()[:2])
    return models


def base_zone_rows(rows: List[Inventory]) -> Dict[str, Inventory]:
    """One row per item id, preferring the base (zone 0) variant."""
    chosen: Dict[str, Inventory] = {}
    for item in rows:
        key = as_key(item.id)
        if key not in chosen or not item.zone_config_id:
            chosen[key] = item
    return chosen


def load_user_names(db: Session, orders: List[AnalyzedOrder]) -> Dict[str, str]:
    raw_ids = {as_key(getattr(o, f)) for o in orders for f in ("handler_id", "created_by", "updated_by") if getattr(o, f)}
    user_ids = []
    for raw in raw_ids:
        try:
            user_ids.append(uuid.UUID(raw))
        except ValueError:
            continue
    if not user_ids:
        return {}
    names: Dict[str, str] = {}
    try:
        for person in db.query(Person).filter(Person.id.in_(user_ids)).all():
            full = " ".join(p.strip() for p in (person.first_name, person.last_name) if p and p.strip())
            if full:
                names[as_key(person.id)] = full
        missing = [i for i in user_ids if as_key(i) not in names]
        if missing:
            for user in db.query(User).filter(User.id.in_(missing)).all():
                names[as_key(user.id)] = user.username
    except Exception:
        logger.exception("Could not resolve employee names")
        db.rollback()
    return names


# ---------------------------------------------------------------- enrichment (pure)
def analyze_order(order: AnalyzedOrder, tables, user_names, auth: Optional[SaasContext]) -> AnalyzedOrder:
    table = tables.get(as_key(order.table_id))
    table_type = ((table.table_type or table.name or "") if table else "").strip().lower()
    created = to_naive(order.created_at)
    status = normalize_order_status(order.status, auth)
    return order.model_copy(update={
        "created_dt": created, "created_on": created.date() if created else None,
        "updated_dt": to_naive(order.updated_at),
        "order_status": status, "status_label": status_label(status),
        "service": SERVICE_BY_TABLE_TYPE.get(table_type, ServiceMode.dine_in),
        "area": (table.section if table and table.section else NOT_RECORDED),
        "table_name": (table.name if table and table.name else as_key(order.table_id) or UNKNOWN),
        "employee": resolve_employee(user_names, order.handler_id or order.created_by),
        "weekday": created.strftime("%A") if created else UNKNOWN,
    })


def analyze_line(line: AnalyzedLine, auth: Optional[SaasContext]) -> AnalyzedLine:
    status = normalize_order_status(line.status, auth)
    return line.model_copy(update={"order_status": status, "status_label": status_label(status)})


def analyze_document(doc: AnalyzedDocument, orders_by_id: Dict[str, AnalyzedOrder]) -> AnalyzedDocument:
    order = orders_by_id.get(as_key(doc.order_id))
    moment = to_naive(doc.document_date or doc.invoice_date or doc.created_at)
    payment_status = doc.payment_status or PaymentStatusEnum.pending
    return doc.model_copy(update={
        "payment_status": payment_status,
        "approval_status": doc.approval_status or ApprovalStatusEnum.pending,
        "number": doc.document_number or as_key(doc.id),
        "doc_dt": moment, "doc_day": moment.date() if moment else None,
        "amount": to_float(doc.total_amount) or (to_float(order.total_price) if order else 0.0),
        "is_paid": payment_status in PAID_STATUSES,
        "method_label": payment_method_label(doc.payment_method),
        "service": order.service.value if order else UNKNOWN,
        "area": order.area if order else UNKNOWN,
        "table_label": f"{order.area} / {order.table_name}" if order else UNKNOWN,
        "employee": order.employee if order else "Unassigned",
    })


# ---------------------------------------------------------------- filtering
def allowed_menu_item_ids(filters: AnalyticsFilters, categories, menu_items) -> Optional[set]:
    if filters.menu_category == ALL and filters.menu_recipe == ALL:
        return None
    category_ids = {k for k, c in categories.items() if c.name == filters.menu_category}
    return {k for k, i in menu_items.items()
            if (filters.menu_category == ALL or as_key(i.category_id) in category_ids)
            and (filters.menu_recipe == ALL or i.name == filters.menu_recipe)}


def order_matches(order: AnalyzedOrder, filters: AnalyticsFilters, lines_by_order, item_ids: Optional[set]) -> bool:
    if order.created_on is None or not (filters.start <= order.created_on <= filters.end):
        return False
    if filters.area != ALL and order.area != filters.area:
        return False
    if filters.order_type != OrderType.all and ORDER_TYPE_BY_SERVICE[order.service] != filters.order_type:
        return False
    if filters.weekday != ALL and order.weekday != filters.weekday:
        return False
    if item_ids is not None and not any(as_key(l.item_id) in item_ids for l in lines_by_order.get(as_key(order.id), [])):
        return False
    if filters.time_of_day != TimeOfDay.all:
        if not order.created_dt or not hour_in_window(order.created_dt.hour, TIME_OF_DAY_HOURS[filters.time_of_day]):
            return False
    return True


# ---------------------------------------------------------------- entry point
def load_context(db: Session, client_id: str, filters: AnalyticsFilters,
                 auth: Optional[SaasContext] = None) -> AnalyticsContext:
    tables = {as_key(t.id): t for t in load_models(db, DiningTable, DiningTableView, client_id)}
    categories = {as_key(c.id): c for c in load_models(db, CategoryEntity, Category, client_id)}
    inventory = base_zone_rows(load_models(db, InventoryEntity, Inventory, client_id))
    menu_items = {k: i for k, i in inventory.items() if (i.inventory_id or "").strip().lower() == MENU_INVENTORY_ID}
    stock_items = {k: i for k, i in inventory.items() if (i.inventory_id or "").strip().lower() == STOCK_INVENTORY_ID}
    transactions = load_models(db, InventoryTransactionEntity, InventoryTransaction, client_id)

    lines_by_order: Dict[str, List[AnalyzedLine]] = defaultdict(list)
    for line in load_models(db, OrderItem, AnalyzedLine, client_id):
        lines_by_order[as_key(line.order_id)].append(analyze_line(line, auth))

    raw_orders = load_models(db, DineinOrder, AnalyzedOrder, client_id)
    user_names = load_user_names(db, raw_orders)
    all_orders = [analyze_order(o, tables, user_names, auth) for o in raw_orders]
    orders_by_id = {as_key(o.id): o for o in all_orders}

    item_ids = allowed_menu_item_ids(filters, categories, menu_items)
    orders = [o for o in all_orders if order_matches(o, filters, lines_by_order, item_ids)]
    documents = [analyze_document(d, orders_by_id)
                 for d in load_models(db, BillingDocumentEntity, AnalyzedDocument, client_id)]

    return AnalyticsContext(
        db=db, client_id=client_id, filters=filters, tables=tables, categories=categories,
        inventory=inventory, menu_items=menu_items, stock_items=stock_items, transactions=transactions,
        lines_by_order=dict(lines_by_order), all_orders=all_orders, orders=orders,
        orders_by_id=orders_by_id, documents=documents, user_names=user_names,
    )