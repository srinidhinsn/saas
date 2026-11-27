import os
from enum import Enum

from dotenv import load_dotenv

from models.billing_model import ApprovalStatusEnum, PaymentStatusEnum  # noqa: F401  (re-exported)
from models.order_model import MovementTypeEnum, OrderStatusEnum        # noqa: F401  (re-exported)

load_dotenv()

# ---------------------------------------------------------------- configuration
TIMEZONE = os.getenv("TIMEZONE", "UTC")
MENU_INVENTORY_ID = os.getenv("MENU_INVENTORY_ID", "menu").strip().lower()
STOCK_INVENTORY_ID = os.getenv("STOCK_INVENTORY_ID", "ration_inventory").strip().lower()
DEFAULT_START = os.getenv("ANALYTICS_DEFAULT_START", "2025-10-01")
DEFAULT_END = os.getenv("ANALYTICS_DEFAULT_END", "2026-09-30")

# ---------------------------------------------------------------- business thresholds
USAGE_WINDOW_DAYS = 30
LOW_COVER_DAYS = 7
EXCESS_COVER_DAYS = 90
REORDER_BATCH_RATIO = 0.2
HIGH_COST_SHARE = 0.4
DEFAULT_BATCH_PLATES = 1
MAX_DRILLDOWN_ROWS = 100
MAX_DIAGNOSTIC_CASES = 1000

# ---------------------------------------------------------------- display fallbacks
ALL = "all"
UNKNOWN = "Unknown"
UNASSIGNED = "Unassigned"
NOT_RECORDED = "Not recorded"
UNCATEGORISED = "Uncategorised"

# ---------------------------------------------------------------- order status (from OrderStatusEnum)
# `completed` is a legacy synonym of `served`; `draft` is not reported.
STATUS_ALIASES = {OrderStatusEnum.completed: OrderStatusEnum.served}
REPORTED_STATUSES = tuple(
    s for s in OrderStatusEnum if s not in (OrderStatusEnum.draft, OrderStatusEnum.completed)
)
OPEN_STATUSES = (OrderStatusEnum.pending, OrderStatusEnum.preparing, OrderStatusEnum.ready)
STATUS_LABELS = [s.value.title() for s in REPORTED_STATUSES]   # dashboard column names

# ---------------------------------------------------------------- payment status (from PaymentStatusEnum)
PAID_STATUSES = frozenset({PaymentStatusEnum.paid})


# ---------------------------------------------------------------- enums
class Grain(str, Enum):
    hour = "hour"
    weekday = "weekday"
    day = "day"
    week = "week"
    month = "month"


class Weekday(str, Enum):
    monday = "Monday"
    tuesday = "Tuesday"
    wednesday = "Wednesday"
    thursday = "Thursday"
    friday = "Friday"
    saturday = "Saturday"
    sunday = "Sunday"


WEEKDAY_NAMES = [d.value for d in Weekday]


class ServiceMode(str, Enum):
    dine_in = "Dine-in"
    walk_in = "Walk-in"
    takeaway = "Takeaway"
    delivery = "Delivery"


class OrderType(str, Enum):
    all = "all"
    dine_in = "dinein"
    walk_in = "walkin"
    takeaway = "takeaway"
    delivery = "delivery"


class TimeOfDay(str, Enum):
    all = "all"
    morning = "morning"
    afternoon = "afternoon"
    evening = "evening"
    night = "night"


class TableStatus(str, Enum):
    occupied = "occupied"
    vacant = "vacant"


class StockHealth(str, Enum):
    purchase_required = "Purchase required"
    excess = "Excess stock"
    healthy = "Healthy stock"


class IngredientReadiness(str, Enum):
    ready = "Ready"
    purchase_required = "Purchase required"


class PlanStatus(str, Enum):
    prepare_next = "Prepare next batch"
    sufficient = "Sufficient stock"


# ---------------------------------------------------------------- lookups
SERVICE_BY_TABLE_TYPE = {
    "walkin": ServiceMode.walk_in,
    "takeaway": ServiceMode.takeaway, "takeout": ServiceMode.takeaway,
    "delivery": ServiceMode.delivery, "homedelivery": ServiceMode.delivery,
}
ORDER_TYPE_BY_SERVICE = {
    ServiceMode.dine_in: OrderType.dine_in, ServiceMode.walk_in: OrderType.walk_in,
    ServiceMode.takeaway: OrderType.takeaway, ServiceMode.delivery: OrderType.delivery,
}
ORDER_TYPE_LABELS = {
    OrderType.all: "All order types", OrderType.dine_in: "Dine-in", OrderType.walk_in: "Walk-in",
    OrderType.takeaway: "Takeaway", OrderType.delivery: "Delivery",
}
TIME_OF_DAY_HOURS = {  # [start, end) in 24h; night wraps midnight
    TimeOfDay.morning: (5, 12), TimeOfDay.afternoon: (12, 17),
    TimeOfDay.evening: (17, 22), TimeOfDay.night: (22, 5),
}
TIME_OF_DAY_LABELS = {
    TimeOfDay.all: "All day", TimeOfDay.morning: "Morning (5 AM–12 PM)",
    TimeOfDay.afternoon: "Afternoon (12–5 PM)", TimeOfDay.evening: "Evening (5 PM–10 PM)",
    TimeOfDay.night: "Night (10 PM–5 AM)",
}