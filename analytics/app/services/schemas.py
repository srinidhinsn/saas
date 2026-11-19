import json
from datetime import date, datetime
from typing import Any, List, Optional, Union

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from models.billing_model import ApprovalStatusEnum, BillingDocument, PaymentStatusEnum
from models.order_model import DineinOrderModel, OrderItemModel, OrderStatusEnum

from .constants import (
    ALL, NOT_RECORDED, UNASSIGNED, UNKNOWN, OrderType, ServiceMode, TimeOfDay, WEEKDAY_NAMES,
)


# ---------------------------------------------------------------- request filters
class AnalyticsFilters(BaseModel):
    model_config = ConfigDict(frozen=True)

    start: date
    end: date
    area: str = ALL
    time_of_day: TimeOfDay = TimeOfDay.all
    order_type: OrderType = OrderType.all
    weekday: str = ALL
    menu_category: str = ALL
    menu_recipe: str = ALL

    @field_validator("weekday")
    @classmethod
    def _known_weekday(cls, v: str) -> str:
        if v != ALL and v not in WEEKDAY_NAMES:
            raise ValueError("Unknown weekday")
        return v

    @model_validator(mode="after")
    def _ordered_range(self):
        if self.start > self.end:
            raise ValueError("Start date must not exceed end date")
        return self

    @classmethod
    def unbounded(cls, **overrides) -> "AnalyticsFilters":
        return cls(start=date.min, end=date.max, **overrides)

    @property
    def is_narrowed(self) -> bool:
        return any(v != ALL for v in (self.area, self.time_of_day, self.order_type,
                                      self.weekday, self.menu_category, self.menu_recipe))


# ---------------------------------------------------------------- small source models
class DiningTableView(BaseModel):
    """Replace with your own DiningTable model if one exists."""
    model_config = ConfigDict(from_attributes=True)

    id: Any = None
    name: Optional[str] = None
    section: Optional[str] = None
    table_type: Optional[str] = None
    status: Optional[str] = None


class RecipeIngredient(BaseModel):
    stock_item_id: Union[int, str, None] = None
    quantity_required: float = 0.0
    unit: Optional[str] = None


# ---------------------------------------------------------------- analysis views
class AnalyzedLine(OrderItemModel):
    order_status: Optional[OrderStatusEnum] = None
    status_label: str = UNKNOWN


class AnalyzedOrder(DineinOrderModel):
    created_dt: Optional[datetime] = None
    updated_dt: Optional[datetime] = None
    created_on: Optional[date] = None
    order_status: Optional[OrderStatusEnum] = None
    status_label: str = UNKNOWN
    service: ServiceMode = ServiceMode.dine_in
    area: str = NOT_RECORDED
    table_name: str = UNKNOWN
    employee: str = UNASSIGNED
    weekday: str = UNKNOWN

    @property
    def display_id(self) -> Any:
        return self.dinein_order_id or self.id

    @property
    def day(self) -> str:
        return self.created_on.isoformat() if self.created_on else ""


class AnalyzedDocument(BillingDocument):
    number: str = ""
    doc_dt: Optional[datetime] = None
    doc_day: Optional[date] = None
    amount: float = 0.0
    is_paid: bool = False
    method_label: str = NOT_RECORDED
    service: str = UNKNOWN
    area: str = UNKNOWN
    table_label: str = UNKNOWN
    employee: str = UNASSIGNED

    @field_validator("payment_method", mode="before")
    @classmethod
    def _parse_methods(cls, v):
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except ValueError:
                return [{"method": v}] if v.strip() else None
        return [v] if isinstance(v, dict) else v

    @field_validator("payment_status", "approval_status", mode="before")
    @classmethod
    def _title_case(cls, v):
        return v.strip().title() if isinstance(v, str) else v

    @property
    def day(self) -> str:
        return self.doc_day.isoformat() if self.doc_day else ""