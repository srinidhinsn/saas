import os, re
from datetime import datetime, timedelta

PERIODS = ("daily", "monthly", "quarterly", "halfyearly", "yearly")
_ENV = {"order": "ORDER_ID", "invoice": "INVOICE_ID"}
_DEFAULTS = {
    "order":   {"RESET": "daily", "FORMAT": "ORD{DD}{MM}{YY}{SEQ:4}"},
    "invoice": {"RESET": "daily", "FORMAT": "INV-{DD}{MM}{YY}-{SEQ:4}"},
}
_TOKEN = re.compile(r"\{(YYYY|YY|MM|DD|Q|H|SEQ)(?::(\d+))?\}")


def _setting(kind, name, client_id):
    base = f"{_ENV[kind]}_{name}"
    ckey = re.sub(r"[^A-Za-z0-9]", "_", str(client_id)).upper()
    raw = (os.getenv(f"{base}_{ckey}") or os.getenv(base) or "").strip()
    return raw or _DEFAULTS[kind][name]


def get_config(kind, client_id):
    reset = _setting(kind, "RESET", client_id).lower()
    fmt = _setting(kind, "FORMAT", client_id)
    if reset not in PERIODS:
        raise ValueError(f"{kind}: invalid reset '{reset}', use one of {PERIODS}")
    names = [m.group(1) for m in _TOKEN.finditer(fmt)]
    if names.count("SEQ") != 1:
        raise ValueError(f"{kind}: format '{fmt}' must contain exactly one {{SEQ}}")
    rest = _TOKEN.sub("", fmt)
    if "{" in rest or "}" in rest:
        raise ValueError(f"{kind}: format '{fmt}' has an unknown token")
    if kind == "order" and ("-" in fmt or fmt.startswith("D")):
        raise ValueError("order format must not contain '-' (sub-orders) or start with 'D' (drafts)")
    return fmt, reset


def period_bounds(reset: str, dt: datetime):
    """Start (inclusive) and end (exclusive) of the period containing dt."""
    if reset == "daily":
        s = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        return s, s + timedelta(days=1)
    if reset == "monthly":
        s = datetime(dt.year, dt.month, 1)
        e = datetime(dt.year + (dt.month == 12), dt.month % 12 + 1, 1)
        return s, e
    if reset == "quarterly":
        m = (dt.month - 1) // 3 * 3 + 1
        s = datetime(dt.year, m, 1)
        e = datetime(dt.year + (m == 10), (m + 2) % 12 + 1, 1)
        return s, e
    if reset == "halfyearly":
        if dt.month <= 6:
            return datetime(dt.year, 1, 1), datetime(dt.year, 7, 1)
        return datetime(dt.year, 7, 1), datetime(dt.year + 1, 1, 1)
    return datetime(dt.year, 1, 1), datetime(dt.year + 1, 1, 1)


def _fill(s, dt):
    vals = {"YYYY": f"{dt.year:04d}", "YY": f"{dt.year % 100:02d}",
            "MM": f"{dt.month:02d}", "DD": f"{dt.day:02d}",
            "Q": str((dt.month - 1) // 3 + 1), "H": "1" if dt.month <= 6 else "2"}
    return _TOKEN.sub(lambda m: vals[m.group(1)], s)


def _seq_match(fmt):
    return next(x for x in _TOKEN.finditer(fmt) if x.group(1) == "SEQ")


def render(fmt: str, dt: datetime, seq: int) -> str:
    m = _seq_match(fmt)
    return _fill(fmt[:m.start()], dt) + str(seq).zfill(int(m.group(2) or 1)) + _fill(fmt[m.end():], dt)


def seq_pattern(fmt: str, dt: datetime, allow_sub_orders: bool = False) -> str:
    m = _seq_match(fmt)
    prefix = re.escape(_fill(fmt[:m.start()], dt))
    suffix = re.escape(_fill(fmt[m.end():], dt))
    tail = r"(?:-[0-9]+)?" if allow_sub_orders else ""
    return f"^{prefix}([0-9]{{1,6}}){suffix}{tail}$"