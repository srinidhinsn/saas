from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta  # pip install python-dateutil
from entity.order_entity import DineinOrder
from models.order_model import DineinOrderModel
import pandas as pd
from typing import Optional


def get_date_range_filter(date_range: Optional[str]) -> Optional[tuple[datetime, datetime]]:
    today = date.today()

    if not date_range:
        return None

    if date_range == "today":
        return datetime(today.year, today.month, today.day), datetime.now()

    elif date_range == "yesterday":
        start = datetime(today.year, today.month, today.day) - timedelta(days=1)
        end = datetime(today.year, today.month, today.day)
        return start, end

    elif date_range == "last_week":
        end = datetime(today.year, today.month, today.day)
        start = end - timedelta(days=7)
        return start, end

    elif date_range == "last_month":
        end = datetime(today.year, today.month, today.day)
        start = end - relativedelta(months=1)
        return start, end

    elif date_range == "last_3_months":
        end = datetime(today.year, today.month, today.day)
        start = end - relativedelta(months=3)
        return start, end

    elif date_range == "last_6_months":
        end = datetime(today.year, today.month, today.day)
        start = end - relativedelta(months=6)
        return start, end

    elif date_range == "last_year":
        end = datetime(today.year, today.month, today.day)
        start = end - relativedelta(years=1)
        return start, end

    elif date_range == "current_month":
        start = datetime(today.year, today.month, 1)
        return start, datetime.now()

    elif date_range == "current_year":
        start = datetime(today.year, 1, 1)
        return start, datetime.now()

    return None


def generate_order_report(client_id: str, db: Session, date_range: Optional[str] = None) -> StreamingResponse:
    """
    Generate an Excel report of served dine-in orders for a client with optional date filter.
    """

    # Apply optional date range filter
    date_filter = get_date_range_filter(date_range)

    query = db.query(DineinOrder).filter(
        DineinOrder.client_id == client_id,
        DineinOrder.status == "served"
    )

    if date_filter:
        start, end = date_filter
        query = query.filter(DineinOrder.created_at >= start, DineinOrder.created_at <= end)

    orders = query.order_by(DineinOrder.created_at.desc()).all()

    if not orders:
        raise Exception("No served dine-in orders found for the selected date range.")

    # Convert to Pydantic models
    order_models = DineinOrder.copyToModels(orders)

    # Convert to DataFrame
    df = pd.DataFrame([order.dict() for order in order_models])

    output = BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df.to_excel(writer, sheet_name="Served Orders", index=False)

    output.seek(0)
    filename = f"order_report_{client_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def get_dashboard_data(client_id: str, db: Session) -> dict:
    """
    Return real-time dashboard statistics for the given client.
    """
    total_orders = db.query(DineinOrder).filter(DineinOrder.client_id == client_id).count()

    today = date.today()
    today_orders = (
        db.query(DineinOrder)
        .filter(DineinOrder.client_id == client_id)
        .filter(DineinOrder.created_at >= datetime(today.year, today.month, today.day))
        .count()
    )

    return {
        "total_orders": total_orders,
        "today_orders": today_orders
    }
