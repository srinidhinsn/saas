from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.schemas.order import OrderCreate, OrderRead, OrderUpdate
from typing import List
from app.schemas.order import OrderStatusUpdate, StatusUpdateRequest
from app.utils.export_excel import export_orders_as_excel
from fastapi.responses import FileResponse
from uuid import UUID

from app.models.table import DiningTable
from app.models.menu_item import MenuItem
from app.models.combo import MenuCombo

router = APIRouter()

@router.post("/{client_id}/orders", response_model=OrderRead)
def create_order(client_id: str, order: OrderCreate, db: Session = Depends(get_db)):
    db_order = Order(client_id=client_id, table_id=order.table_id)
    db.add(db_order)
    db.flush()  # Get order ID for order_items

    for item in order.items:
        db_item = OrderItem(
            order_id=db_order.id,
            item_id=item.item_id,
            item_type=item.item_type,
            quantity=item.quantity,
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_order)
    return db_order

@router.get("/{client_id}/orders/table/{table_id}", response_model=List[OrderRead])
def get_orders_for_table(client_id: str, table_id: str, db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.client_id == client_id, Order.table_id == table_id).all()

@router.patch("/{client_id}/orders/{order_id}/status")
def update_order_status(
    client_id: str,
    order_id: str,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.client_id == client_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status_update.status
    db.commit()
    return {"message": f"Order status updated to {order.status}"}

@router.put("/{client_id}/orders/{order_id}")
def update_order_items(
    client_id: str,
    order_id: str,
    updated_order: OrderUpdate,
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.client_id == client_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == OrderStatus.served:
        raise HTTPException(status_code=400, detail="Cannot edit a served order")

    # Clear existing items
    db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()

    # Add new items
    for item in updated_order.items:
        db_item = OrderItem(
            order_id=order.id,
            item_id=item.item_id,
            item_type=item.item_type,
            quantity=item.quantity
        )
        db.add(db_item)

    db.commit()
    return {"message": "Order updated successfully"}

@router.get("/{client_id}/orders/export", response_class=FileResponse)
def export_orders(
    client_id: UUID,
    status: str = "served",
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    return export_orders_as_excel(client_id, status, db, start_date, end_date)

@router.get("/{client_id}/kds/orders")
def get_kds_orders(client_id: UUID, db: Session = Depends(get_db)):
    orders = db.query(Order).filter(
        Order.client_id == str(client_id),
        Order.status.in_(["pending", "preparing"])
    ).order_by(Order.created_at.asc()).all()

    result = []
    for order in orders:
        # Get table number
        table = db.query(DiningTable).filter(DiningTable.id == order.table_id).first()
        table_number = table.table_number if table else "Unknown"

        # Prepare items
        items_list = []
        for i in order.items:
            if i.item_type == "item":
                item = db.query(MenuItem).filter(MenuItem.id == i.item_id).first()
                name = item.name if item else "Unknown Item"
            else:
                item = db.query(MenuCombo).filter(MenuCombo.id == i.item_id).first()
                name = item.name if item else "Unknown Combo"

            items_list.append({
                "name": name,
                "quantity": i.quantity,
                "type": i.item_type
            })

        result.append({
            "order_id": str(order.id),
            "table_number": table_number,
            "status": order.status,
            "created_at": order.created_at.isoformat(),
            "items": items_list
        })

    return result

@router.patch("/{client_id}/orders/{order_id}/status")
def update_order_status(client_id: UUID, order_id: UUID, body: StatusUpdateRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.client_id == str(client_id)
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if body.status not in ["preparing", "served"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    order.status = body.status
    db.commit()
    return {"message": "Status updated", "new_status": body.status}

@router.delete("/{client_id}/orders/{order_id}")
def delete_order(client_id: str, order_id: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.client_id == client_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status == OrderStatus.served:
        raise HTTPException(status_code=400, detail="Cannot delete a served order")

    db.delete(order)
    db.commit()
    return {"message": "Order deleted"}





