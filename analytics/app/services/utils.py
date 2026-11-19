import logging
import re
import statistics
from collections import defaultdict
from datetime import datetime
from typing import Any, Callable, Iterable, List, Optional

from models.order_model import OrderStatusEnum, resolve_base_status
from utils.transaction import _convert

from .constants import (
    NOT_RECORDED, SERVICE_BY_TABLE_TYPE, STATUS_ALIASES, STATUS_LABELS, UNKNOWN, WEEKDAY_NAMES, Grain,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------- scalars
def to_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def round_to(value: float, places: int = 2) -> float:
    return round(value, places)


def as_key(value: Any) -> str:
    return "" if value is None else str(value)


def to_naive(dt: Optional[datetime]) -> Optional[datetime]:
    return dt.replace(tzinfo=None) if dt else None


def iso_date(value) -> str:
    return value.isoformat() if value else ""


def minutes_since(dt: Optional[datetime]) -> Optional[float]:
    return round_to((datetime.now() - dt).total_seconds() / 60, 1) if dt else None


def hour_in_window(hour: int, window: tuple) -> bool:
    start, end = window
    return start <= hour < end if start < end else (hour >= start or hour < end)


# ---------------------------------------------------------------- status
def normalize_order_status(raw: Any, auth=None) -> Optional[OrderStatusEnum]:
    """Realm-specific / legacy status text -> OrderStatusEnum (None when unknown)."""
    value = str(getattr(raw, "value", raw) or "").strip()
    if not value:
        return None
    base = resolve_base_status(auth, value) if auth is not None else value
    try:
        status = OrderStatusEnum(str(base).lower())
    except ValueError:
        return None
    return STATUS_ALIASES.get(status, status)


def status_label(status: Optional[OrderStatusEnum]) -> str:
    return status.value.title() if status else UNKNOWN


# ---------------------------------------------------------------- units / people
def convert_quantity(quantity: float, from_unit: Optional[str], to_unit: Optional[str]) -> float:
    if not from_unit or not to_unit or from_unit == to_unit:
        return quantity
    try:
        return _convert(quantity, from_unit, to_unit)
    except Exception:
        logger.warning("Unit conversion %s -> %s failed; using unconverted quantity", from_unit, to_unit)
        return quantity


def resolve_employee(user_names: dict, user_id: Any, default: str = "Unassigned") -> str:
    if user_id in (None, ""):
        return default
    return user_names.get(as_key(user_id), as_key(user_id))


def parse_seat_count(table) -> Optional[int]:
    raw = (table.table_type or "").strip().lower()
    if not raw or raw in SERVICE_BY_TABLE_TYPE:
        return None
    match = re.search(r"\d+", raw)
    return int(match.group()) if match else None


# ---------------------------------------------------------------- text formatting
def format_remarks(value: Any) -> Optional[str]:
    """'[ITEM] Order #1589 | CHICKEN LOLLYPOP x2' -> 'Order #1589 · Chicken Lollypop × 2'"""
    if value in (None, ""):
        return None
    text = re.sub(r"^\s*\[[^\]]*\]\s*", "", str(value).strip())
    parts = []
    for part in (p.strip() for p in text.split("|")):
        if not part:
            continue
        match = re.match(r"^(.*?)\s*[x×]\s*(\d+(?:\.\d+)?)$", part, re.I)
        if match:
            name = match.group(1).strip()
            part = f"{name.title() if name.isupper() else name} × {match.group(2)}"
        elif not re.match(r"^order\b", part, re.I):
            part = part.title() if part.isupper() else part
        parts.append(part)
    return " · ".join(parts) or None


def payment_method_label(methods: Optional[List[dict]]) -> str:
    """[{'amount': 519.2, 'method': 'Cash'}] -> 'Cash' (split payments -> 'Cash, Card')."""
    names: List[str] = []
    for entry in methods or []:
        name = str(entry.get("method") or "").strip() if isinstance(entry, dict) else ""
        if name and name.lower() not in (n.lower() for n in names):
            names.append(name)
    return ", ".join(names) or NOT_RECORDED


# ---------------------------------------------------------------- time grouping
def period_label(dt: Optional[datetime], grain: Grain) -> str:
    if not dt:
        return UNKNOWN
    if grain == Grain.hour:
        return f"{dt.hour:02d}:00"
    if grain == Grain.weekday:
        return dt.strftime("%A")
    if grain == Grain.day:
        return dt.strftime("%Y-%m-%d")
    if grain == Grain.week:
        year, week, _ = dt.isocalendar()
        return f"{year}-W{week:02d}"
    return dt.strftime("%Y-%m")


def sort_periods(names: Iterable[str], grain: Grain) -> List[str]:
    if grain == Grain.weekday:
        return sorted(names, key=lambda n: WEEKDAY_NAMES.index(n) if n in WEEKDAY_NAMES else 99)
    return sorted(names)


# ---------------------------------------------------------------- order groupers (shared by many reports)
ORDER_GROUPERS = {
    "service": lambda o: o.service.value,
    "area": lambda o: o.area,
    "table": lambda o: f"{o.area} / {o.table_name}",
    "employee": lambda o: o.employee,
    "hour": lambda o: period_label(o.created_dt, Grain.hour),
    "weekday": lambda o: o.weekday,
    "month": lambda o: period_label(o.created_dt, Grain.month),
}
NATURAL_GROUPS = {"hour": Grain.hour, "weekday": Grain.weekday, "month": Grain.month}


# ---------------------------------------------------------------- row builders
def build_trend_rows(pairs, grain: Grain, field: str) -> List[dict]:
    """pairs: iterable of (datetime, value) -> chronological rows with previous / change_pct."""
    totals = defaultdict(float)
    for dt, value in pairs:
        totals[period_label(dt, grain)] += value
    rows, previous = [], None
    for name in sort_periods(totals, grain):
        value = totals[name]
        rows.append({"name": name, field: round_to(value), "previous": previous,
                     "change_pct": round_to(100 * (value - previous) / previous, 1) if previous else None})
        previous = value
    return rows


def build_status_rows(records, group_fn: Callable, status_fn: Callable,
                      natural: Optional[Grain] = None, meta: Optional[Callable] = None) -> List[dict]:
    groups = {}
    for record in records:
        name = str(group_fn(record))
        row = groups.get(name)
        if row is None:
            row = groups[name] = {"name": name, "total": 0, **{label: 0 for label in STATUS_LABELS}}
            if meta:
                row.update(meta(name))
        row["total"] += 1
        label = status_fn(record)
        if label in STATUS_LABELS:
            row[label] += 1
    rows = list(groups.values())
    for row in rows:
        for label in STATUS_LABELS:
            row[f"{label}_pct"] = round_to(100 * row[label] / row["total"], 1) if row["total"] else 0
    if natural:
        order = sort_periods([r["name"] for r in rows], natural)
        rows.sort(key=lambda r: order.index(r["name"]))
    else:
        rows.sort(key=lambda r: -r["total"])
    return rows


def build_timing_rows(records, group_fn: Callable, minutes_fn: Callable, meta: Optional[Callable] = None) -> List[dict]:
    groups = defaultdict(list)
    for record in records:
        minutes = minutes_fn(record)
        if minutes is not None:
            groups[str(group_fn(record))].append(minutes)
    rows = []
    for name, values in groups.items():
        row = {"name": name, "count": len(values), "avg_minutes": round_to(sum(values) / len(values), 1),
               "median_minutes": round_to(statistics.median(values), 1),
               "min_minutes": round_to(min(values), 1), "max_minutes": round_to(max(values), 1)}
        if meta:
            row.update(meta(name))
        rows.append(row)
    return sorted(rows, key=lambda r: -r["count"])