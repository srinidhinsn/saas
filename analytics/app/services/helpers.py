import os
import re
import json
import ast
import statistics
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import inspect as sa_inspect
from utils.transaction import _convert
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# CONSTANTS
# ============================================================================
TIMEZONE = os.getenv("TIMEZONE", "UTC")
MENU_ID = os.getenv('MENU_INVENTORY_ID', 'menu').strip().lower()
STOCK_ID = os.getenv('STOCK_INVENTORY_ID', 'ration_inventory').strip().lower()
STATUSES = ['Served', 'Pending', 'Preparing', 'Ready', 'Cancelled']
WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
SERVICE = {'walk-in': 'Walk-in', 'walkin': 'Walk-in', 'walk in': 'Walk-in',
           'takeaway': 'Takeaway', 'delivery': 'Delivery'}
SERVICE_ID = {'Dine-in': 'dinein', 'Walk-in': 'walkin', 'Takeaway': 'takeaway', 'Delivery': 'delivery'}
PAID = ('paid', 'success', 'completed', 'captured')


# ============================================================================
# SMALL HELPERS
# ============================================================================
def _clean(v):
    return float(v) if isinstance(v, Decimal) else v


def _row(obj) -> dict:
    return {a.key: _clean(getattr(obj, a.key)) for a in sa_inspect(obj).mapper.column_attrs}


def num(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def rd(v, p=2):
    return round(v, p)


def key(v) -> str:
    return '' if v is None else str(v)


def pick(row: dict, *names, default=None):
    """First non-null value among several possible column names."""
    for nme in names:
        v = row.get(nme)
        if v is not None:
            return v
    return default


def fmt_remarks(v):
    """'[ITEM] Order #1589 | CHICKEN LOLLYPOP x2' -> 'Order #1589 · Chicken Lollypop × 2'"""
    if v in (None, ''):
        return None
    s = re.sub(r'^\s*\[[^\]]*\]\s*', '', str(v).strip())   # drop leading [TAG]
    out = []
    for part in (p.strip() for p in s.split('|')):
        if not part:
            continue
        m = re.match(r'^(.*?)\s*[x×]\s*(\d+(?:\.\d+)?)$', part, re.I)   # "NAME x2"
        if m:
            name = m.group(1).strip()
            name = name.title() if name.isupper() else name
            part = f'{name} × {m.group(2)}'
        elif not re.match(r'^order\b', part, re.I):
            part = part.title() if part.isupper() else part
        out.append(part)
    return ' · '.join(out) or None


def pay_method(v) -> str:
    """[{'amount': 519.2, 'method': 'Cash'}] -> 'Cash'  (split payments -> 'Cash, Card')"""
    if v in (None, '', [], {}):
        return 'Not recorded'
    if isinstance(v, str):
        s = v.strip()
        if not s.startswith(('[', '{')):
            return s or 'Not recorded'
        try:
            v = json.loads(s)
        except ValueError:
            try:
                v = ast.literal_eval(s)
            except (ValueError, SyntaxError):
                return s
    if isinstance(v, dict):
        v = [v]
    if isinstance(v, list):
        names = []
        for x in v:
            m = x.get('method') if isinstance(x, dict) else x
            m = str(m).strip() if m else ''
            if m and m.lower() not in [n.lower() for n in names]:
                names.append(m)
        return ', '.join(names) or 'Not recorded'
    return str(v)


def parse_dt(v) -> Optional[datetime]:
    if v is None or v == '':
        return None
    if not isinstance(v, datetime):
        try:
            v = datetime.fromisoformat(str(v).replace('Z', '+00:00'))
        except ValueError:
            return None
    return v.replace(tzinfo=None)


def day(dt) -> str:
    return dt.strftime('%Y-%m-%d') if dt else ''


def age_min(dt) -> Optional[float]:
    return rd((datetime.now() - dt).total_seconds() / 60, 1) if dt else None


def norm_status(v) -> str:
    s = str(getattr(v, 'value', v) or '').strip()
    low = s.lower()
    if low in ('served', 'completed'):
        return 'Served'
    if low in ('cancelled', 'canceled'):
        return 'Cancelled'
    return s.title() if s else 'Unknown'


def convert(q, frm, to):
    if not frm or not to or frm == to or _convert is None:
        return q
    try:
        return _convert(q, frm, to)
    except Exception:
        return q


def seats(t: dict):
    raw = str(t.get('table_type') or '').strip().lower()
    if not raw or raw in SERVICE:
        return None
    m = re.search(r'\d+', raw)
    return int(m.group()) if m else None


def gkey(dt, grain):
    if not dt:
        return 'Unknown'
    if grain == 'hour':
        return f'{dt.hour:02d}:00'
    if grain == 'weekday':
        return dt.strftime('%A')
    if grain == 'day':
        return dt.strftime('%Y-%m-%d')
    if grain == 'week':
        y, w, _ = dt.isocalendar()
        return f'{y}-W{w:02d}'
    return dt.strftime('%Y-%m')


def sort_names(names, grain):
    if grain == 'weekday':
        return sorted(names, key=lambda x: WEEKDAYS.index(x) if x in WEEKDAYS else 99)
    return sorted(names)


def trend_rows(pairs, grain, field):
    """pairs: iterable of (datetime, value) -> chronological rows with previous / change_pct."""
    d = defaultdict(float)
    for dt, v in pairs:
        d[gkey(dt, grain)] += v
    rows, prev = [], None
    for k in sort_names(list(d), grain):
        v = d[k]
        rows.append({'name': k, field: rd(v), 'previous': prev,
                     'change_pct': rd(100 * (v - prev) / prev, 1) if prev else None})
        prev = v
    return rows


ORDER_KEYS = {
    'service': lambda o: o['_service'],
    'area': lambda o: o['_area'],
    'table': lambda o: f"{o['_area']} / {o['_table']}",
    'employee': lambda o: o['_employee'],
    'hour': lambda o: gkey(o['_dt'], 'hour'),
    'weekday': lambda o: o['_weekday'],
    'month': lambda o: gkey(o['_dt'], 'month'),
}
NATURAL = {'hour': 'hour', 'weekday': 'weekday', 'month': 'month'}


def status_rows(recs, keyf, statusf, natural=None, meta=None):
    d = {}
    for x in recs:
        k = str(keyf(x))
        row = d.get(k)
        if row is None:
            row = d[k] = {'name': k, 'total': 0, **{s: 0 for s in STATUSES}}
            if meta:
                row.update(meta(k))
        row['total'] += 1
        s = statusf(x)
        if s in STATUSES:
            row[s] += 1
    rows = list(d.values())
    for row in rows:
        for s in STATUSES:
            row[s + '_pct'] = rd(100 * row[s] / row['total'], 1) if row['total'] else 0
    if natural:
        order = sort_names([x['name'] for x in rows], natural)
        rows.sort(key=lambda x: order.index(x['name']))
    else:
        rows.sort(key=lambda x: -x['total'])
    return rows


def timing_rows(recs, keyf, minutes, meta=None):
    g = defaultdict(list)
    for x in recs:
        m = minutes(x)
        if m is not None:
            g[str(keyf(x))].append(m)
    rows = []
    for k, v in g.items():
        row = {'name': k, 'count': len(v), 'avg_minutes': rd(sum(v) / len(v), 1),
               'median_minutes': rd(statistics.median(v), 1),
               'min_minutes': rd(min(v), 1), 'max_minutes': rd(max(v), 1)}
        if meta:
            row.update(meta(k))
        rows.append(row)
    return sorted(rows, key=lambda x: -x['count'])