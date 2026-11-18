from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException

from entity.billing_entity import BillingDocumentItemEntity
from entity.client_entity import Client
from models.billing_model import ApprovalStatusEnum, BillingDocumentItem, PaymentStatusEnum
from models.order_model import OrderStatusEnum

from .constants import (
    ALL, DEFAULT_BATCH_PLATES, EXCESS_COVER_DAYS, HIGH_COST_SHARE, LOW_COVER_DAYS, MAX_DIAGNOSTIC_CASES,
    MAX_DRILLDOWN_ROWS, NOT_RECORDED, OPEN_STATUSES, ORDER_TYPE_LABELS, REORDER_BATCH_RATIO,
    REPORTED_STATUSES, TIME_OF_DAY_LABELS, UNKNOWN, USAGE_WINDOW_DAYS, WEEKDAY_NAMES,
    Grain, IngredientReadiness, OrderType, PlanStatus, ServiceMode, StockHealth, TableStatus, TimeOfDay,
)
from .context import AnalyticsContext
from .lookups import (
    is_dining_table, is_inbound, is_outbound, item_category, line_category, line_kitchen, line_name,
    line_quantity, lines_of, live_lines, order_totals, period_documents, period_transactions,
    recipe_ingredients, served_orders, table_status, transaction_time, unit_cost,
)
from .utils import (
    NATURAL_GROUPS, ORDER_GROUPERS, as_key, build_status_rows, build_timing_rows, build_trend_rows,
    convert_quantity, format_remarks, iso_date, minutes_since, parse_seat_count, period_label,
    resolve_employee, round_to, sort_periods, to_float,
)

CANCELLED = OrderStatusEnum.cancelled
SERVED = OrderStatusEnum.served
GRAINS = tuple(Grain)


def _status_label_of(record) -> str:
    return record.status_label


# ============================================================================ filters / overview
def build_filters(ctx: AnalyticsContext) -> dict:
    dates = [o.created_on for o in ctx.all_orders if o.created_on]
    client = ctx.db.query(Client).filter(Client.id == ctx.client_id).first()
    return {
        "clients": [{"id": ctx.client_id, "name": getattr(client, "name", None) or ctx.client_id}],
        "default_client_id": ctx.client_id,
        "min_date": iso_date(min(dates)) if dates else None,
        "max_date": iso_date(max(dates)) if dates else None,
        "areas": sorted({str(t.section) for t in ctx.tables.values() if t.section}),
        "weekdays": WEEKDAY_NAMES,
        "categories": sorted({str(c.name) for c in ctx.categories.values() if c.name}),
        "recipes": sorted({str(i.name) for i in ctx.menu_items.values() if i.name and i.recipe}),
        "order_types": [{"id": t.value, "name": ORDER_TYPE_LABELS[t]} for t in OrderType],
        "time_of_day": [{"id": t.value, "name": TIME_OF_DAY_LABELS[t]} for t in TimeOfDay],
    }


def build_overview(ctx: AnalyticsContext) -> dict:
    orders, served = ctx.orders, served_orders(ctx)
    documents = period_documents(ctx)
    cancelled = sum(1 for o in orders if o.order_status == CANCELLED)
    daily, items = defaultdict(float), {}
    for order in served:
        daily[order.day] += to_float(order.total_price)
        for line in live_lines(ctx, order):
            name = line_name(ctx, line)
            row = items.setdefault(name, {"name": name, "portions": 0, "sales": 0})
            row["portions"] += line_quantity(line)
            row["sales"] += to_float(line.line_total)
    invoiced_order_ids = {d.order_id for d in documents}
    billed = sum(d.amount for d in documents)
    paid = sum(d.amount for d in documents if d.is_paid)
    return {
        "kpis": {
            "orders": len(orders), "completed_orders": len(served),
            "revenue": round_to(sum(to_float(o.total_price) for o in served)),
            "invoiced_value": round_to(billed), "paid_invoiced_value": round_to(paid),
            "unpaid_invoiced_value": round_to(billed - paid), "invoices": len(documents),
            "discount": round_to(sum(to_float(o.discount) for o in served)),
            "cancelled_orders": cancelled,
            "cancellation_rate": round_to(100 * cancelled / len(orders), 1) if orders else 0,
        },
        "sales": {"daily": [{"date": d, "revenue": round_to(v)} for d, v in sorted(daily.items())]},
        "menu": {"items": sorted(items.values(), key=lambda r: -r["sales"])},
        "reconciliation": {"completed_orders_without_invoice": sum(
            1 for o in served if as_key(o.id) not in invoiced_order_ids and not o.invoice_id)},
    }


def build_deep_dive(ctx: AnalyticsContext) -> dict:
    overview = build_overview(ctx)
    return {"sales": overview["sales"],
            "menu": {"items": overview["menu"]["items"], "by_hour": [], "by_weekday": []},
            "billing": {}, "stock": {}, "checks": {}}


def build_channels(ctx: AnalyticsContext) -> dict:
    return {"channels": build_status_rows(ctx.orders, ORDER_GROUPERS["service"], _status_label_of)}


def build_footprint(ctx: AnalyticsContext) -> dict:
    dining = [t for t in ctx.tables.values() if is_dining_table(t)]
    return {"restaurants": 1, "physical_tables": len(dining), "service_modes": len(ServiceMode),
            "dining_areas": len({t.section for t in dining if t.section}),
            "menu_categories": len(ctx.categories), "menu_items": len(ctx.menu_items),
            "raw_materials": len(ctx.stock_items)}


