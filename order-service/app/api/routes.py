from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
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


# ── Private helpers ─────────────────────────────────────────────────────────

def _root_dinein_id(dinein_order_id: str) -> str:
    """Return the root part of a dinein_order_id.  "1001-2" → "1001" """
    return dinein_order_id.split("-")[0] if dinein_order_id else dinein_order_id


STATUS_PRIORITY = {"new": 0, "pending": 1, "preparing": 2, "ready": 3, "served": 4}


def _order_row_to_flat(order) -> dict:
    """Convert a single DB order row to a flat dict for KDS (no merging)."""
    items = []
    for item in order.items:
        m = Db_OrderItem_Entity.copyToModel(item).dict()
        items.append(m)
    return {
        "id": order.id,
        "dinein_order_id": order.dinein_order_id,
        "table_id": order.table_id,
        "client_id": order.client_id,
        "status": order.status,
        "created_at": order.created_at,
        "items": items,
        "total_price": order.total_price or 0,
        "is_sub_order": "-" in (order.dinein_order_id or ""),
    }


def _merge_group(orders: list) -> dict:
    """
    Merge root + sub-order DB rows into one response dict for /dinein/table.
    Used by TakeOrder floor view to show one entry per table group.
    Includes sub_orders metadata so the frontend can calculate:
      - timer (root created_at)
      - order count (len(sub_orders) + 1)
      - total price (sum of all items unit_price * quantity)
    Items carry batch_label and sub_order_id for the view-order cart reconstruction.
    """
    orders = sorted(orders, key=lambda o: o.created_at or 0)
    root = orders[0]
    merged_items = []
    for order in orders:
        for item in order.items:
            m = Db_OrderItem_Entity.copyToModel(item).dict()
            m["batch_label"] = order.dinein_order_id
            m["sub_order_id"] = order.id
            merged_items.append(m)

    statuses = [o.status for o in orders if o.status]
    overall = min(statuses, key=lambda s: STATUS_PRIORITY.get(s, 99)) if statuses else "pending"

    # sub_orders metadata for TakeOrder (timer, count, price)
    sub_orders_meta = [
        {
            "id": o.id,
            "dinein_order_id": o.dinein_order_id,
            "created_at": o.created_at,
            "status": o.status,
            "total_price": o.total_price or 0,
        }
        for o in orders
    ]

    # Total price = sum of all items' unit_price * quantity (no GST/CST)
    total_price = sum(
        (item.unit_price or 0) * (item.quantity or 1)
        for order in orders
        for item in order.items
    )

    return {
        "id": root.id,
        "dinein_order_id": root.dinein_order_id,
        "table_id": root.table_id,
        "client_id": root.client_id,
        "status": overall,
        "created_at": root.created_at,          # oldest = root timer
        "items": merged_items,
        "total_price": total_price,
        "item_names": [i.get("item_name", "") for i in merged_items],
        "sub_orders": sub_orders_meta,           # for TakeOrder count + timer
        "order_count": len(orders),              # total batches incl. root
    }

# ───────────────────────────────────────────────────────────────────────────


@router.post("/dinein/create", response_model=ResponseModel[DineinOrderModel])
def create_order(client_id: str, order: DineinOrderModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    db_order = Db_Order_Entity(
        client_id=client_id, table_id=order.table_id, status=order.status,
        price=order.price, gst=order.gst, cst=order.cst, discount=order.discount,
        invoice_status=order.invoice_status, total_price=order.total_price,
        invoice_id=order.invoice_id, dinein_order_id=None,
        handler_id=order.handler_id, created_by=order.created_by, updated_by=order.updated_by,
    )
    db.add(db_order)
    db.flush()

    # dinein_order_id for a fresh order = its own PK
    db_order.dinein_order_id = str(db_order.id)

    for item in order.items:
        db_item = Db_OrderItem_Entity(
            order_id=db_order.id, client_id=client_id, item_id=item.item_id,
            item_name=item.item_name, slug=item.slug, quantity=item.quantity,
            unit_price=item.unit_price, line_total=item.line_total, status=item.status,
        )
        db.add(db_item)
    db.commit()
    db.refresh(db_order)

    db_items = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.order_id == db_order.id).all()
    order_items = [
        OrderItemModel(
            client_id=i.client_id, id=i.id, item_id=i.item_id, order_id=i.order_id,
            quantity=i.quantity, status=i.status, unit_price=i.unit_price,
            line_total=i.line_total, item_name=i.item_name, slug=i.slug,
        ) for i in db_items
    ]
    dinein_model = DineinOrderModel(
        id=db_order.id, dinein_order_id=db_order.dinein_order_id, table_id=db_order.table_id,
        client_id=db_order.client_id, status=db_order.status, created_at=db_order.created_at,
        items=order_items,
    )
    return ResponseModel(screen_id=context.screen_id, data=dinein_model)


