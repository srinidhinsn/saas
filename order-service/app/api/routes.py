from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from database.postgres import get_db
from models.response_model import ResponseModel
from entity.table_entity import DiningTable
from entity.order_entity import DineinOrder as Db_Order_Entity, OrderItem as Db_OrderItem_Entity
from models.order_model import (
    DineinOrderModel,
    OrderItemModel,
    OrderStatusEnum,
    TransactionTypeEnum,
    MovementTypeEnum,
)
from utils.auth import verify_token
from utils.transaction import record_partial_transaction, create_transaction , TxPayload, resolve_reason, build_remark
from models.saas_context import SaasContext
from typing import Optional
from entity.inventory_entity import InventoryEntity, CategoryEntity
from models.inventory_model import InventoryTransaction
from services.order_service import (
    _root_dinein_id,
    _order_row_to_flat,
    STATUS_PRIORITY,
    _merge_group,
    _deduct_stock_for_order,
    _convert,
)
from decimal import Decimal


router = APIRouter()


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
           unit_price=item.unit_price,   line_total=item.line_total,
        frontend_unique_key=item.frontend_unique_key, status=item.status,
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
    
    db_sub_order = Db_Order_Entity(
        client_id=client_id,
        dinein_order_id=sub_dinein_order_id,
        table_id=root_order.table_id,
        status=OrderStatusEnum.pending,
        price=root_order.price, gst=0, cst=0, total_price=root_order.total_price,
        created_by=order.created_by, invoice_id=None, invoice_status=None,
    )
    db.add(db_sub_order)
    db.flush()

    for item in order.items:
        db_item = Db_OrderItem_Entity(
            order_id=db_sub_order.id, client_id=client_id,
            item_id=item.item_id, item_name=item.item_name, slug=item.slug,
            quantity=item.quantity, unit_price=item.unit_price,
             line_total=item.line_total,  
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

    db_items = db.query(Db_OrderItem_Entity).filter(Db_OrderItem_Entity.order_id == order.id, Db_OrderItem_Entity.status != OrderStatusEnum.cancelled,).all()
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
            Db_Order_Entity.status != OrderStatusEnum.cancelled,
        ).all()
    else:
        orders = db.query(Db_Order_Entity).filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.status != OrderStatusEnum.cancelled,
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
        .filter(
            Db_Order_Entity.id == body.id,
            Db_Order_Entity.client_id == client_id
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail=f"Order {body.id} not found"
        )

    # ── Cancel entire order group ───────────────────────────────────────────
    if body.status == OrderStatusEnum.cancelled:
        root_id = _root_dinein_id(order.dinein_order_id)

        related_orders = (
            db.query(Db_Order_Entity)
            .filter(
                Db_Order_Entity.client_id == client_id,
                Db_Order_Entity.dinein_order_id.like(f"{root_id}%"),
            )
            .all()
        )

        for o in related_orders:
            # update main order
            o.status = OrderStatusEnum.cancelled

            # update all items
            order_items = (
                db.query(Db_OrderItem_Entity)
                .filter(
                    Db_OrderItem_Entity.order_id == o.id,
                    Db_OrderItem_Entity.client_id == client_id,
                )
                .all()
            )

            for item in order_items:
                item.status = OrderStatusEnum.cancelled

        cancellation_reason = getattr(body, "cancellation_reason", None)
        if cancellation_reason:
            for o in related_orders:
                if hasattr(o, "cancellation_reason"):
                    o.cancellation_reason = cancellation_reason

        db.commit()

        return ResponseModel(
            screen_id=context.screen_id,
            data={
                "message": "Order and all sub-orders cancelled",
                "cancelled_count": len(related_orders),
            },
        )

    # ── Served / completed entire group ────────────────────────────────────
    if body.status in [OrderStatusEnum.served, OrderStatusEnum.completed]:
        root_id = _root_dinein_id(order.dinein_order_id)

        related_orders = db.query(Db_Order_Entity).filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.dinein_order_id.like(f"{root_id}%")
        ).all()

        orders_to_deduct = []

        for o in related_orders:
            # Deduct only if not already served/completed
            should_deduct = o.status not in [
                OrderStatusEnum.served,
                OrderStatusEnum.completed
            ]

            # Update main order status
            o.status = body.status

            # Update all items in this order
            order_items = (
                db.query(Db_OrderItem_Entity)
                .filter(
                    Db_OrderItem_Entity.order_id == o.id,
                    Db_OrderItem_Entity.client_id == client_id,
                )
                .all()
            )

            for item in order_items:
             if item.status != OrderStatusEnum.cancelled:
               item.status = body.status

            if should_deduct:
                orders_to_deduct.append(o.id)

        db.flush()

        # Deduct stock only once
        for order_id in orders_to_deduct:
            _deduct_stock_for_order(
                db=db,
                client_id=client_id,
                order_id=order_id
            )

        db.commit()

        return ResponseModel(
            screen_id=context.screen_id,
            data={
                "message": "All related orders marked as served",
                "updated_count": len(related_orders),
                "deducted_count": len(orders_to_deduct),
            },
        )

    # ✅ Normal single order update (for other statuses)
    if body.status is not None:
        order.status = body.status

    if body.total_price is not None:
        order.total_price = body.total_price

    if body.table_id is not None:
        order.table_id = body.table_id

    if body.dinein_order_id is not None:
        order.dinein_order_id = body.dinein_order_id

    db.commit()
    db.refresh(order)

    return ResponseModel(
        screen_id=context.screen_id,
        data={
            "message": "Status updated",
            "new_status": order.status,
        },
    )


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

    existing_by_fkey = {
        item.frontend_unique_key: item
        for item in existing_items
        if item.frontend_unique_key
    }
    existing_by_item_id = {}
    for item in existing_items:
        existing_by_item_id.setdefault(item.item_id, []).append(item)

    matched_ids = set()

    for incoming in body:
        db_item = None

        fkey = incoming.frontend_unique_key
        if fkey and fkey in existing_by_fkey:
            candidate = existing_by_fkey[fkey]
            if candidate.id not in matched_ids:
                db_item = candidate
                matched_ids.add(candidate.id)

        if db_item is None and incoming.item_id in existing_by_item_id:
            for candidate in existing_by_item_id[incoming.item_id]:
                if candidate.id not in matched_ids:
                    db_item = candidate
                    matched_ids.add(candidate.id)
                    break

        if db_item:
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
    return ResponseModel(
        screen_id=context.screen_id,
        data={"message": "Order updated without resetting old statuses"},
    )


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
def delete_order_items( client_id: str, order_item_id: Optional[str] = Query(None), quantity: Optional[int] = Query(None), reason: Optional[str] = Query(None), transaction_type: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db),):
    if not order_item_id:
        raise HTTPException(status_code=400, detail="Missing order_item_id")
    try:
        oid = int(str(order_item_id).strip())
    except:
        raise HTTPException(status_code=400, detail="Invalid order_item_id format")

    tx_type: Optional[TransactionTypeEnum] = None
    if transaction_type:
        try:
            tx_type = TransactionTypeEnum(transaction_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid transaction_type '{transaction_type}'")

    item = db.query(Db_OrderItem_Entity).filter(
        Db_OrderItem_Entity.id == oid, Db_OrderItem_Entity.client_id == client_id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    order_id          = item.order_id
    ordered_qty       = item.quantity
    inventory_item_id = item.item_id

    remove_qty = quantity if (quantity and 0 < quantity < ordered_qty) else None
    effective_reason  = resolve_reason(reason, tx_type)

    def _tx(item_id, tx_type, qty, tag, name):
        create_transaction(
            db=db, client_id=client_id,
            payload=TxPayload(
                item_id=item_id,
                tx_type=tx_type,
                ref_id=order_id,
                qty=qty,
                remarks=build_remark(tag, order_id, name, qty, effective_reason),
            ),
        )

    if remove_qty:
        new_qty = ordered_qty - remove_qty

        if tx_type in (TransactionTypeEnum.wastage, TransactionTypeEnum.item_cancelled):
            record_partial_transaction(
                db,
                client_id=client_id,
                item=item,
                remove_qty=remove_qty,
                transaction_type=tx_type,
                reason=reason,
                order_id=order_id,
            )

        item.quantity = new_qty
        item.line_total = (item.unit_price or 0) * new_qty

        order_row = (
            db.query(Db_Order_Entity)
            .filter(
                Db_Order_Entity.id == order_id,
                Db_Order_Entity.client_id == client_id,
            )
            .first()
        )
        if order_row:
            all_items = (
                db.query(Db_OrderItem_Entity)
                .filter(
                    Db_OrderItem_Entity.order_id == order_id,
                    Db_OrderItem_Entity.client_id == client_id,
                    Db_OrderItem_Entity.status != OrderStatusEnum.cancelled,
                )
                .all()
            )
            order_row.total_price = sum(
                (i.unit_price or 0) * (new_qty if i.id == item.id else (i.quantity or 1))
                for i in all_items
            )

        db.commit()
        return ResponseModel(
            screen_id=context.screen_id,
            data={"message": f"Reduced qty by {remove_qty}, now {new_qty}"},
        )

    if tx_type in (TransactionTypeEnum.wastage, TransactionTypeEnum.item_cancelled):
        menu_item = (
            db.query(InventoryEntity)
            .filter(
                InventoryEntity.id == inventory_item_id,
                InventoryEntity.client_id == client_id,
            )
            .first()
        )

        if menu_item:
            category = (
                db.query(CategoryEntity)
                .filter(CategoryEntity.id == menu_item.category_id)
                .first()
            )
            is_combo = category and (category.name or "").lower().startswith("combo")

            def _record_item_transaction(inv_item, qty, is_combo_child=False):
                if tx_type == TransactionTypeEnum.item_cancelled:
                    tag = "COMBO_CHILD_CANCELLED" if is_combo_child else "ITEM_CANCELLED"
                    _tx(inv_item.id, TransactionTypeEnum.item_cancelled, qty, tag, inv_item.name)

                elif tx_type == TransactionTypeEnum.wastage:
                    tag = TransactionTypeEnum.combo_child_wastage if is_combo_child else TransactionTypeEnum.wastage
                    serving_qty  = float(inv_item.serving_quantity)
                    serving_unit = (inv_item.serving_unit or "").strip()
                    stock_unit   = (inv_item.unit or "").strip()

                    if serving_qty > 0 and serving_unit and stock_unit:
                        try:
                            converted    = _convert(serving_qty, serving_unit, stock_unit)
                            reversal_qty = Decimal(str(round(converted * qty, 6)))
                            _tx(inv_item.id, TransactionTypeEnum.wastage, reversal_qty, tag, inv_item.name)
                        except ValueError:
                            _tx(inv_item.id, TransactionTypeEnum.wastage, qty, tag, inv_item.name)
                    else:
                        _tx(inv_item.id, TransactionTypeEnum.wastage, qty, tag, inv_item.name)

                for ingredient in (inv_item.recipe or []):
                    stock_item_id_raw = ingredient.get("stock_item_id")
                    recipe_qty        = float(ingredient.get("quantity_required") or 0)
                    recipe_unit       = (ingredient.get("unit") or "").strip()

                    if not stock_item_id_raw or recipe_qty <= 0:
                        continue

                    stock_item = (
                        db.query(InventoryEntity)
                        .filter(InventoryEntity.id == int(stock_item_id_raw), InventoryEntity.client_id == client_id)
                        .first()
                    )
                    if not stock_item:
                        continue

                    ing_stock_unit = (stock_item.unit or "").strip()
                    try:
                        reversal = _convert(recipe_qty, recipe_unit, ing_stock_unit) * qty
                        _tx(
                            stock_item.id,
                            TransactionTypeEnum.wastage,
                            Decimal(str(round(reversal, 6))),
                            "INGREDIENT_REVERSAL",
                            inv_item.name,
                        )
                    except ValueError:
                        continue

            if is_combo:
                for child_id in (menu_item.line_item_id or []):
                    child_item = (
                        db.query(InventoryEntity)
                        .filter(InventoryEntity.id == int(child_id), InventoryEntity.client_id == client_id)
                        .first()
                    )
                    if not child_item:
                        continue
                    _record_item_transaction(child_item, ordered_qty, is_combo_child=True)
            else:
                _record_item_transaction(menu_item, ordered_qty)

    item.status     = OrderStatusEnum.cancelled
    item.line_total = 0
    db.flush()

    remaining_active = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.order_id == order_id,
            Db_OrderItem_Entity.client_id == client_id,
            Db_OrderItem_Entity.status != OrderStatusEnum.cancelled,
        )
        .all()
    )

    order_row = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.id == order_id,
            Db_Order_Entity.client_id == client_id,
        )
        .first()
    )

    if not remaining_active:
      if order_row:
        root_dinein_id = _root_dinein_id(order_row.dinein_order_id or str(order_row.id))

        # Cancel THIS order
        order_row.status = OrderStatusEnum.cancelled
        order_row.total_price = 0
        db.flush()

        # Check if any sibling order still has active items
        all_group_orders = (
            db.query(Db_Order_Entity)
            .filter(
                Db_Order_Entity.client_id == client_id,
                Db_Order_Entity.dinein_order_id.like(f"{root_dinein_id}%"),
                Db_Order_Entity.status != OrderStatusEnum.cancelled,
                )
                .all()
            )

        # Only free the table when the ENTIRE group is cancelled
        if not all_group_orders:
            table_id = order_row.table_id
            if table_id:
                table_row = (
                    db.query(DiningTable)
                    .filter(
                        DiningTable.id == table_id,
                        DiningTable.client_id == client_id,
                    )
                    .first()
                )
                if table_row:
                    table_row.status = "vacant"

        db.commit()
        return ResponseModel(
            screen_id=context.screen_id,
            data={
                "message": "Last active item cancelled — order marked cancelled and table freed"
            },
        )

    if order_row:
        order_row.total_price = sum(
            (i.unit_price or 0) * (i.quantity or 1) for i in remaining_active
        )

    db.commit()
    return ResponseModel(screen_id=context.screen_id, data={"message": "Order item deleted"})