def build_intelligence(ctx: AnalyticsContext) -> dict:
    received, consumed = defaultdict(float), defaultdict(float)
    for txn in period_transactions(ctx):
        (received if is_inbound(txn) else consumed)[as_key(txn.stock_item_id)] += to_float(txn.quantity)
    sold = defaultdict(float)
    for order in served_orders(ctx):
        for line in live_lines(ctx, order):
            sold[as_key(line.item_id)] += line_quantity(line)
    stock = [{"kind": "Raw material", "item": i.name, "unit": i.unit,
              "received": round_to(received.get(k, 0), 3), "consumed": round_to(consumed.get(k, 0), 3),
              "available_snapshot": round_to(to_float(i.availability), 3), "order_linked": 0}
             for k, i in ctx.stock_items.items()]
    stock += [{"kind": "Menu item", "item": i.name,
               "prepared": round_to(sold.get(k, 0) + max(to_float(i.availability), 0)),
               "served": round_to(sold.get(k, 0)), "available_snapshot": round_to(to_float(i.availability))}
              for k, i in ctx.menu_items.items()]
    return {"stock": stock, "footprint": build_footprint(ctx)}


def build_recipe_catalog(ctx: AnalyticsContext) -> dict:
    f = ctx.filters
    category_ids = {as_key(c.id) for c in ctx.categories.values() if c.name == f.menu_category}
    recipes = []
    for item in ctx.menu_items.values():
        ingredients_spec = recipe_ingredients(item)
        if not ingredients_spec:
            continue
        if f.menu_category != ALL and as_key(item.category_id) not in category_ids:
            continue
        if f.menu_recipe != ALL and item.name != f.menu_recipe:
            continue
        ingredients = []
        for spec in ingredients_spec:
            stock = ctx.inventory.get(as_key(spec.stock_item_id))
            if not stock:
                continue
            cost = convert_quantity(spec.quantity_required, spec.unit, stock.unit) * to_float(stock.unit_cst)
            ingredients.append({"name": stock.name, "quantity": spec.quantity_required, "unit": spec.unit,
                                "stock_on_hand": round_to(to_float(stock.availability), 3), "stock_unit": stock.unit,
                                "estimated_cost": round_to(cost) if cost else None})
        recipes.append({"id": item.id, "item": item.name, "category": item_category(ctx, item.id),
                        "selling_price": to_float(item.unit_price),
                        "estimated_cost": round_to(sum(i["estimated_cost"] or 0 for i in ingredients)),
                        "ingredients": ingredients})
    return {"recipes": sorted(recipes, key=lambda r: str(r["item"]))}


# ============================================================================ trace (drill-down)
_TRACE_FIELDS = {
    "channel": lambda o: o.service.value, "service": lambda o: o.service.value, "area": lambda o: o.area,
    "table": lambda o: o.table_name, "handler": lambda o: o.employee, "weekday": lambda o: o.weekday,
    "status": lambda o: o.status_label,
}


def build_trace(ctx: AnalyticsContext, kind: str, value: str) -> dict:
    if kind in ("stock", "recipe"):
        ids = {k for k, i in ctx.inventory.items() if i.name == value}
        txns = sorted((t for t in period_transactions(ctx) if as_key(t.stock_item_id) in ids),
                      key=transaction_time, reverse=True)
        return {"total": len(txns), "note": "Stock ledger entries for the selected dates.",
                "transactions": [{"transaction_id": t.id, "date": str(transaction_time(t)),
                                  "movement": (t.movement_type or "").upper(), "quantity": to_float(t.quantity),
                                  "unit": t.unit, "reference": t.reference_id,
                                  "before": t.before_stock, "after": t.after_stock}
                                 for t in txns[:MAX_DRILLDOWN_ROWS]]}

    def matches(order) -> bool:
        if kind in _TRACE_FIELDS:
            return str(_TRACE_FIELDS[kind](order)).lower() == value.lower()
        if kind == "hour":
            hour = order.created_dt.hour if order.created_dt else ""
            return period_label(order.created_dt, Grain.hour) == value or str(hour) == value
        if kind == "month":
            return order.day[:7] == value[:7]
        if kind == "day":
            return order.day == value[:10]
        if kind == "item":
            return any(line_name(ctx, l) == value for l in lines_of(ctx, order))
        if kind == "category":
            return any(line_category(ctx, l) == value for l in lines_of(ctx, order))
        if kind == "invoice":
            return any(d.number == value and d.order_id == as_key(order.id) for d in ctx.documents)
        return False

    hits = sorted((o for o in ctx.orders if matches(o)), key=lambda o: o.created_dt or datetime.min, reverse=True)
    docs_by_order = {d.order_id: d for d in ctx.documents if d.order_id}
    rows = []
    for order in hits[:MAX_DRILLDOWN_ROWS]:
        doc = docs_by_order.get(as_key(order.id))
        rows.append({
            "order": order.display_id, "date": str(order.created_dt), "status": order.status_label,
            "order_value": to_float(order.total_price), "table": order.table_name, "area": order.area,
            "handler": order.employee, "invoice": doc.number if doc else None,
            "payment_status": doc.payment_status.value if doc else None,
            "items": [{"item": line_name(ctx, l), "quantity": l.quantity, "status": l.status_label,
                       "line_total": to_float(l.line_total)} for l in lines_of(ctx, order)]})
    return {"total": len(hits), "note": "Orders behind this row, newest first.", "transactions": rows}