@router.post("/dinein/create-sub-order", response_model=ResponseModel[DineinOrderModel])
def create_sub_order(
    client_id: str,
    parent_dinein_order_id: str,   # e.g. "1001"
    order: DineinOrderModel,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    root_order = db.query(Db_Order_Entity).filter(
        Db_Order_Entity.client_id == client_id,
        Db_Order_Entity.dinein_order_id == parent_dinein_order_id,
    ).first()
    if not root_order:
        raise HTTPException(status_code=404, detail=f"Parent order '{parent_dinein_order_id}' not found")

    existing_sub_count = db.query(Db_Order_Entity).filter(
        Db_Order_Entity.client_id == client_id,
        Db_Order_Entity.dinein_order_id.like(f"{parent_dinein_order_id}-%"),
    ).count()
    sub_dinein_order_id = f"{parent_dinein_order_id}-{existing_sub_count + 1}"

    # Total price = sum of items' unit_price * quantity (no GST/CST)
    total_price = sum(
        (item.unit_price or 0) * (item.quantity or 1)
        for item in order.items
    )

    db_sub_order = Db_Order_Entity(
        client_id=client_id,
        dinein_order_id=sub_dinein_order_id,
        table_id=root_order.table_id,
        status=OrderStatusEnum.pending,
        price=total_price, gst=0, cst=0, total_price=total_price,
        created_by=order.created_by, invoice_id=None, invoice_status=None,
    )
    db.add(db_sub_order)
    db.flush()

    for item in order.items:
        db_item = Db_OrderItem_Entity(
            order_id=db_sub_order.id, client_id=client_id,
            item_id=item.item_id, item_name=item.item_name, slug=item.slug,
            quantity=item.quantity, unit_price=item.unit_price,
            line_total=(item.unit_price or 0) * (item.quantity or 1),
            status=OrderStatusEnum.pending,
            frontend_unique_key=item.frontend_unique_key,
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_sub_order)

    order_items = [
        OrderItemModel(
            id=i.id, order_id=i.order_id, client_id=i.client_id,
            item_id=i.item_id, item_name=i.item_name, slug=i.slug,
            quantity=i.quantity, unit_price=i.unit_price, line_total=i.line_total,
            status=i.status, frontend_unique_key=i.frontend_unique_key,
        )
        for i in db_sub_order.items
    ]
    sub_order_model = DineinOrderModel(
        id=db_sub_order.id, dinein_order_id=db_sub_order.dinein_order_id,
        table_id=db_sub_order.table_id, client_id=db_sub_order.client_id,
        status=db_sub_order.status, total_price=db_sub_order.total_price,
        created_at=db_sub_order.created_at, items=order_items,
    )
    return ResponseModel(
        screen_id=context.screen_id, data=sub_order_model,
        message=f"Sub-order {sub_dinein_order_id} created successfully",
    )


@router.get("/dinein/order")
def get_orders_for_order_id(client_id: str, order_id: Optional[str] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    order = db.query(Db_Order_Entity).filter(
        Db_Order_Entity.client_id == client_id,
        Db_Order_Entity.id == order_id,
    ).first()
    if not order:
        return ResponseModel(screen_id=context.screen_id, data=None, status="not_found")

    db_items = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.order_id == order.id).all()
    item_models = [Db_OrderItem_Entity.copyToModel(item) for item in db_items]
    result = {
        "id": order.id, "dinein_order_id": order.dinein_order_id,
        "table_id": order.table_id, "client_id": order.client_id,
        "status": order.status, "created_at": order.created_at,
        "items": [i.dict() for i in item_models], "total_price": order.total_price,
    }
    return ResponseModel(screen_id=context.screen_id, data=result)


@router.get("/dinein/table")
def get_orders_for_table(client_id: str, table_id: Optional[str] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if table_id:
        orders = db.query(Db_Order_Entity).filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.table_id == table_id,
        ).all()
    else:
        orders = db.query(Db_Order_Entity).filter(
            Db_Order_Entity.client_id == client_id,
        ).all()

    # Group root + sub-orders, return one merged entry per table group
    groups: dict = {}
    for order in orders:
        root = _root_dinein_id(order.dinein_order_id or str(order.id))
        groups.setdefault(root, []).append(order)

    result = [_merge_group(group) for group in groups.values()]
    return ResponseModel(screen_id=context.screen_id, data=result)


@router.post("/dinein/update")
def update_order_status(
    client_id: str,
    body: DineinOrderModel,
    request: Request,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Db_Order_Entity)
        .filter(Db_Order_Entity.id == body.id, Db_Order_Entity.client_id == client_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {body.id} not found")

    if body.status is not None:
        order.status = body.status
    if body.total_price is not None:
        order.total_price = body.total_price

    if order.status == OrderStatusEnum.served and body.status == OrderStatusEnum.served:
        return ResponseModel(screen_id=context.screen_id, data={"message": "Order already served", "new_status": order.status})

    db.commit()
    db.refresh(order)

    if body.status == OrderStatusEnum.served:
        print(f"✅ Order {order.id} served — deducting inventory availability...")
        try:
            db_items = (
                db.query(Db_OrderItem_Entity)
                .filter(Db_OrderItem_Entity.order_id == order.id, Db_OrderItem_Entity.client_id == client_id)
                .all()
            )

            def safe_decimal(v):
                try: return Decimal(v or 0)
                except: return Decimal(0)

            def convert_to_base(value, u):
                v = safe_decimal(value); u = (u or "").lower().strip()
                if u in ["litre", "litres", "l"]: return v * Decimal(1000)
                if u in ["kg", "kgs", "kilogram", "kilograms"]: return v * Decimal(1000)
                return v

            def convert_from_base(value, u):
                v = safe_decimal(value); u = (u or "").lower().strip()
                if u in ["litre", "litres", "l"]: return v / Decimal(1000)
                if u in ["kg", "kgs", "kilogram", "kilograms"]: return v / Decimal(1000)
                return v

            for item in db_items:
                menu_item = db.query(InventoryEntity).filter(
                    InventoryEntity.id == item.item_id,
                    InventoryEntity.client_id == client_id,
                    InventoryEntity.inventory_id == 1,
                ).first()
                if not menu_item:
                    print(f"⚠️ Menu item not found: item_id={item.item_id}"); continue

                inv_unit = (menu_item.unit or "").lower().strip()
                serving_qty = safe_decimal(menu_item.serving_quantity or 1)
                serving_unit = (menu_item.serving_unit or inv_unit).lower().strip()
                avail_base = convert_to_base(menu_item.availability, inv_unit)
                used_base = convert_to_base(serving_qty, serving_unit) * safe_decimal(item.quantity)
                menu_item.availability = convert_from_base(max(Decimal(0), avail_base - used_base), inv_unit)

                for ing in (menu_item.recipe or []):
                    try:
                        stock_id = int(ing.get("stock_item_id") or ing.get("id") or 0)
                        qty_req = safe_decimal(ing.get("quantity_required"))
                        qty_unit = (ing.get("unit") or "").lower().strip()
                    except Exception as e:
                        print(f"⚠️ Bad recipe entry: {ing} - {e}"); continue
                    if not stock_id: continue
                    stock_row = db.query(InventoryEntity).filter(
                        InventoryEntity.id == stock_id,
                        InventoryEntity.client_id == client_id,
                        InventoryEntity.inventory_id == 2,
                    ).first()
                    if not stock_row: continue
                    su = (stock_row.unit or "").lower()
                    sb = convert_to_base(stock_row.availability, su)
                    ub = convert_to_base(qty_req, qty_unit) * safe_decimal(item.quantity)
                    stock_row.availability = convert_from_base(max(Decimal(0), sb - ub), su)

            db.commit()
            print(f"✅ Inventory updated for order {order.id}")
        except Exception as e:
            db.rollback()
            print(f"❌ Inventory deduction failed: {e}")
            raise HTTPException(status_code=500, detail=f"Inventory deduction failed: {str(e)}")

        billing_sync = None
        try:
            auth = request.headers.get("authorization", "")
            user_jwt = auth.split(" ", 1)[1].strip() if auth.lower().startswith("bearer ") else ""
            if not user_jwt: raise ValueError("Missing JWT")
            from app.services.order_service import sync_served_order_to_billing_public
            billing_sync = sync_served_order_to_billing_public(order, user_jwt)
        except Exception as e:
            billing_sync = {"error": str(e)}

        return ResponseModel(
            screen_id=context.screen_id,
            data={"message": "Order served and inventory updated", "new_status": order.status, "billing_sync": billing_sync},
        )

    return ResponseModel(screen_id=context.screen_id, data={"message": "Status updated", "new_status": order.status})


@router.post("/order_items/update")
def update_order_items(
    client_id: str,
    order_id: Optional[int] = Query(None),
    body: Optional[List[OrderItemModel]] = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    if not order_id:
        raise HTTPException(status_code=400, detail="Missing order_id")
    try:
        order_id = int(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order_id")

    existing_items = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.order_id == order_id).all()
    existing_map = {(item.item_id, item.frontend_unique_key): item for item in existing_items}

    for incoming in body:
        key = (incoming.item_id, incoming.frontend_unique_key)
        if key in existing_map:
            db_item = existing_map[key]
            db_item.quantity = incoming.quantity
            db_item.line_total = (incoming.unit_price or 0) * (incoming.quantity or 1)
            db_item.status = incoming.status
        else:
            db.add(Db_OrderItem_Entity(
                client_id=client_id, order_id=order_id,
                item_id=incoming.item_id, item_name=incoming.item_name,
                quantity=incoming.quantity, unit_price=incoming.unit_price,
                line_total=(incoming.unit_price or 0) * (incoming.quantity or 1),
                status="pending", frontend_unique_key=incoming.frontend_unique_key,
            ))

    db.commit()
    return ResponseModel(screen_id=context.screen_id, data={"message": "Order updated without resetting old statuses"})


@router.post("/order_item/update")
def update_order_item(client_id: str, order_id: Optional[int] = Query(None), order_item: Optional[OrderItemModel] = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not order_id or not order_item or not order_item.id:
        raise HTTPException(status_code=400, detail="Missing order_id or order_item_id")
    existing_item = db.query(Db_OrderItem_Entity).filter(
        Db_OrderItem_Entity.id == order_item.id, Db_OrderItem_Entity.order_id == order_id,
    ).first()
    updated_item = Db_OrderItem_Entity.copyFromModel(order_item)
    for attr, value in updated_item.__dict__.items():
        if attr != "_sa_instance_state":
            setattr(existing_item, attr, value)
    db.commit()
    return ResponseModel(screen_id=context.screen_id, data={"message": "Order items updated successfully"})


@router.delete("/order_item/delete")
def delete_order_items(client_id: str, order_item_id: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not order_item_id:
        raise HTTPException(status_code=400, detail="Missing order_item_id")
    try:
        oid = int(str(order_item_id).strip())
    except:
        raise HTTPException(status_code=400, detail="Invalid order_item_id format")
    item = db.query(Db_OrderItem_Entity).filter(
        Db_OrderItem_Entity.id == oid, Db_OrderItem_Entity.client_id == client_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    db.delete(item)
    db.commit()
    return ResponseModel(screen_id=context.screen_id, data={"message": "Order item deleted"})


@router.delete("/dinein/delete")
def delete_order(client_id: str, dinein_order_id: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    """Delete by root internal id — also deletes all sub-orders sharing the same prefix."""
    if not dinein_order_id:
        raise HTTPException(status_code=400, detail="Missing dinein_order_id")
    try:
        did_int = int(str(dinein_order_id).strip())
    except:
        raise HTTPException(status_code=400, detail="Invalid dinein_order_id format")

    root_order = db.query(Db_Order_Entity).filter(
        Db_Order_Entity.id == did_int, Db_Order_Entity.client_id == client_id,
    ).first()
    if not root_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if root_order.status == OrderStatusEnum.served:
        raise HTTPException(status_code=400, detail="Cannot delete a served order")

    sub_orders = db.query(Db_Order_Entity).filter(
        Db_Order_Entity.client_id == client_id,
        Db_Order_Entity.dinein_order_id.like(f"{root_order.dinein_order_id}-%"),
    ).all()
    for sub in sub_orders:
        db.delete(sub)

    db.delete(root_order)
    db.commit()
    return ResponseModel(screen_id=context.screen_id, data={"message": "Order deleted"})


@router.get("/kds/orders")
def get_kds_orders(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    """
    KDS endpoint — returns FLAT individual DB rows (root + each sub-order separately).
    Each card on the KDS is one DB row with its own status, timer, dinein_order_id.
    Status changes update only that row's items independently.
    """
    orders = db.query(Db_Order_Entity).filter(
        Db_Order_Entity.client_id == str(client_id),
        Db_Order_Entity.status.in_([OrderStatusEnum.pending, OrderStatusEnum.preparing, OrderStatusEnum.ready]),
    ).order_by(Db_Order_Entity.created_at.asc()).all()

    result = [_order_row_to_flat(order) for order in orders]
    return ResponseModel(screen_id=context.screen_id, data=result)