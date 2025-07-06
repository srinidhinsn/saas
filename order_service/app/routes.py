from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from database import get_db

from report_service.export_excel import export_orders_as_excel
from common_lib.models.table_entity import DiningTable
from common_lib.models.menu_entity import Item
from common_lib.models.combo_entity import MenuCombo

from common_lib.models.order_entity import Order as DBOrder, OrderItem as DBOrderItem, OrderStatus
from common_lib.models.order_model import Order as OrderSchema, OrderItem as OrderItemSchema, StatusUpdateRequest, OrderUpdateRequest

router = APIRouter()

@router.post("/{client_id}/orders/create", response_model=OrderSchema)
def create_order(client_id: str, order: OrderSchema, db: Session = Depends(get_db)):
    db_order = DBOrder(client_id=client_id, table_id=order.table_id)
    db.add(db_order)
    db.flush()
    for item in order.items:
        db_item = DBOrderItem(order_id=db_order.id, item_id=item.item_id, item_type=item.item_type, quantity=item.quantity)
        db.add(db_item)
    db.commit()
    db.refresh(db_order)

    return OrderSchema(
        id=db_order.id, table_id=db_order.table_id, client_id=db_order.client_id, status=db_order.status, 
        created_at=db_order.created_at, items=order.items)

@router.get("/{client_id}/orders/table/{table_id}", response_model=List[OrderSchema])
def get_orders_for_table(client_id: str, table_id: str, db: Session = Depends(get_db)):
    orders = db.query(DBOrder).filter(DBOrder.client_id == client_id, DBOrder.table_id == table_id).all()
    result = []
    for order in orders:
        items = [
            OrderItemSchema(item_id=i.item_id, item_type=i.item_type, quantity=i.quantity)
            for i in order.items
        ]
        result.append(OrderSchema(id=order.id, table_id=order.table_id, client_id=order.client_id,
            status=order.status, created_at=order.created_at, items=items))
    return result

@router.post("/{client_id}/orders/status/update")
def update_order_status(client_id: UUID, body: StatusUpdateRequest, db: Session = Depends(get_db)):
    order = db.query(DBOrder).filter(DBOrder.id == str(body.order_id), DBOrder.client_id == str(client_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = body.status.value
    db.commit()
    return {"message": "Status updated", "new_status": order.status}

@router.post("/{client_id}/orders/update")
def update_order_items(client_id: str, body: OrderUpdateRequest, db: Session = Depends(get_db)):

    order = db.query(DBOrder).filter(DBOrder.id == str(body.order_id), DBOrder.client_id == client_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatus.served:
        raise HTTPException(status_code=400, detail="Cannot edit a served order")

    db.query(DBOrderItem).filter(DBOrderItem.order_id == order.id).delete()
    for item in body.items:
        if not item.item_id:
            continue  # Skip empty rows
        db_item = DBOrderItem(order_id=order.id, item_id=item.item_id, item_type=item.item_type, quantity=item.quantity)
        db.add(db_item)
    db.commit()
    return {"message": "Order updated successfully"}

@router.post("/{client_id}/orders/delete")
def delete_order(client_id: str, order_id: str, db: Session = Depends(get_db)):
    order = db.query(DBOrder).filter(DBOrder.id == order_id, DBOrder.client_id == client_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatus.served:
        raise HTTPException(status_code=400, detail="Cannot delete a served order")

    db.delete(order)
    db.commit()
    return {"message": "Order deleted"}

@router.get("/{client_id}/kds/orders")
def get_kds_orders(client_id: UUID, db: Session = Depends(get_db)):
    orders = db.query(DBOrder).filter(DBOrder.client_id == str(client_id), DBOrder.status.in_(["pending", "preparing"])
                                      ).order_by(DBOrder.created_at.asc()).all()

    result = []
    for order in orders:
        table        = db.query(DiningTable).filter(DiningTable.id == order.table_id).first()
        table_number = table.table_number if table else "Unknown" 
        items_list   = []
        for i in order.items:
            if i.item_type == "item":
                item = db.query(Item).filter(Item.id == i.item_id).first()
                name = item.name if item else "Unknown Item"
            else:
                item = db.query(MenuCombo).filter(MenuCombo.id == i.item_id).first()
                name = item.name if item else "Unknown Combo"
            items_list.append({"name": name, "quantity": i.quantity, "type": i.item_type})

        result.append({"order_id": str(order.id), "table_number": table_number, "status": order.status,
                       "created_at": order.created_at.isoformat(), "items": items_list})
    return result


