from datetime import date
from typing import Callable, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy.orm import Session

from database.postgres import get_db
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token

from ..services import builders
from ..services.constants import (
    ALL, DEFAULT_END, DEFAULT_START, STOCK_INVENTORY_ID, OrderType, TimeOfDay,
)
from ..services.context import AnalyticsContext, load_context
from ..services.schemas import AnalyticsFilters

router = APIRouter()


# ---------------------------------------------------------------- dependencies
def get_authorized_client_id(client_id: str, auth: SaasContext = Depends(verify_token)) -> str:
    if client_id != auth.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return client_id


def get_filtered_context(
    client_id: str = Depends(get_authorized_client_id),
    start: date = Query(default=date.fromisoformat(DEFAULT_START)),
    end: date = Query(default=date.fromisoformat(DEFAULT_END)),
    area: str = ALL,
    time_of_day: TimeOfDay = TimeOfDay.all,
    order_type: OrderType = OrderType.all,
    weekday: str = ALL,
    menu_category: str = ALL,
    menu_recipe: str = ALL,
    auth: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
) -> AnalyticsContext:
    try:
        filters = AnalyticsFilters(start=start, end=end, area=area, time_of_day=time_of_day,
                                   order_type=order_type, weekday=weekday,
                                   menu_category=menu_category, menu_recipe=menu_recipe)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.errors()[0]["msg"])
    return load_context(db, client_id, filters, auth)


def get_unfiltered_context(
    client_id: str = Depends(get_authorized_client_id),
    auth: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
) -> AnalyticsContext:
    return load_context(db, client_id, AnalyticsFilters.unbounded(), auth)


def get_recipe_context(
    menu_category: str = ALL,
    menu_recipe: str = ALL,
    client_id: str = Depends(get_authorized_client_id),
    auth: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
) -> AnalyticsContext:
    filters = AnalyticsFilters.unbounded(menu_category=menu_category, menu_recipe=menu_recipe)
    return load_context(db, client_id, filters, auth)


def respond(auth: SaasContext, message: str, data: dict) -> ResponseModel:
    return ResponseModel(screen_id=auth.screen_id, status="success", message=message, data=data)


def _register(path: str, message: str, builder: Callable, context_dependency: Callable) -> None:
    """Register a plain GET report: context in, builder payload out."""
    def endpoint(ctx: AnalyticsContext = Depends(context_dependency), auth: SaasContext = Depends(verify_token)):
        return respond(auth, message, builder(ctx))

    endpoint.__name__ = "get_" + path.strip("/").replace("/", "_").replace("-", "_")
    router.add_api_route(path, endpoint, methods=["GET"], response_model=ResponseModel[dict])


# ---------------------------------------------------------------- date-filtered reports
for _path, _message, _builder in [
    ("/overview", "Overview fetched", builders.build_overview),
    ("/owner/deep-dive", "Owner deep-dive fetched", builders.build_deep_dive),
    ("/owner/channels", "Owner channels fetched", builders.build_channels),
    ("/owner/intelligence", "Owner intelligence fetched", builders.build_intelligence),
    ("/operations", "Operations fetched", builders.build_operations),
    ("/orders/demand-trends", "Demand trends fetched", builders.build_demand_trends),
    ("/services/analytics", "Services analytics fetched", builders.build_services),
    ("/menu/analytics", "Menu analytics fetched", builders.build_menu),
    ("/billing/analytics", "Billing analytics fetched", builders.build_billing),
    ("/sales/v32", "Sales analytics fetched", builders.build_sales),
    ("/inventory/v24", "Inventory analytics fetched", builders.build_inventory_plan),
    ("/inventory/live", "Live inventory fetched", builders.build_inventory_live),
]:
    _register(_path, _message, _builder, get_filtered_context)

# ---------------------------------------------------------------- whole-history reports
for _path, _message, _builder in [
    ("/filters", "Filters fetched", builders.build_filters),
    ("/owner/footprint", "Footprint fetched", builders.build_footprint),
    ("/insights/v40", "Insights fetched", builders.build_insights),
]:
    _register(_path, _message, _builder, get_unfiltered_context)

_register("/owner/recipe-catalog", "Recipe catalog fetched", builders.build_recipe_catalog, get_recipe_context)


# ---------------------------------------------------------------- reports with extra parameters
@router.get("/owner/trace", response_model=ResponseModel[dict])
def owner_trace(kind: str, value: str, ctx: AnalyticsContext = Depends(get_filtered_context),
                auth: SaasContext = Depends(verify_token)):
    return respond(auth, "Trace fetched", builders.build_trace(ctx, kind, value))


@router.get("/billing/live", response_model=ResponseModel[dict])
def billing_live(status: Optional[str] = None, ctx: AnalyticsContext = Depends(get_filtered_context),
                 auth: SaasContext = Depends(verify_token)):
    return respond(auth, "Live billing fetched", builders.build_billing_live(ctx, status))


@router.get("/billing/live/items", response_model=ResponseModel[dict])
def billing_live_items(document_id: str, ctx: AnalyticsContext = Depends(get_unfiltered_context),
                       auth: SaasContext = Depends(verify_token)):
    return respond(auth, "Billing items fetched", builders.build_billing_items(ctx, document_id))


@router.get("/inventory/items", response_model=ResponseModel[dict])
def inventory_items(inventory_id: str = STOCK_INVENTORY_ID, ctx: AnalyticsContext = Depends(get_unfiltered_context),
                    auth: SaasContext = Depends(verify_token)):
    return respond(auth, "Inventory items fetched", builders.build_inventory_items(ctx, inventory_id))