# ============================================================================ orders / operations
def build_demand_trends(ctx: AnalyticsContext) -> dict:
    live = [o for o in ctx.orders if o.order_status != CANCELLED]
    return {"trends": {g.value: build_trend_rows([(o.created_dt, 1) for o in live], g, "orders") for g in GRAINS}}


def _case_row(ctx: AnalyticsContext, order) -> dict:
    return {
        "id": order.display_id, "status": order.status_label,
        "kind": "cancel" if order.order_status == CANCELLED else "open",
        "service": order.service.value, "area": order.area, "table": order.table_name,
        "items": [{"name": line_name(ctx, l), "status": l.status_label, "counter": line_kitchen(ctx, l)}
                  for l in lines_of(ctx, order)],
        "order_taker": resolve_employee(ctx.user_names, order.created_by, UNKNOWN),
        "assigned_handler": resolve_employee(ctx.user_names, order.handler_id),
        "last_updated_by": resolve_employee(ctx.user_names, order.updated_by, NOT_RECORDED),
        "created_at": str(order.created_dt or ""), "updated_at": str(order.updated_dt or ""),
        "age_minutes": minutes_since(order.created_dt),
    }


def _lifetime_minutes(order) -> Optional[float]:
    if order.order_status != SERVED or not order.created_dt or not order.updated_dt:
        return None
    minutes = (order.updated_dt - order.created_dt).total_seconds() / 60
    return minutes if minutes >= 0 else None


def build_operations(ctx: AnalyticsContext) -> dict:
    orders = ctx.orders
    counts = Counter(o.order_status for o in orders)
    pairs = [(l, o) for o in orders for l in lines_of(ctx, o)]

    order_dimensions = {name: build_status_rows(orders, fn, _status_label_of, NATURAL_GROUPS.get(name))
                        for name, fn in ORDER_GROUPERS.items()}
    pair_groupers = {name: (lambda p, fn=fn: fn(p[1])) for name, fn in ORDER_GROUPERS.items()}
    pair_groupers["category"] = lambda p: line_category(ctx, p[0])
    pair_groupers["item"] = lambda p: line_name(ctx, p[0])
    pair_groupers["kitchen"] = lambda p: line_kitchen(ctx, p[0])

    category_of = {}
    for line, _ in pairs:
        category_of.setdefault(line_name(ctx, line), line_category(ctx, line))
    item_meta = lambda name: {"category": category_of.get(name, "")}
    item_dimensions = {name: build_status_rows(pairs, fn, lambda p: p[0].status_label, NATURAL_GROUPS.get(name),
                                               meta=item_meta if name == "item" else None)
                       for name, fn in pair_groupers.items()}

    timed = [o for o in orders if _lifetime_minutes(o) is not None]
    timed_pairs = [(l, o) for o in timed for l in live_lines(ctx, o)]
    timing = {"pending_to_served": {}, "preparing_to_ready": {}}
    for name in ("service", "area", "table", "employee"):
        timing["pending_to_served"][name] = build_timing_rows(timed, ORDER_GROUPERS[name], _lifetime_minutes)
    for name in ("category", "item", "kitchen"):
        timing["pending_to_served"][name] = build_timing_rows(
            timed_pairs, pair_groupers[name], lambda p: _lifetime_minutes(p[1]),
            meta=item_meta if name == "item" else None)

    attention = [o for o in orders if o.order_status in (*OPEN_STATUSES, CANCELLED)]
    attention.sort(key=lambda o: o.created_dt or datetime.min, reverse=True)
    cases = [_case_row(ctx, o) for o in attention[:MAX_DIAGNOSTIC_CASES]]
    return {
        "kpis": {"orders": len(orders), **{s.value: counts[s] for s in REPORTED_STATUSES}},
        "order_dimensions": order_dimensions, "item_dimensions": item_dimensions,
        "synthetic_timing_dimensions": timing, "diagnostic_cases": cases,
        "diagnostic_insights": _operations_insights(ctx, orders, cases),
    }


def _operations_insights(ctx: AnalyticsContext, orders, cases) -> list:
    insights = []
    cancelled = [o for o in orders if o.order_status == CANCELLED]
    if cancelled:
        area, count = Counter(o.area for o in cancelled).most_common(1)[0]
        insights.append({
            "key": "cancel", "label": "CANCELLATIONS", "title": f"Most cancellations are in {area}",
            "finding": f"{count} of {len(cancelled)} cancelled orders ({round_to(100 * count / len(cancelled), 0):.0f}%) were placed in {area}.",
            "basis": "Counted from cancelled orders in the selected filters.",
            "question": "The reason for each cancellation is not recorded.",
            "rows": [c for c in cases if c["kind"] == "cancel" and c["area"] == area][:20]})
    slowest = sorted((o for o in orders if _lifetime_minutes(o) is not None), key=_lifetime_minutes, reverse=True)[:10]
    if slowest:
        insights.append({
            "key": "slow", "label": "SLOW ORDERS", "title": "Longest order lifetimes",
            "finding": f"The slowest served order took {_lifetime_minutes(slowest[0]):.0f} minutes from creation to last update.",
            "basis": "Last update time minus creation time on served orders.",
            "question": "Stage-by-stage kitchen timings are not recorded.",
            "rows": [_case_row(ctx, o) for o in slowest]})
    oldest = sorted((c for c in cases if c["kind"] == "open" and c["age_minutes"] is not None),
                    key=lambda c: -c["age_minutes"])[:20]
    open_names = ", ".join(s.value.title() for s in OPEN_STATUSES)
    insights.append({
        "key": "open", "label": "OPEN ORDERS",
        "title": f"{len(oldest)} oldest unfinished orders" if oldest else "No unfinished orders",
        "finding": (f"The oldest open order was created {oldest[0]['age_minutes']:.0f} minutes ago." if oldest
                    else f"No {open_names} orders in the selected filters."),
        "basis": "Age is measured from the creation time to now.",
        "question": "Whether delays come from staffing or kitchen capacity is not recorded.", "rows": oldest})
    return insights