@router.post("/dinein/cancel")
def cancel_order(
    client_id: str,
    order_id: int = Query(...),
    reason: Optional[str] = Query(None),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    root_order = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.id == order_id,
            Db_Order_Entity.client_id == client_id,
        )
        .first()
    )

    if not root_order:
        raise HTTPException(status_code=404, detail="Order not found")

    effective_reason = resolve_reason(reason, TransactionTypeEnum.order_cancelled)

    def _tx(item_id, tx_type, qty, tag, name, ref_id=None):
        create_transaction(
            db=db, client_id=client_id,
            payload=TxPayload(item_id=item_id, tx_type=tx_type, ref_id=ref_id or order_id, qty=qty, remarks=build_remark(tag, ref_id or order_id, name, qty, effective_reason))
        )

    root_dinein_id = _root_dinein_id(
        root_order.dinein_order_id or str(root_order.id)
    )

    related_orders = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.dinein_order_id.like(f"{root_dinein_id}%"),
        )
        .all()
    )

    total_cancel_value = sum(
        Decimal(str(order.total_price or 0)) for order in related_orders
    )

    processed_keys = set()

    for order in related_orders:
        order.status = OrderStatusEnum.cancelled

        items = (
            db.query(Db_OrderItem_Entity)
            .filter(
                Db_OrderItem_Entity.order_id == order.id,
                Db_OrderItem_Entity.client_id == client_id,
                Db_OrderItem_Entity.status != OrderStatusEnum.cancelled,
            )
            .all()
        )

        for item in items:
            item_key = f"{order.id}-{item.id}"
            if item_key in processed_keys:
                continue
            processed_keys.add(item_key)
            item.status = OrderStatusEnum.cancelled

            menu_item = (
                db.query(InventoryEntity)
                .filter(
                    InventoryEntity.id == item.item_id,
                    InventoryEntity.client_id == client_id,
                )
                .first()
            )

            if not menu_item:
                continue

            ordered_qty = item.quantity or 1
            is_served   = item.status == OrderStatusEnum.served
            tx_type     = TransactionTypeEnum.wastage if is_served else TransactionTypeEnum.item_cancelled

            category = (
                db.query(CategoryEntity)
                .filter(CategoryEntity.id == menu_item.category_id)
                .first()
            )
            is_combo = category and (category.name or "").lower().startswith("combo")

            targets = []
            if is_combo:
                for child_id in (menu_item.line_item_id or []):
                    child_item = (
                        db.query(InventoryEntity)
                        .filter(
                            InventoryEntity.id == int(child_id),
                            InventoryEntity.client_id == client_id,
                        )
                        .first()
                    )
                    if child_item:
                        targets.append((child_item, True))
            else:
                targets.append((menu_item, False))

            for inv_item, is_combo_child in targets:
                tag = (TransactionTypeEnum.combo_child_wastage.value if is_served else TransactionTypeEnum.combo_child_cancelled.value) if is_combo_child else (TransactionTypeEnum.wastage.value if is_served else TransactionTypeEnum.item_cancelled.value)
                _tx(inv_item.id, tx_type, ordered_qty, tag, inv_item.name, ref_id=order.id)

                for ingredient in (inv_item.recipe or []):
                    stock_item_id = ingredient.get("stock_item_id")
                    recipe_qty = float(ingredient.get("quantity_required") or 0)
                    recipe_unit = (ingredient.get("unit") or "").strip()

                    if not stock_item_id or recipe_qty <= 0:
                        continue

                    stock_item = (
                        db.query(InventoryEntity)
                        .filter(
                            InventoryEntity.id == int(stock_item_id),
                            InventoryEntity.client_id == client_id,
                        )
                        .first()
                    )
                    if not stock_item:
                        continue

                    try:
                        converted = _convert(
                            recipe_qty, recipe_unit, stock_item.unit.strip()
                        )
                        total_qty = round(converted * ordered_qty, 6)
                        
                        _tx(
                            stock_item.id,
                            TransactionTypeEnum.wastage,
                            total_qty,
                            TransactionTypeEnum.recipe_cancel.value,
                            inv_item.name,
                            ref_id=order.id,
                        )

                    except ValueError:
                        continue

    if root_order.table_id:
        table_row = (
            db.query(DiningTable)
            .filter(
                DiningTable.id == root_order.table_id,
                DiningTable.client_id == client_id,
            )
            .first()
        )
        if table_row:
            table_row.status = "vacant"

    db.commit()

    return ResponseModel(
        screen_id=context.screen_id,
        data={
            "message": "Dine-in cancelled and transactions recorded",
            "cancelled_count": len(related_orders),
            "table_freed": bool(root_order.table_id),
        },
    )

