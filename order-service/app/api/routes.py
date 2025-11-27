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
from entity.inventory_entity import InventoryEntity
# from app.services.order_service import deduct_inventory_after_order
from decimal import Decimal


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

    # deduct_inventory_after_order(client_id, db_order.id, db)

    db_items = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.order_id == db_order.id).all()
    order_items = [
        OrderItemModel(
            client_id=i.client_id,
            id=i.id,
            item_id=i.item_id,
            order_id=i.order_id,
            quantity=i.quantity,
            status=i.status, 
            unit_price=i.unit_price,  
            line_total=i.line_total, 
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

# @router.post("/dinein/update")
# def update_order_status(client_id: str,body: DineinOrderModel, request: Request, context: SaasContext = Depends(verify_token),db: Session = Depends(get_db),):
#     if not body.id:
#         raise HTTPException(status_code=400, detail="Order ID is required")

#     order = db.query(Db_Order_Entity).filter(Db_Order_Entity.id == 
#         body.id, Db_Order_Entity.client_id == str(client_id)).first()
#     if not order:
#         raise HTTPException(status_code=404, detail="Order not found")

#     # 1) Update status
#     order.status = body.status.value
#     db.commit()
#     db.refresh(order)

#     # 2) Forward the SAME user JWT to billing
#     billing_sync = None
#     if body.status == OrderStatusEnum.served:
#         try:
#             # Extract raw Authorization header from this request
#             auth = request.headers.get("authorization", "")
#             user_jwt = ""
#             if auth and auth.lower().startswith("bearer "):
#                 user_jwt = auth.split(" ", 1)[1].strip()

#             if not user_jwt:
#                 raise ValueError("Missing user JWT in request Authorization header")

#             from app.services.order_service import sync_served_order_to_billing_public
#             billing_sync = sync_served_order_to_billing_public(order, user_jwt)
#         except Exception as e:
#             billing_sync = {"error": str(e)}

#     return ResponseModel(
#         screen_id=context.screen_id,
#         data={
#             "message": "Status updated",
#             "new_status": order.status,
#             "billing_sync": billing_sync,
#         },
#     )


# @router.post("/dinein/update")
# def update_order_status(
#     client_id: str,
#     body: DineinOrderModel,
#     request: Request,
#     context: SaasContext = Depends(verify_token),
#     db: Session = Depends(get_db),
# ):
#     if not body.id:
#         raise HTTPException(status_code=400, detail="Order ID is required")

#     # Fetch the order
#     order = db.query(Db_Order_Entity).filter(
#         Db_Order_Entity.id == body.id,
#         Db_Order_Entity.client_id == str(client_id)
#     ).first()
#     if not order:
#         raise HTTPException(status_code=404, detail="Order not found")

#     # Update order status
#     order.status = body.status.value
#     db.commit()
#     db.refresh(order)

#     # -------------------------------
#     # 🔹 If status = served → deduct inventory
#     # -------------------------------
#     if body.status == OrderStatusEnum.served:
#         print(f"✅ Order {order.id} served — deducting inventory availability...")

#         db_items = db.query(Db_OrderItem_Entity).filter(
#             Db_OrderItem_Entity.order_id == order.id,
#             Db_OrderItem_Entity.client_id == client_id
#         ).all()

#         # Helper conversion utilities
#         from decimal import Decimal

#         def convert_to_base(value, u):
#             value = Decimal(value)
#             u = (u or "").lower().strip()
#             if u in ["litre", "litres", "l"]:
#                 return value * Decimal(1000)  # ml
#             elif u in ["millilitre", "millilitres", "ml"]:
#                 return value
#             elif u in ["kg", "kgs", "kilogram", "kilograms"]:
#                 return value * Decimal(1000)  # g
#             elif u in ["gram", "grams", "g"]:
#                 return value
#             else:
#                 return value  # fallback, e.g. pcs

#         def convert_from_base(value, u):
#             value = Decimal(value)
#             u = (u or "").lower().strip()
#             if u in ["litre", "litres", "l"]:
#                 return value / Decimal(1000)
#             elif u in ["kg", "kgs", "kilogram", "kilograms"]:
#                 return value / Decimal(1000)
#             else:
#                 return value

#         # -----------------------------------------------------
#         # 🔹 Deduct from menu item availability (existing logic)
#         # -----------------------------------------------------
#         for item in db_items:
#             inventory_item = db.query(InventoryEntity).filter(
#                 InventoryEntity.id == item.item_id,
#                 InventoryEntity.client_id == client_id
#             ).first()

#             if not inventory_item:
#                 print(f"⚠️ Inventory not found for item_id={item.item_id}")
#                 continue

#             if inventory_item.availability is None:
#                 print(f"⚠️ No availability set for {inventory_item.name}")
#                 continue

#             prev_avail = inventory_item.availability
#             inv_unit = (inventory_item.unit or "").lower().strip()
#             serving_qty = inventory_item.serving_quantity or 1
#             serving_unit = (inventory_item.serving_unit or inv_unit).lower().strip()

#             avail_in_base = convert_to_base(prev_avail, inv_unit)
#             used_in_base = convert_to_base(serving_qty, serving_unit) * Decimal(item.quantity)
#             new_avail_base = max(Decimal(0), avail_in_base - used_in_base)
#             new_avail = convert_from_base(new_avail_base, inv_unit)

#             inventory_item.availability = new_avail

#             print(
#                 f"🔸 {inventory_item.name}: {prev_avail}{inv_unit} → {new_avail}{inv_unit} "
#                 f"(served {serving_qty}{serving_unit} x {item.quantity})"
#             )

#             # -----------------------------------------------------
#             # 🔹 Also deduct stock items linked via recipe_links
#             # -----------------------------------------------------
#             recipe_links = db.query(RecipeLinkEntity).filter(
#                 RecipeLinkEntity.menu_item_id == item.item_id,
#                 RecipeLinkEntity.client_id == client_id
#             ).all()

#             for link in recipe_links:
#                 stock_item = db.query(StockItemEntity).filter(
#                     StockItemEntity.id == link.stock_item_id,
#                     StockItemEntity.client_id == client_id
#                 ).first()

#                 if not stock_item:
#                     print(f"⚠️ Stock item not found for id={link.stock_item_id}")
#                     continue

#                 prev_stock_qty = Decimal(stock_item.quantity_available or 0)
#                 stock_unit = (stock_item.unit or "").lower().strip()
#                 req_qty = Decimal(link.quantity_required or 0)

#                 used_in_base = convert_to_base(req_qty, link.unit) * Decimal(item.quantity)
#                 stock_in_base = convert_to_base(prev_stock_qty, stock_unit)

#                 new_stock_base = max(Decimal(0), stock_in_base - used_in_base)
#                 new_stock_qty = convert_from_base(new_stock_base, stock_unit)
#                 stock_item.quantity_available = new_stock_qty

#                 print(
#                     f"   🟠 Deducted from stock: {stock_item.name}: "
#                     f"{prev_stock_qty}{stock_unit} → {new_stock_qty}{stock_unit} "
#                     f"(used {req_qty}{link.unit} × {item.quantity})"
#                 )

#         db.commit()
#         print(f"✅ Inventory and stock updated successfully for order {order.id}")

#         # -------------------------------
#         # 🔹 Continue billing sync
#         # -------------------------------
#         billing_sync = None
#         try:
#             auth = request.headers.get("authorization", "")
#             user_jwt = ""
#             if auth and auth.lower().startswith("bearer "):
#                 user_jwt = auth.split(" ", 1)[1].strip()

#             if not user_jwt:
#                 raise ValueError("Missing user JWT in request Authorization header")

#             from app.services.order_service import sync_served_order_to_billing_public
#             billing_sync = sync_served_order_to_billing_public(order, user_jwt)
#         except Exception as e:
#             billing_sync = {"error": str(e)}

#         return ResponseModel(
#             screen_id=context.screen_id,
#             data={
#                 "message": "Order served, menu and stock updated",
#                 "new_status": order.status,
#                 "billing_sync": billing_sync,
#             },
#         )

#     # -------------------------------
#     # For all other statuses
#     # -------------------------------
#     return ResponseModel(
#         screen_id=context.screen_id,
#         data={"message": "Status updated", "new_status": order.status},
#     )


@router.post("/dinein/update")
def update_order_status(
    client_id: str,
    body: DineinOrderModel,
    request: Request,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    from decimal import Decimal

    # ---------------------------
    # 1️⃣ Fetch order record
    # ---------------------------
    order = (
        db.query(Db_Order_Entity)
        .filter(Db_Order_Entity.id == body.id, Db_Order_Entity.client_id == client_id)

        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail=f"Order {body.order_id} not found")

    # ---------------------------
    # 2️⃣ Update order status
    # ---------------------------
    order.status = body.status
    db.commit()
    db.refresh(order)

    # ---------------------------
    # 3️⃣ If status == served → Deduct inventory
    # ---------------------------
    if body.status == OrderStatusEnum.served:
        print(f"✅ Order {order.id} served — deducting inventory availability...")

        try:
            db_items = (
                db.query(Db_OrderItem_Entity)
                .filter(Db_OrderItem_Entity.order_id == order.id, Db_OrderItem_Entity.client_id == client_id)
                .all()
            )

            def safe_decimal(v):
                try:
                    return Decimal(v or 0)
                except Exception:
                    return Decimal(0)

            def convert_to_base_decimal(value, u):
                v = safe_decimal(value)
                u = (u or "").lower().strip()
                if u in ["litre", "litres", "l"]:
                    return v * Decimal(1000)
                if u in ["kg", "kgs", "kilogram", "kilograms"]:
                    return v * Decimal(1000)
                return v

            def convert_from_base_decimal(value, u):
                v = safe_decimal(value)
                u = (u or "").lower().strip()
                if u in ["litre", "litres", "l"]:
                    return v / Decimal(1000)
                if u in ["kg", "kgs", "kilogram", "kilograms"]:
                    return v / Decimal(1000)
                return v

            # Loop through each ordered item
            for item in db_items:
                # --- Deduct Menu Inventory ---
                menu_item = (
                    db.query(InventoryEntity)
                    .filter(
                        InventoryEntity.id == item.item_id,
                        InventoryEntity.client_id == client_id,
                        InventoryEntity.inventory_id == 1,
                    )
                    .first()
                )

                if not menu_item:
                    print(f"⚠️ Menu inventory not found for item_id={item.item_id}")
                    continue

                prev_menu_avail = safe_decimal(menu_item.availability)
                inv_unit = (menu_item.unit or "").lower().strip()
                serving_qty = safe_decimal(menu_item.serving_quantity or 1)
                serving_unit = (menu_item.serving_unit or inv_unit).lower().strip()

                menu_avail_base = convert_to_base_decimal(prev_menu_avail, inv_unit)
                used_menu_base = convert_to_base_decimal(serving_qty, serving_unit) * safe_decimal(item.quantity)
                new_menu_avail_base = max(Decimal(0), menu_avail_base - used_menu_base)
                new_menu_avail = convert_from_base_decimal(new_menu_avail_base, inv_unit)
                menu_item.availability = new_menu_avail

                print(
                    f"🔸 Menu {menu_item.name}: {prev_menu_avail}{inv_unit} -> {new_menu_avail}{inv_unit} "
                    f"(served {serving_qty}{serving_unit} x {item.quantity})"
                )

                # --- Deduct Linked Stock Items ---
                recipe = menu_item.recipe or []
                if not isinstance(recipe, list):
                    recipe = []

                for ing in recipe:
                    try:
                        stock_id = int(ing.get("stock_item_id") or ing.get("id") or 0)
                        qty_required = safe_decimal(ing.get("quantity_required"))
                        qty_unit = (ing.get("unit") or "").lower().strip()
                    except Exception as e:
                        print(f"⚠️ Malformed recipe entry: {ing} - {e}")
                        continue

                    if not stock_id:
                        continue

                    stock_row = (
                        db.query(InventoryEntity)
                        .filter(
                            InventoryEntity.id == stock_id,
                            InventoryEntity.client_id == client_id,
                            InventoryEntity.inventory_id == 2,
                        )
                        .first()
                    )

                    if not stock_row:
                        print(f"⚠️ Stock item not found for stock_id={stock_id}")
                        continue

                    prev_stock_avail = safe_decimal(stock_row.availability)
                    stock_unit = (stock_row.unit or "").lower().strip()

                    stock_avail_base = convert_to_base_decimal(prev_stock_avail, stock_unit)
                    used_stock_base = convert_to_base_decimal(qty_required, qty_unit) * safe_decimal(item.quantity)
                    new_stock_avail_base = max(Decimal(0), stock_avail_base - used_stock_base)
                    new_stock_avail = convert_from_base_decimal(new_stock_avail_base, stock_unit)
                    stock_row.availability = new_stock_avail

                    print(
                        f"    → Stock {stock_row.name}: {prev_stock_avail}{stock_unit} -> {new_stock_avail}{stock_unit} "
                        f"(used {qty_required}{qty_unit} x {item.quantity})"
                    )

            db.commit()
            print(f"✅ Inventory updated successfully for order {order.id}")

        except Exception as e:
            db.rollback()
            print(f"❌ Inventory deduction failed: {e}")
            raise HTTPException(status_code=500, detail=f"Inventory deduction failed: {str(e)}")

        # ---------------------------
        # 4️⃣ Sync to billing
        # ---------------------------
        billing_sync = None
        try:
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
                "message": "Order served and inventory updated",
                "new_status": order.status,
                "billing_sync": billing_sync,
            },
        )

    # ---------------------------
    # 5️⃣ Other statuses
    # ---------------------------
    return ResponseModel(
        screen_id=context.screen_id,
        data={"message": "Status updated", "new_status": order.status},
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