# ============================================================================ services (floor)
def build_services(ctx: AnalyticsContext) -> dict:
    dining = [t for t in ctx.tables.values() if is_dining_table(t)]
    latest_use = {}
    for order in ctx.all_orders:
        if order.order_status != CANCELLED and order.created_dt:
            key = as_key(order.table_id)
            if key not in latest_use or order.created_dt > latest_use[key]:
                latest_use[key] = order.created_dt
    areas = defaultdict(list)
    for table in dining:
        areas[str(table.section or NOT_RECORDED)].append(table)

    floor, availability, vacant_list, diagnostic, long_usage = [], [], [], [], []
    for area, tables in sorted(areas.items()):
        occupied = [t for t in tables if table_status(t) == TableStatus.occupied]
        vacant = [t for t in tables if table_status(t) == TableStatus.vacant]
        seat_counts = [s for s in (parse_seat_count(t) for t in tables) if s is not None]
        floor.append({"area": area, "total_tables": len(tables),
                      "seating_capacity": sum(seat_counts) if seat_counts else None,
                      "occupied": len(occupied), "vacant": len(vacant), "other": len(tables) - len(occupied) - len(vacant),
                      "occupancy_pct": round_to(100 * len(occupied) / len(tables), 1) if tables else 0})
        diagnostic.append({"area": area, "occupied_tables": [str(t.name) for t in occupied],
                           "vacant_tables": [str(t.name) for t in vacant]})
        for table in tables:
            is_occupied = table_status(table) == TableStatus.occupied
            usage = minutes_since(latest_use.get(as_key(table.id))) if is_occupied else None
            is_vacant = table_status(table) == TableStatus.vacant
            availability.append({"area": area, "table": table.name, "seats": parse_seat_count(table),
                                 "status": str(table.status or UNKNOWN).title(),
                                 "usage_time": f"{usage:.0f} min" if usage is not None else None,
                                 "expected_available": "Now" if is_vacant else NOT_RECORDED})
            if usage is not None:
                long_usage.append({"area": area, "table": table.name, "minutes": round_to(usage, 0)})
            if is_vacant:
                vacant_list.append({"area": area, "table": table.name, "seats": parse_seat_count(table)})

    occupied_total = sum(1 for t in dining if table_status(t) == TableStatus.occupied)
    pcts = [f["occupancy_pct"] for f in floor]
    return {
        "kpis": {"dining_areas": len(areas), "configured_tables": len(dining), "occupied_tables": occupied_total,
                 "vacant_tables": sum(1 for t in dining if table_status(t) == TableStatus.vacant),
                 "occupancy_pct": round_to(100 * occupied_total / len(dining), 1) if dining else 0},
        "floor_capacity": floor, "table_availability": availability, "vacant_table_list": vacant_list,
        "diagnostic_services": {"floor": diagnostic,
                                "occupancy_spread_pct": round_to(max(pcts) - min(pcts), 1) if pcts else 0,
                                "long_usage": long_usage},
    }


# ============================================================================ menu
def build_menu(ctx: AnalyticsContext) -> dict:
    live = [(l, o) for o in ctx.orders for l in live_lines(ctx, o)]
    ordered_ids = {as_key(l.item_id) for l, _ in live}
    dimensions = [("service", lambda o: o.service.value), ("area", lambda o: o.area)] + \
                 [(g.value, (lambda o, g=g: period_label(o.created_dt, g))) for g in GRAINS]
    quantity_dimensions = {}
    for name, group_fn in dimensions:
        totals = defaultdict(float)
        for line, order in live:
            totals[(group_fn(order), line_name(ctx, line), line_category(ctx, line))] += line_quantity(line)
        quantity_dimensions[name] = [{"group": g, "item": i, "category": c, "quantity": round_to(v)}
                                     for (g, i, c), v in totals.items()]

    cancelled = defaultdict(lambda: {"orders": set(), "lines": 0})
    for order in ctx.orders:
        for line in lines_of(ctx, order):
            if line.order_status == CANCELLED:
                entry = cancelled[(line_category(ctx, line), line_name(ctx, line))]
                entry["orders"].add(order.id)
                entry["lines"] += 1

    not_ordered = [{"category": item_category(ctx, k), "item": i.name, "code": i.code}
                   for k, i in ctx.menu_items.items() if k not in ordered_ids]
    top = Counter()
    for line, _ in live:
        top[line_name(ctx, line)] += line_quantity(line)
    recommendations = []
    if top:
        name, qty = top.most_common(1)[0]
        recommendations.append({"title": f"Protect availability of {name}",
                                "action": f"{name} is the most ordered dish ({qty:.0f} portions). Keep it in stock during peak hours.",
                                "evidence": "Ordered quantity from non-cancelled lines in the selected filters."})
    if not_ordered:
        recommendations.append({"title": f"{len(not_ordered)} menu items had no orders",
                                "action": "Review whether these items should be promoted, repriced or removed.",
                                "evidence": "Menu items with no non-cancelled order lines in the selected filters."})
    return {
        "kpis": {"categories": len(ctx.categories), "items": len(ctx.menu_items), "ordered_items": len(ordered_ids),
                 "portions_served": round_to(sum(line_quantity(l) for l, _ in live if l.order_status == SERVED)),
                 "not_ordered": len(not_ordered), "cancelled_lines": sum(c["lines"] for c in cancelled.values())},
        "quantity_dimensions": quantity_dimensions,
        "trends": {g.value: build_trend_rows([(o.created_dt, line_quantity(l)) for l, o in live], g, "portions")
                   for g in GRAINS},
        "item_timing_dimensions": {"pending_to_served": {}, "preparing_to_ready": {}},
        "diagnostic": {"not_ordered": not_ordered,
                       "cancellation_items": [{"category": c, "item": i, "orders": len(v["orders"]),
                                               "cancelled_lines": v["lines"]}
                                              for (c, i), v in sorted(cancelled.items(), key=lambda x: -x[1]["lines"])]},
        "recommendations": recommendations,
    }