# @router.delete("/dinein/delete")
# def delete_order(client_id: str, dinein_order_id: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db),reason: Optional[str] = Query(None)):
#     """Delete by root internal id — also deletes all sub-orders sharing the same prefix."""
#     if not dinein_order_id:
#         raise HTTPException(status_code=400, detail="Missing dinein_order_id")
#     try:
#         did_int = int(str(dinein_order_id).strip())
#     except:
#         raise HTTPException(status_code=400, detail="Invalid dinein_order_id format")

#     root_order = db.query(Db_Order_Entity).filter(
#         Db_Order_Entity.id == did_int, Db_Order_Entity.client_id == client_id,
#     ).first()
#     if not root_order:
#         raise HTTPException(status_code=404, detail="Order not found")
#     if root_order.status == OrderStatusEnum.served:
#         raise HTTPException(status_code=400, detail="Cannot delete a served order")

#     root_dinein_id = _root_dinein_id(root_order.dinein_order_id or str(root_order.id))
#     def _tx(item_id, tx_type, qty, remarks, ref_id):
#         create_transaction(
#             db=db, client_id=client_id,
#             payload=TxPayload(item_id=item_id, tx_type=tx_type, ref_id=ref_id, qty=qty, remarks=remarks)
#         )
#     related_orders = (
#         db.query(Db_Order_Entity)
#         .filter(
#             Db_Order_Entity.client_id == client_id,
#             Db_Order_Entity.dinein_order_id.like(f"{root_dinein_id}%"),
#         )
#         .all()
#     )

