from datetime import datetime
from typing import Optional
from uuid import UUID
import pandas as pd
import os
from fastapi import HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from common_lib.models.order_entity import Order
from common_lib.models.menu_entity import Item
from common_lib.models.combo_entity import MenuCombo

def export_orders_as_excel(
    client_id: UUID, status: str, db: Session, start_date: Optional[str] = None, end_date: Optional[str] = None) -> FileResponse:
    
    if start_date and end_date:
        start_dt_check = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt_check   = datetime.strptime(end_date, "%Y-%m-%d")
        if start_dt_check > end_dt_check:
            raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    query              = db.query(Order).filter(Order.client_id == str(client_id))

    if status != "all":
        query  = query.filter(Order.status == status)

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query    = query.filter(Order.created_at >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    else:
        end_dt = datetime.now()

    # Include full day
    end_dt = end_dt.replace(hour=23, minute=59, second=59)
    query = query.filter(Order.created_at <= end_dt)

    orders = query.all()
    if not orders:
        raise HTTPException(status_code=404, detail="No orders found with given filters")

    # Prepare Excel data
    data = []
    for order in orders:
        for item in order.items:
            item_name = ""
            item_price = 0.0

            if item.item_type == "item":
                db_item       = db.query(Item).filter(Item.id == item.item_id).first()
                item_name     = db_item.name if db_item else "Unknown Item"
                item_price    = db_item.price if db_item else 0.0
            elif item.item_type == "combo":
                db_combo      = db.query(MenuCombo).filter(MenuCombo.id == item.item_id).first()
                item_name     = db_combo.name if db_combo else "Unknown Combo"
                item_price    = db_combo.price if db_combo else 0.0

            data.append({
                "Order ID": str(order.id),
                "Table ID": str(order.table_id),
                "Item Name": item_name,
                "Item Type": item.item_type,
                "Quantity": item.quantity,
                "Price (each)": item_price,
                "Total Price": round(item.quantity * item_price, 2),
                "Status": order.status,
                "Created At": order.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })

    df        = pd.DataFrame(data)
    file_path = f"served_orders_{client_id}.xlsx"
    df.to_excel(file_path, index=False)

    return FileResponse(path=file_path, filename=file_path, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