# ============================================================================ billing
def build_billing(ctx: AnalyticsContext) -> dict:
    documents = period_documents(ctx)
    statuses = [s.value for s in PaymentStatusEnum]
    billed = sum(d.amount for d in documents)
    paid = sum(d.amount for d in documents if d.is_paid)

    def dimension(group_fn):
        groups = {}
        for doc in documents:
            name = str(group_fn(doc))
            row = groups.setdefault(name, {"name": name, "total": 0, "amount": 0, **{s: 0 for s in statuses}})
            row["total"] += 1
            row["amount"] += doc.amount
            row[doc.payment_status.value] += 1
        for row in groups.values():
            row["amount"] = round_to(row["amount"])
            for s in statuses:
                row[f"{s}_pct"] = round_to(100 * row[s] / row["total"], 1)
        return sorted(groups.values(), key=lambda r: -r["total"])

    trends = {}
    for grain in GRAINS:
        counts, amounts = defaultdict(int), defaultdict(float)
        for doc in documents:
            label = period_label(doc.doc_dt, grain)
            counts[label] += 1
            amounts[label] += doc.amount
        rows, previous = [], None
        for label in sort_periods(counts, grain):
            rows.append({"name": label, "invoices": counts[label], "amount": round_to(amounts[label]),
                         "previous": previous,
                         "change_pct": round_to(100 * (amounts[label] - previous) / previous, 1) if previous else None})
            previous = amounts[label]
        trends[grain.value] = rows

    return {
        "kpis": {"invoices": len(documents), "billed": round_to(billed), "paid_recorded": round_to(paid),
                 "not_marked_paid": round_to(billed - paid),
                 "average_bill": round_to(billed / len(documents)) if documents else 0,
                 "tax": round_to(sum(to_float(d.tax_amount) for d in documents)),
                 "discount": round_to(sum(to_float(d.discount_amount) for d in documents))},
        "dimensions": {"service": dimension(lambda d: d.service), "area": dimension(lambda d: d.area),
                       "table": dimension(lambda d: d.table_label), "employee": dimension(lambda d: d.employee),
                       "method": dimension(lambda d: d.method_label)},
        "statuses": statuses, "trends": trends,
        "invoices": [{"number": d.number, "order_id": d.order_id, "date": d.day, "service": d.service,
                      "method": d.method_label, "status": d.payment_status.value, "amount": round_to(d.amount)}
                     for d in sorted(documents, key=lambda d: d.day, reverse=True)],
    }


def build_billing_live(ctx: AnalyticsContext, status: Optional[str]) -> dict:
    f = ctx.filters
    documents = [d for d in ctx.documents if d.doc_day and f.start <= d.doc_day <= f.end]
    if status and status != ALL:
        documents = [d for d in documents if d.payment_status.value.lower() == status.lower()]

    def group(key_fn):
        return [{"name": k, "total": sum(1 for d in documents if key_fn(d) == k),
                 "amount": round_to(sum(d.amount for d in documents if key_fn(d) == k))}
                for k in sorted({key_fn(d) for d in documents})]

    amount = sum(d.amount for d in documents)
    paid = sum(d.amount for d in documents if d.is_paid)
    return {
        "note": "Read directly from the billing documents for the selected dates.",
        "kpis": {"documents": len(documents), "amount": round_to(amount), "paid_amount": round_to(paid),
                 "outstanding": round_to(amount - paid),
                 "pending_approval": sum(1 for d in documents if d.approval_status == ApprovalStatusEnum.pending)},
        "statuses": [s.value for s in PaymentStatusEnum],
        "by_payment_status": group(lambda d: d.payment_status.value),
        "by_payment_method": group(lambda d: d.method_label),
        "documents": [{"id": d.id, "number": d.number, "date": d.day, "type": d.document_type or "Invoice",
                       "order_id": d.order_id, "payment_status": d.payment_status.value,
                       "payment_method": d.method_label, "payment_due_date": iso_date(d.payment_due_date) or None,
                       "approval_status": d.approval_status.value, "amount": d.amount}
                      for d in sorted(documents, key=lambda d: d.day, reverse=True)],
    }