#     table_id = root_order.table_id
#     effective_reason = reason or "Order cancelled"

#     for o in related_orders:
#         o.status = OrderStatusEnum.cancelled
#         items = (
#             db.query(Db_OrderItem_Entity)
#             .filter(
#                 Db_OrderItem_Entity.order_id == o.id,
#                 Db_OrderItem_Entity.client_id == client_id,
#             )
#             .all()
#         )
#         for it in items:
#             if it.status == OrderStatusEnum.served:
#                 menu_item = (
#                     db.query(InventoryEntity)
#                     .filter(
#                         InventoryEntity.id == it.item_id,
#                         InventoryEntity.client_id == client_id,
#                     )
#                     .first()
#                 )
#                 if menu_item:
#                     ordered_qty = it.quantity or 1
#                     base_remarks = (
#                         f"{effective_reason} | order cancelled | "
#                         f"{it.item_name} x{ordered_qty} | "
#                         f"[key={it.frontend_unique_key or ''}]"
#                     )
#                     serving_qty = float(menu_item.serving_quantity or 0)
#                     serving_unit = (menu_item.serving_unit or "").strip()
#                     stock_unit = (menu_item.unit or "").strip()

#                     if serving_qty > 0 and serving_unit and stock_unit:
#                         try:
#                             converted_serving = _convert(serving_qty, serving_unit, stock_unit)
#                             reversal_qty = Decimal(
#                                 str(round(converted_serving * ordered_qty, 6))
#                             )
#                             before_stock = Decimal(str(menu_item.availability or 0))
#                             after_stock = before_stock + reversal_qty
#                             _tx(menu_item.id, TransactionTypeEnum.wastage, reversal_qty,
#     f"[WASTAGE_ORDER_CANCELLED] Order #{o.id} — {base_remarks}", ref_id=o.id)

