from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from database.postgres import get_db
from models.response_model import ResponseModel
from entity.table_entity import DiningTable
from entity.order_entity import DineinOrder as Db_Order_Entity, OrderItem as Db_OrderItem_Entity
from models.order_model import DineinOrderModel, OrderItemModel, OrderStatusEnum
from utils.auth import verify_token
from models.saas_context import SaasContext
from typing import Optional

router = APIRouter()

@router.post("/dinein/create", response_model=ResponseModel[DineinOrderModel])
def create_order(client_id: str, order: DineinOrderModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    db_order = Db_Order_Entity(client_id=client_id, table_id=order.table_id, status=order.status or OrderStatusEnum.new,
                       price=order.price, gst=order.gst, cst=order.cst, discount=order.discount, invoice_status=order.invoice_status,
                       total_price=order.total_price, invoice_id=order.invoice_id, dinein_order_id=order.dinein_order_id, 
                       handler_id=order.handler_id, created_by=order.created_by, updated_by=order.updated_by)
    db.add(db_order)
    db.flush()
    for item in order.items:
        db_item = Db_OrderItem_Entity(order_id=db_order.id, client_id=client_id, item_id=item.item_id, item_name=item.item_name,   
                              slug=item.slug, quantity=item.quantity, unit_price=item.unit_price, line_total=item.line_total, 
                              status=item.status or OrderStatusEnum.new)

        db.add(db_item)
    db.commit()
    db.refresh(db_order)

    db_items = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.order_id == db_order.id).all()
    order_items = [
        OrderItemModel(
            client_id=i.client_id,
            id=i.id,
            item_id=i.item_id,
            order_id=i.order_id,
            quantity=i.quantity,
            status=i.status, 
            unit_price=item.unit_price,  
            line_total=item.line_total, 
            item_name=i.item_name,
            slug=i.slug
        ) for i in db_items
    ]
    dinein_model = DineinOrderModel(
        id=db_order.id, table_id=db_order.table_id, client_id=db_order.client_id, status=db_order.status,
        created_at=db_order.created_at, items=order_items)
    response = ResponseModel(screen_id=context.screen_id, data=dinein_model)
    return response

@router.get("/dinein/order")
def get_orders_for_order_id(client_id: str, order_id: Optional[str] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    order = db.query(Db_Order_Entity).filter(
        Db_Order_Entity.client_id == client_id,
        Db_Order_Entity.id == order_id
    ).first()

    if not order:
        return ResponseModel(screen_id=context.screen_id, data=None, status="not_found")

    db_items = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.order_id == order.id).all()
    item_models = [Db_OrderItem_Entity.copyToModel(item) for item in db_items]

    result = {
        "id": order.id,
        "table_id": order.table_id,
        "client_id": order.client_id,
        "status": order.status,
        "created_at": order.created_at,
        "items": [i.dict() for i in item_models],
        "total_price": order.total_price
    }

    return ResponseModel(screen_id=context.screen_id, data=result)

@router.get("/dinein/table")
def get_orders_for_table(client_id: str, table_id: Optional[str] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if table_id:
        orders = db.query(Db_Order_Entity).filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.table_id == table_id
        ).all()
    else:
        orders = db.query(Db_Order_Entity).filter(
            Db_Order_Entity.client_id == client_id
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
            item_models.append(Db_OrderItem_Entity.copyToModel(item))

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

@router.post("/dinein/update")
def update_order_status(client_id: str,body: DineinOrderModel, request: Request, context: SaasContext = Depends(verify_token),db: Session = Depends(get_db),):
    if not body.id:
        raise HTTPException(status_code=400, detail="Order ID is required")

    order = db.query(Db_Order_Entity).filter(Db_Order_Entity.id == 
        body.id, Db_Order_Entity.client_id == str(client_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 1) Update status
    order.status = body.status.value
    db.commit()
    db.refresh(order)

    # 2) Forward the SAME user JWT to billing
    billing_sync = None
    if body.status == OrderStatusEnum.served:
        try:
            # Extract raw Authorization header from this request
            auth = request.headers.get("authorization", "")
            user_jwt = ""
            if auth and auth.lower().startswith("bearer "):
                user_jwt = auth.split(" ", 1)[1].strip()

            if not user_jwt:
                raise ValueError("Missing user JWT in request Authorization header")

            from app.services.order_service import sync_served_order_to_billing_public
            billing_sync = sync_served_order_to_billing_public(order, user_jwt)
        except Exception as e:
            billing_sync = {"error": str(e)}

    return ResponseModel(
        screen_id=context.screen_id,
        data={
            "message": "Status updated",
            "new_status": order.status,
            "billing_sync": billing_sync,
        },
    )



@router.post("/order_items/update")
def update_order_items(client_id: str, order_id: Optional[int] = Query(None), body: Optional[List[OrderItemModel]] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not order_id:
        raise HTTPException(status_code=400, detail="Missing order_id")
    try:
        order_id=int(order_id)
    except (ValueError,TypeError):
        raise HTTPException(status_code=400,detail="Missing order_id")    

    db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.order_id == order_id).delete()
    latest_order_item_list = Db_OrderItem_Entity.copyFromModels(body)
    db.add_all(latest_order_item_list)
    db.commit()
    response = ResponseModel(screen_id=context.screen_id, data={"message": "Order items updated successfully"})
    return response

@router.post("/order_item/update")
def update_order_items(client_id: str, order_id: Optional[int] = Query(None), order_item: Optional[OrderItemModel] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not order_id or not order_item or not order_item.id:
        raise HTTPException(status_code=400, detail="Missing order_id or order_item_id")

    existing_item = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.id == order_item.id, Db_OrderItem_Entity.order_id == order_id).first()

    updated_item = Db_OrderItem_Entity.copyFromModel(order_item)
    for attr, value in updated_item.__dict__.items():
        if attr != "_sa_instance_state":
            setattr(existing_item, attr, value)

    db.commit()
    response = ResponseModel(screen_id=context.screen_id, data={"message": "Order items updated successfully"})
    return response


@router.delete("/order_item/delete")
def delete_order_items(client_id: str, order_item_id: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    order_item = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.id == str(
        order_item_id), Db_OrderItem_Entity.client_id == client_id).first()
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")

    db.delete(order_item)
    db.commit()
    response = ResponseModel(screen_id=context.screen_id, data={
                             "message": "Order item deleted"})
    return response


@router.delete("/dinein/delete")
def delete_order(client_id: str, dinein_order_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    order = db.query(Db_Order_Entity).filter(Db_Order_Entity.id == dinein_order_id,
                                     Db_Order_Entity.client_id == client_id).first()
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
    orders = db.query(Db_Order_Entity).filter(Db_Order_Entity.client_id == str(client_id), Db_Order_Entity.status.in_([OrderStatusEnum.pending, OrderStatusEnum.preparing])
                                      ).order_by(Db_Order_Entity.created_at.asc()).all()

  
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

# --------------------------------- for invoice ----------------------------------