def build_billing_items(ctx: AnalyticsContext, document_id: str) -> dict:
    doc = next((d for d in ctx.documents if as_key(d.id) == as_key(document_id)), None)
    if not doc:
        raise HTTPException(404, "Billing document not found")
    rows = ctx.db.query(BillingDocumentItemEntity).filter(BillingDocumentItemEntity.document_id == doc.id).all()
    if rows:
        return {"items": [BillingDocumentItem.model_validate(r, from_attributes=True).model_dump(mode="json")
                          for r in rows]}
    order = ctx.orders_by_id.get(doc.order_id or "")
    return {"items": [{"item": line_name(ctx, l), "quantity": l.quantity, "unit_price": to_float(l.unit_price),
                       "line_total": to_float(l.line_total), "status": l.status_label}
                      for l in (lines_of(ctx, order) if order else [])]}


# ============================================================================ sales
@dataclass
class SalesFact:
    order: object
    line: Optional[object]
    sales: float
    net: float
    gst: float
    cost: float
    quantity: float


_SALES_METRICS = ("sales", "net", "gst", "cost", "quantity")


def _aggregate_facts(facts, group_fn, natural: Optional[Grain] = None) -> list:
    groups = {}
    for fact in facts:
        name = str(group_fn(fact))
        row = groups.setdefault(name, {"name": name, **{m: 0 for m in _SALES_METRICS}, "_orders": set()})
        for metric in _SALES_METRICS:
            row[metric] += getattr(fact, metric)
        row["_orders"].add(fact.order.id)
    rows = []
    for row in groups.values():
        row["orders"] = len(row.pop("_orders"))
        row["profit"] = row["net"] - row["cost"]
        base = row["net"] + row["gst"]
        for metric in ("net", "gst", "cost", "profit"):
            row[f"{metric}_pct"] = round_to(100 * row[metric] / base, 1) if base else 0
        for metric in ("sales", "net", "gst", "cost", "profit", "quantity"):
            row[metric] = round_to(row[metric])
        rows.append(row)
    if natural:
        order = sort_periods([r["name"] for r in rows], natural)
        rows.sort(key=lambda r: order.index(r["name"]))
    else:
        rows.sort(key=lambda r: -r["sales"])
    return rows


def build_sales(ctx: AnalyticsContext) -> dict:
    served = served_orders(ctx)
    order_facts, line_facts = [], []
    for order in served:
        totals = order_totals(ctx, order)
        lines = live_lines(ctx, order)
        order_facts.append(SalesFact(order, None, totals.sales, totals.net, totals.gst, totals.cost,
                                     sum(line_quantity(l) for l in lines)))
        gst_ratio = totals.gst / totals.net if totals.net > 0 else 0
        for line in lines:
            line_total = to_float(line.line_total)
            line_facts.append(SalesFact(order, line, line_total * (1 + gst_ratio), line_total, line_total * gst_ratio,
                                        unit_cost(ctx, line.item_id) * line_quantity(line), line_quantity(line)))

    line_groupers = {"item": lambda f: line_name(ctx, f.line), "category": lambda f: line_category(ctx, f.line),
                     "kitchen": lambda f: line_kitchen(ctx, f.line)}
    dimensions = {name: _aggregate_facts(order_facts, (lambda f, g=ORDER_GROUPERS[name]: g(f.order)),
                                         NATURAL_GROUPS.get(name))
                  for name in ("service", "area", "table", "employee", "hour")}
    dimensions.update({name: _aggregate_facts(line_facts, fn) for name, fn in line_groupers.items()})

    totals = {m: sum(getattr(f, m) for f in order_facts) for m in ("sales", "net", "gst", "cost")}
    profit = totals["net"] - totals["cost"]
    daily = defaultdict(lambda: {"sales": 0, "net": 0, "gst": 0, "cost": 0, "orders": 0})
    for fact in order_facts:
        day = daily[fact.order.day]
        for metric in ("sales", "net", "gst", "cost"):
            day[metric] += getattr(fact, metric)
        day["orders"] += 1
    return {
        "kpis": {"completed_orders": len(served), "sales_including_gst": round_to(totals["sales"]),
                 "sales_excluding_gst": round_to(totals["net"]), "gst": round_to(totals["gst"]),
                 "estimated_inventory_cost": round_to(totals["cost"]), "estimated_gross_profit": round_to(profit),
                 "estimated_gross_margin": round_to(100 * profit / totals["net"], 1) if totals["net"] else None},
        "dimensions": dimensions, "financial": dimensions,
        "daily": [{"date": d, **{m: round_to(v) for m, v in row.items()}} for d, row in sorted(daily.items())],
    }


# ============================================================================ inventory
def _raw_material_rows(ctx: AnalyticsContext) -> list:
    since = datetime.now() - timedelta(days=USAGE_WINDOW_DAYS)
    used = defaultdict(float)
    for txn in ctx.transactions:
        moment = transaction_time(txn)
        if is_outbound(txn) and moment and moment >= since:
            used[as_key(txn.stock_item_id)] += to_float(txn.quantity)
    rows = []
    for key, item in ctx.stock_items.items():
        available, monthly = to_float(item.availability), used.get(key, 0)
        cover = round_to(available / (monthly / USAGE_WINDOW_DAYS), 1) if monthly > 0 else None
        if available <= 0 or (cover is not None and cover < LOW_COVER_DAYS):
            health = StockHealth.purchase_required
        elif cover is not None and cover > EXCESS_COVER_DAYS:
            health = StockHealth.excess
        else:
            health = StockHealth.healthy
        rows.append({"name": item.name, "available": round_to(available, 3), "unit": item.unit,
                     "monthly_use": round_to(monthly, 3), "days_cover": cover, "status": health.value,
                     "stock_value": round_to(available * to_float(item.unit_cst))})
    return rows