#                             menu_item.availability = after_stock
#                         except ValueError as exc:
#                             print(
#                                 f"[WARN] Skipping reversal for item_id={menu_item.id}: {exc}"
#                             )

#                     if menu_item.recipe:
#                         for ingredient in menu_item.recipe:
#                             stock_item_id_raw = ingredient.get("stock_item_id")
#                             recipe_qty = float(ingredient.get("quantity_required") or 0)
#                             recipe_unit = (ingredient.get("unit") or "").strip()
#                             if not stock_item_id_raw or recipe_qty <= 0:
#                                 continue
#                             stock_item = (
#                                 db.query(InventoryEntity)
#                                 .filter(
#                                     InventoryEntity.id == int(stock_item_id_raw),
#                                     InventoryEntity.client_id == client_id,
#                                 )
#                                 .first()
#                             )
#                             if not stock_item:
#                                 continue
#                             ing_stock_unit = (stock_item.unit or "").strip()
#                             try:
#                                 reversal = (
#                                     _convert(recipe_qty, recipe_unit, ing_stock_unit)
#                                     * ordered_qty
#                                 )
#                             except ValueError:
#                                 continue
#                             reversal_decimal = Decimal(str(round(reversal, 6)))
#                             before_ing = Decimal(str(stock_item.availability or 0))
#                             after_ing = before_ing + reversal_decimal
#                             _tx(stock_item.id, TransactionTypeEnum.wastage, reversal_decimal,
#     f"[INGREDIENT_REVERSAL_ORDER_CANCELLED] Order #{o.id} — {base_remarks}", ref_id=o.id)

#                             stock_item.availability = after_ing

#             else:
#                 menu_item = (
#                     db.query(InventoryEntity)
#                     .filter(
#                         InventoryEntity.id == it.item_id,
#                         InventoryEntity.client_id == client_id,
#                     )
#                     .first()
#                 )
#                 if menu_item:
#                     ordered_qty = it.quantity or 1
#                     _tx(menu_item.id, TransactionTypeEnum.item_cancelled, ordered_qty,
#     f"[ITEM_CANCELLED_ORDER_CANCELLED] Order #{o.id} — {effective_reason} | {it.item_name} x{ordered_qty}",
#     ref_id=o.id)

#             it.status = OrderStatusEnum.cancelled

#     root_order.status = OrderStatusEnum.cancelled
#     db.flush()

#     if table_id:
#         table_row = (
#             db.query(DiningTable)
#             .filter(
#                 DiningTable.id == table_id,
#                 DiningTable.client_id == client_id,
#             )
#             .first()
#         )
#         if table_row:
#             table_row.status = "vacant"

#     db.commit()
#     return ResponseModel(screen_id=context.screen_id, data={"message": "Order deleted"})

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
