from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from entity.inventory_entity import InventoryEntity
from database.postgres import get_db
from models.response_model import ResponseModel
from entity.table_entity import DiningTable
from entity.order_entity import DineinOrder as DBOrder, OrderItem as DBOrderItem
from models.order_model import DineinOrderModel, OrderItemModel, OrderStatusEnum
from utils.auth import verify_token
from models.saas_context import SaasContext
from typing import Optional

router = APIRouter()


@router.post("/dinein/create", response_model=ResponseModel[DineinOrderModel])
def create_order(client_id: str, order: DineinOrderModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    db_order = DBOrder(client_id=client_id, table_id=order.table_id, status=order.status or OrderStatusEnum.new,
                       price=order.price, gst=order.gst, cst=order.cst, discount=order.discount, invoice_status=order.invoice_status,
                       total_price=order.total_price, invoice_id=order.invoice_id, dinein_order_id=order.dinein_order_id, handler_id=order.handler_id, created_by=order.created_by, updated_by=order.updated_by)
    db.add(db_order)
    db.flush()
    for item in order.items:
        db_item = DBOrderItem(order_id=db_order.id, client_id=client_id,
                              item_id=item.item_id,  item_name=item.item_name,
                              slug=item.slug,     quantity=item.quantity, status=item.status or OrderStatusEnum.new)
        db.add(db_item)
    db.commit()
    db.refresh(db_order)
    dinein_model = DineinOrderModel(
        id=db_order.id, table_id=db_order.table_id, client_id=db_order.client_id, status=db_order.status,
        created_at=db_order.created_at, items=order.items)
    response = ResponseModel(screen_id=context.screen_id, data=dinein_model)
    return response


@router.get("/dinein/order")
def get_orders_for_order_id(client_id: str, order_id: Optional[str] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if order_id:
        order = db.query(DBOrder).filter(
            DBOrder.client_id == client_id,
            DBOrder.id == order_id
        ).first()

        if order:
            items = order.items
            item_models = []

            for item in items:
                item_models.append(DBOrderItem.copyToModel(item))

    result = {
        "id": order.id,
        "table_id": order.table_id,
        "client_id": order.client_id,
        "status": order.status,
        "created_at": order.created_at,
        "items": [i.dict() for i in item_models],
        "total_price": order.total_price
    }

    response = ResponseModel(screen_id=context.screen_id, data=result)
    return response


@router.get("/dinein/table")
def get_orders_for_table(client_id: str, table_id: Optional[str] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if table_id:
        orders = db.query(DBOrder).filter(
            DBOrder.client_id == client_id,
            DBOrder.table_id == table_id
        ).all()
    else:
        orders = db.query(DBOrder).filter(
            DBOrder.client_id == client_id
        ).all()

    result = []
    for order in orders:
        items = order.items
        item_names = []
        item_models = []

        for item in items:
            try:
                item_names.append(item.name)
            except:
                item_names.append("Unknown")
            item_models.append(DBOrderItem.copyToModel(item))

        result.append({
            "id": order.id,
            "table_id": order.table_id,
            "client_id": order.client_id,
            "status": order.status,
            # i have many items in single order so make it as a dictionary
            "created_at": order.created_at,
            "items": [i.dict() for i in item_models],
            "total_price": order.total_price,
            "item_names": item_names
        })

    response = ResponseModel(screen_id=context.screen_id, data=result)
    return response


# @router.post("/dinein/update")
# def update_order_status(client_id: str, body: DineinOrderModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
#     if not body.id:
#         raise HTTPException(status_code=400, detail="Order ID is required")
#     order = db.query(DBOrder).filter(DBOrder.id == str(
#         body.id), DBOrder.client_id == str(client_id)).first()
#     if not order:
#         raise HTTPException(status_code=404, detail="Order not found")

@router.post("/dinein/update")
def update_order_status(client_id: str, body: DineinOrderModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not body.id:
        raise HTTPException(status_code=400, detail="Order ID is required")

    order = db.query(DBOrder).filter(DBOrder.id == body.id,
                                     DBOrder.client_id == client_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = body.status.value
    if body.status == OrderStatusEnum.served:
        order.invoice_status = "unpaid"
    db.commit()
    response = ResponseModel(screen_id=context.screen_id, data={
        "message": "Status updated",
        "new_status": order.status,
        "invoice_status": order.invoice_status})
    return response


@router.post("/order_items/update")
def update_order_items(
    client_id: str,
    order_id: Optional[str] = Query(None),
    body: Optional[List[OrderItemModel]] = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if not order_id:
        raise HTTPException(status_code=400, detail="Missing order_id")

    # Delete old items
    db.query(DBOrderItem).filter(DBOrderItem.order_id == order_id).delete()

    enriched_items = []
    for item in body:
        inventory = db.query(InventoryEntity).filter_by(
            id=item.item_id, client_id=client_id).first()
        if not inventory:
            raise HTTPException(
                status_code=404, detail=f"Item not found: {item.item_id}")

        enriched_item = DBOrderItem(
            item_id=item.item_id,
            order_id=order_id,
            client_id=client_id,
            quantity=item.quantity,
            status=item.status or "new",
            item_name=inventory.name,
            slug=inventory.slug,
            price=inventory.price,
        )
        enriched_items.append(enriched_item)

    db.add_all(enriched_items)
    db.commit()

    return ResponseModel(screen_id=context.screen_id, data={"message": "Order items updated successfully"})


@router.delete("/order_item/delete")
def delete_order_items(client_id: str, order_item_id: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):

    order_item = db.query(DBOrderItem).filter(DBOrderItem.id == str(
        order_item_id), DBOrderItem.client_id == client_id).first()
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")

    db.delete(order_item)
    db.commit()
    response = ResponseModel(screen_id=context.screen_id, data={
                             "message": "Order item deleted"})
    return response


@router.delete("/dinein/delete")
def delete_order(client_id: str, dinein_order_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    order = db.query(DBOrder).filter(DBOrder.id == dinein_order_id,
                                     DBOrder.client_id == client_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatusEnum.served:
        raise HTTPException(
            status_code=400, detail="Cannot delete a served order")

    db.delete(order)
    db.commit()
    response = ResponseModel(screen_id=context.screen_id, data={
                             "message": "Order deleted"})
    return response


@router.get("/kds/orders")
def get_kds_orders(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    orders = db.query(DBOrder).filter(DBOrder.client_id == str(client_id), DBOrder.status.in_([OrderStatusEnum.pending, OrderStatusEnum.preparing])
                                      ).order_by(DBOrder.created_at.asc()).all()

    ''''
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
    '''
    response = ResponseModel(screen_id=context.screen_id, data=orders)
    return response