def build_inventory_plan(ctx: AnalyticsContext) -> dict:
    sold = defaultdict(float)
    for order in served_orders(ctx):
        for line in live_lines(ctx, order):
            sold[as_key(line.item_id)] += line_quantity(line)
    plans = []
    for key, item in ctx.menu_items.items():
        specs = recipe_ingredients(item)
        if not specs:
            continue
        batch_plates = DEFAULT_BATCH_PLATES
        ingredients = []
        for spec in specs:
            stock = ctx.stock_items.get(as_key(spec.stock_item_id)) or ctx.inventory.get(as_key(spec.stock_item_id))
            if not stock:
                continue
            needed = convert_quantity(spec.quantity_required, spec.unit, stock.unit) * batch_plates
            available = to_float(stock.availability)
            ingredients.append({"ingredient": stock.name, "needed": round_to(needed, 3),
                                "available": round_to(available, 3), "unit": stock.unit,
                                "cost": round_to(needed * to_float(stock.unit_cst)),
                                "status": (IngredientReadiness.ready if available >= needed
                                           else IngredientReadiness.purchase_required).value})
        batch_cost = sum(i["cost"] for i in ingredients)
        remaining = max(to_float(item.availability), 0)
        served_qty, price = sold.get(key, 0), to_float(item.unit_price)
        plans.append({"name": item.name, "batch_plates": batch_plates, "batches": 0,
                      "prepared": round_to(served_qty + remaining), "served": round_to(served_qty),
                      "remaining": round_to(remaining), "batch_cost": round_to(batch_cost),
                      "cost_per_plate": round_to(batch_cost / batch_plates), "selling_price": price,
                      "ingredient_cost_pct": round_to(100 * (batch_cost / batch_plates) / price, 1) if price else 0,
                      "status": (PlanStatus.prepare_next if remaining <= REORDER_BATCH_RATIO * batch_plates
                                 else PlanStatus.sufficient).value,
                      "ingredients": ingredients})
    raw = _raw_material_rows(ctx)
    return {
        "kpis": {"menu_items": len(ctx.menu_items),
                 "batches": sum(1 for t in ctx.transactions if is_inbound(t) and as_key(t.stock_item_id) in ctx.menu_items),
                 "plates_prepared": round_to(sum(p["prepared"] for p in plans)),
                 "purchase_items": sum(1 for r in raw if r["status"] == StockHealth.purchase_required.value),
                 "excess_items": sum(1 for r in raw if r["status"] == StockHealth.excess.value),
                 "raw_stock_value": round_to(sum(r["stock_value"] for r in raw))},
        "plans": plans, "raw": raw, "shared": [],
        # InventoryTransaction has no unit-cost column, so purchase-price history cannot be derived yet.
        "purchase_prices": {"ingredients": [], "history": [], "frequency": []},
    }


def build_inventory_live(ctx: AnalyticsContext) -> dict:
    period = period_transactions(ctx)
    item_name = lambda t: (ctx.inventory.get(as_key(t.stock_item_id)) or None) and ctx.inventory[as_key(t.stock_item_id)].name
    by_type = defaultdict(lambda: {"count": 0, "items": set()})
    for txn in period:
        bucket = by_type[(str(txn.transaction_type or ""), (txn.movement_type or "").upper())]
        bucket["count"] += 1
        bucket["items"].add(as_key(txn.stock_item_id))
    received, used = defaultdict(float), defaultdict(float)
    for txn in ctx.transactions:
        (received if is_inbound(txn) else used)[as_key(txn.stock_item_id)] += to_float(txn.quantity)
    ledger = []
    for key in set(received) | set(used):
        item = ctx.inventory.get(key)
        if not item:
            continue
        balance = received[key] - used[key]
        ledger.append({"item": item.name, "unit": item.unit, "received": round_to(received[key], 3),
                       "used": round_to(used[key], 3), "ledger_balance": round_to(balance, 3),
                       "row_availability": round_to(to_float(item.availability), 3),
                       "difference": round_to(to_float(item.availability) - balance, 3)})
    recent = sorted(period, key=transaction_time, reverse=True)[:MAX_DRILLDOWN_ROWS]
    return {
        "note": "Read directly from the inventory and transaction tables.",
        "kpis": {"items": len(ctx.inventory),
                 "out_of_stock": sum(1 for i in ctx.inventory.values() if to_float(i.availability) <= 0),
                 "transactions_in_period": len(period),
                 "items_with_recipe": sum(1 for i in ctx.inventory.values() if i.recipe),
                 "ledger_mismatches": sum(1 for r in ledger if abs(r["difference"]) > 0.001)},
        "by_type": [{"type": t, "movement": m, "transactions": v["count"], "items": len(v["items"])}
                    for (t, m), v in by_type.items()],
        "recent": [{"date": str(transaction_time(t)), "item": item_name(t), "movement": (t.movement_type or "").upper(),
                    "type": t.transaction_type, "quantity": to_float(t.quantity), "unit": t.unit,
                    "before": t.before_stock, "after": t.after_stock, "remarks": format_remarks(t.remarks)}
                   for t in recent],
        "ledger": sorted(ledger, key=lambda r: -abs(r["difference"])),
        "items": [{"name": i.name, "inventory_id": i.inventory_id, "realm": i.realm,
                   "availability": to_float(i.availability), "unit": i.unit, "unit_cost": to_float(i.unit_cst),
                   "unit_price": to_float(i.unit_price), "has_recipe": bool(i.recipe)}
                  for i in ctx.inventory.values()],
    }


def build_inventory_items(ctx: AnalyticsContext, inventory_id: str) -> dict:
    wanted = inventory_id.strip().lower()
    rows = [i for i in ctx.inventory.values()
            if wanted == ALL or (i.inventory_id or "").strip().lower() == wanted]
    return {"inventory_id": inventory_id, "total": len(rows),
            "items": [{"id": i.id, "name": i.name, "inventory_id": i.inventory_id,
                       "category": item_category(ctx, i.id), "availability": i.availability, "unit": i.unit,
                       "unit_cost": i.unit_cst, "unit_price": i.unit_price, "has_recipe": bool(i.recipe)}
                      for i in rows]}


# ============================================================================ insights (complete history)
def build_insights(ctx: AnalyticsContext) -> dict:
    served = served_orders(ctx)
    facts = [(o, order_totals(ctx, o)) for o in served]
    sales = sum(t.net for _, t in facts)
    cost = sum(t.cost for _, t in facts)
    dates = [o.created_on for o in ctx.orders if o.created_on]
    history = {"start": iso_date(min(dates)) if dates else None, "end": iso_date(max(dates)) if dates else None,
               "calendar_days": (max(dates) - min(dates)).days + 1 if dates else 0,
               "completed_orders": len(served), "sales_ex_gst": round_to(sales), "estimated_cost": round_to(cost),
               "estimated_amount_after_cost": round_to(sales - cost)}

    findings, decisions = [], []
    by_weekday, by_hour, by_item = defaultdict(float), Counter(), defaultdict(float)
    for order, totals in facts:
        by_weekday[order.weekday] += totals.sales
        by_hour[period_label(order.created_dt, Grain.hour)] += 1
        for line in live_lines(ctx, order):
            by_item[line_name(ctx, line)] += to_float(line.line_total)
    if by_weekday:
        day, value = max(by_weekday.items(), key=lambda x: x[1])
        findings.append({"id": "wd", "topic": "Demand", "headline": f"{day} is the strongest sales day",
                         "detail": f"{day} brought {round_to(100 * value / sum(by_weekday.values()), 0):.0f}% of all completed sales.",
                         "evidence": {k: round_to(v) for k, v in by_weekday.items()}})
    if by_hour:
        hour, count = by_hour.most_common(1)[0]
        findings.append({"id": "hr", "topic": "Demand", "headline": f"Orders peak around {hour}",
                         "detail": f"{count} completed orders were placed in this hour, more than any other.",
                         "evidence": dict(by_hour.most_common(6))})
        decisions.append({"id": "dec_hr", "headline": f"Prepare for the {hour} peak",
                          "reason": "This hour has the highest recorded order count.",
                          "action": f"Schedule enough staff and pre-prepare popular items before {hour}.",
                          "measure": "Compare average order completion time in this hour before and after the change.",
                          "outcome": "Shorter waits are possible, but no sales increase is promised.",
                          "evidence": dict(by_hour.most_common(3)),
                          "assumptions": ["Past hourly patterns continue.",
                                          "Kitchen timing is not recorded, so delays are not measured."]})
    if by_item:
        top = sorted(by_item.items(), key=lambda x: -x[1])[:5]
        findings.append({"id": "top", "topic": "Menu", "headline": f"{top[0][0]} leads sales",
                         "detail": f"The top 5 items bring {round_to(100 * sum(v for _, v in top) / sum(by_item.values()), 0):.0f}% of item sales.",
                         "evidence": {k: round_to(v) for k, v in top}})
    thin = []
    for key, item in ctx.menu_items.items():
        price, item_cost = to_float(item.unit_price), unit_cost(ctx, key)
        if price and item_cost / price > HIGH_COST_SHARE:
            thin.append((item.name, round_to(100 * item_cost / price, 1)))
    if thin:
        thin.sort(key=lambda x: -x[1])
        decisions.append({"id": "dec_margin", "headline": "Some dishes carry a high ingredient cost share",
                          "reason": f"{len(thin)} menu items cost more than {HIGH_COST_SHARE:.0%} of their price in ingredients.",
                          "action": f"Review price, portion or recipe for {thin[0][0]} first.",
                          "measure": "Track the ingredient cost share and unit sales of these items for a month.",
                          "outcome": "Margins may improve; demand effects of a price change are not predicted.",
                          "evidence": dict(thin[:8]),
                          "assumptions": ["Unit costs come from inventory records, not supplier invoices."]})
    cancelled_by_area = Counter(o.area for o in ctx.orders if o.order_status == CANCELLED)
    if cancelled_by_area:
        area, count = cancelled_by_area.most_common(1)[0]
        findings.append({"id": "canc", "topic": "Operations", "headline": f"Cancellations cluster in {area}",
                         "detail": f"{count} of {sum(cancelled_by_area.values())} cancelled orders were in {area}.",
                         "evidence": dict(cancelled_by_area)})
    return {"history": history, "findings": findings, "decisions": decisions,
            "limitations": ["Cancellation reasons and kitchen stage timings are not recorded.",
                            "Costs use inventory unit costs, not supplier invoices.",
                            "Operating expenses are not available, so net profit cannot be calculated."]}