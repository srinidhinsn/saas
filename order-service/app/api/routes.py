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
from utils.transaction import record_transaction, record_partial_transaction
from models.saas_context import SaasContext
from typing import Optional
from entity.inventory_entity import InventoryEntity
from ..services.order_service import (
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
    )
    return ResponseModel(screen_id=context.screen_id, data=dinein_model)


@router.post("/dinein/create-sub-order", response_model=ResponseModel[DineinOrderModel])
def create_sub_order(
    client_id: str,
    parent_dinein_order_id: str,
    order: DineinOrderModel,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    root_order = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.dinein_order_id == parent_dinein_order_id,
        )
        .first()
    )
    if not root_order:
        raise HTTPException(status_code=404, detail=f"Parent order '{parent_dinein_order_id}' not found")

    existing_sub_count = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.dinein_order_id.like(f"{parent_dinein_order_id}-%"),
        )
        .count()
    )
    sub_dinein_order_id = f"{parent_dinein_order_id}-{existing_sub_count + 1}"

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
def get_orders_for_order_id(
    client_id: str,
    order_id: Optional[str] = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.id == order_id,
        )
        .first()
    )
    if not order:
        return ResponseModel(screen_id=context.screen_id, data=None, status="not_found")

    db_items = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.order_id == order.id,
            Db_OrderItem_Entity.status != OrderStatusEnum.cancelled,
        )
        .all()
    )
    item_models = [Db_OrderItem_Entity.copyToModel(item) for item in db_items]
    result = {
        "id": order.id,
        "dinein_order_id": order.dinein_order_id,
        "table_id": order.table_id,
        "client_id": order.client_id,
        "status": order.status,
        "created_at": order.created_at,
        "items": [i.dict() for i in item_models],
        "total_price": order.total_price,
    }
    return ResponseModel(screen_id=context.screen_id, data=result)


@router.get("/dinein/table")
def get_orders_for_table(
    client_id: str,
    table_id: Optional[str] = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    if table_id:
        orders = (
            db.query(Db_Order_Entity)
            .filter(
                Db_Order_Entity.client_id == client_id,
                Db_Order_Entity.table_id == table_id,
                Db_Order_Entity.status != OrderStatusEnum.cancelled,
            )
            .all()
        )
    else:
        orders = (
            db.query(Db_Order_Entity)
            .filter(
                Db_Order_Entity.client_id == client_id,
                Db_Order_Entity.status != OrderStatusEnum.cancelled,
            )
            .all()
        )

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

        related_orders = (
            db.query(Db_Order_Entity)
            .filter(
                Db_Order_Entity.client_id == client_id,
                Db_Order_Entity.dinein_order_id.like(f"{root_id}%"),
            )
            .all()
        )

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
                "message": "All related orders and items marked as served",
                "updated_count": len(related_orders),
                "deducted_count": len(orders_to_deduct),
            },
        )

    # ── Normal single-order update ─────────────────────────────────────────
    if body.status is not None:
        order.status = body.status

        # also update items if status is updated manually
        order_items = (
            db.query(Db_OrderItem_Entity)
            .filter(
                Db_OrderItem_Entity.order_id == order.id,
                Db_OrderItem_Entity.client_id == client_id,
            )
            .all()
        )

        for item in order_items:
            item.status = body.status

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
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order_id")

    existing_items = (
        db.query(Db_OrderItem_Entity)
        .filter(Db_OrderItem_Entity.order_id == order_id)
        .all()
    )

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
    existing_item = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.id == order_item.id,
            Db_OrderItem_Entity.order_id == order_id,
        )
        .first()
    )
    updated_item = Db_OrderItem_Entity.copyFromModel(order_item)
    for attr, value in updated_item.__dict__.items():
        if attr != "_sa_instance_state":
            setattr(existing_item, attr, value)
    db.commit()
    return ResponseModel(screen_id=context.screen_id, data={"message": "Order items updated successfully"})


@router.delete("/order_item/delete")
def delete_order_items(
    client_id: str,
    order_item_id: Optional[str] = Query(None),
    quantity: Optional[int] = Query(None),
    reason: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    if not order_item_id:
        raise HTTPException(status_code=400, detail="Missing order_item_id")
    try:
        oid = int(str(order_item_id).strip())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order_item_id format")

    # Parse transaction_type string → enum once, used throughout
    tx_type: Optional[TransactionTypeEnum] = None
    if transaction_type:
        try:
            tx_type = TransactionTypeEnum(transaction_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid transaction_type '{transaction_type}'")

    item = (
        db.query(Db_OrderItem_Entity)
        .filter(
            Db_OrderItem_Entity.id == oid,
            Db_OrderItem_Entity.client_id == client_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    order_id = item.order_id
    ordered_qty = item.quantity or 1
    item_name = item.item_name or ""
    frontend_unique_key = item.frontend_unique_key or ""
    inventory_item_id = item.item_id

    # ── Partial remove ────────────────────────────────────────────────────────
    remove_qty = quantity if (quantity and 0 < quantity < ordered_qty) else None

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

    # ── Full item cancel (soft) ───────────────────────────────────────────────
    if tx_type in (TransactionTypeEnum.wastage, TransactionTypeEnum.item_cancelled):
        menu_item = (
            db.query(InventoryEntity)
            .filter(
                InventoryEntity.id == inventory_item_id,
                InventoryEntity.client_id == client_id,
            )
            .first()
        )

        effective_reason = reason or (
            "Wastage — served item deleted"
            if tx_type == TransactionTypeEnum.wastage
            else "Item cancelled before serving"
        )

        base_remarks = (
            f"{effective_reason} | "
            f"{item_name} x{ordered_qty} | "
            f"[key={frontend_unique_key}]"
        )

        if menu_item:
            if tx_type == TransactionTypeEnum.item_cancelled:
                record_transaction(
                    db,
                    client_id=client_id,
                    stock_item_id=menu_item.id,
                    inventory_id=menu_item.inventory_id,
                    name=menu_item.name,
                    transaction_type=TransactionTypeEnum.item_cancelled,
                    movement_type=MovementTypeEnum.none,
                    quantity=Decimal(str(ordered_qty)),
                    unit=menu_item.unit or "",
                    before_stock=Decimal(str(menu_item.availability or 0)),
                    after_stock=Decimal(str(menu_item.availability or 0)),
                    reference_id=str(order_id),
                    reference_type="order",
                    remarks=f"[ITEM_CANCELLED] Order #{order_id} — {base_remarks}",
                )

            elif tx_type == TransactionTypeEnum.wastage:
                serving_qty = float(menu_item.serving_quantity or 0)
                serving_unit = (menu_item.serving_unit or "").strip()
                stock_unit = (menu_item.unit or "").strip()

                if serving_qty > 0 and serving_unit and stock_unit:
                    try:
                        converted_serving = _convert(serving_qty, serving_unit, stock_unit)
                        reversal_qty = Decimal(str(round(converted_serving * ordered_qty, 6)))
                        before_stock = Decimal(str(menu_item.availability or 0))
                        after_stock = before_stock + reversal_qty

                        record_transaction(
                            db,
                            client_id=client_id,
                            stock_item_id=menu_item.id,
                            inventory_id=menu_item.inventory_id,
                            name=menu_item.name,
                            transaction_type=TransactionTypeEnum.wastage,
                            movement_type=MovementTypeEnum.reversal,
                            quantity=reversal_qty,
                            unit=stock_unit,
                            before_stock=before_stock,
                            after_stock=after_stock,
                            reference_id=str(order_id),
                            reference_type="order",
                            remarks=f"[MENU_ITEM_REVERSAL] Order #{order_id} — {base_remarks}",
                        )
                        menu_item.availability = after_stock

                    except ValueError as exc:
                        print(
                            f"[WARN] Skipping menu item reversal for item_id={menu_item.id}: {exc}"
                        )
                else:
                    record_transaction(
                        db,
                        client_id=client_id,
                        stock_item_id=menu_item.id,
                        inventory_id=menu_item.inventory_id,
                        name=menu_item.name,
                        transaction_type=TransactionTypeEnum.wastage,
                        movement_type=MovementTypeEnum.reversal,
                        quantity=Decimal(str(ordered_qty)),
                        unit=stock_unit or "pcs",
                        before_stock=Decimal(str(menu_item.availability or 0)),
                        after_stock=Decimal(str(menu_item.availability or 0)),
                        reference_id=str(order_id),
                        reference_type="order",
                        remarks=f"[WASTAGE_NO_SERVING_QTY] Order #{order_id} — {base_remarks}",
                    )

                if menu_item.recipe:
                    for ingredient in menu_item.recipe:
                        stock_item_id_raw = ingredient.get("stock_item_id")
                        recipe_qty = float(ingredient.get("quantity_required") or 0)
                        recipe_unit = (ingredient.get("unit") or "").strip()

                        if not stock_item_id_raw or recipe_qty <= 0:
                            continue

                        stock_item = (
                            db.query(InventoryEntity)
                            .filter(
                                InventoryEntity.id == int(stock_item_id_raw),
                                InventoryEntity.client_id == client_id,
                            )
                            .first()
                        )
                        if not stock_item:
                            continue

                        ing_stock_unit = (stock_item.unit or "").strip()
                        try:
                            reversal = (
                                _convert(recipe_qty, recipe_unit, ing_stock_unit) * ordered_qty
                            )
                        except ValueError as exc:
                            print(
                                f"[WARN] Skipping ingredient reversal for stock_item_id={stock_item_id_raw}: {exc}"
                            )
                            continue

                        reversal_decimal = Decimal(str(round(reversal, 6)))
                        before_ing = Decimal(str(stock_item.availability or 0))
                        after_ing = before_ing + reversal_decimal

                        record_transaction(
                            db,
                            client_id=client_id,
                            stock_item_id=stock_item.id,
                            inventory_id=stock_item.inventory_id,
                            name=stock_item.name,
                            transaction_type=TransactionTypeEnum.wastage,
                            movement_type=MovementTypeEnum.reversal,
                            quantity=reversal_decimal,
                            unit=ing_stock_unit,
                            before_stock=before_ing,
                            after_stock=after_ing,
                            reference_id=str(order_id),
                            reference_type="order",
                            remarks=f"[INGREDIENT_REVERSAL] Order #{order_id} — {base_remarks}",
                        )
                        stock_item.availability = after_ing

    item.status = OrderStatusEnum.cancelled
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
            root_dinein_id = _root_dinein_id(
                order_row.dinein_order_id or str(order_row.id)
            )

            sub_orders = (
                db.query(Db_Order_Entity)
                .filter(
                    Db_Order_Entity.client_id == client_id,
                    Db_Order_Entity.dinein_order_id.like(f"{root_dinein_id}-%"),
                )
                .all()
            )
            for sub in sub_orders:
                sub.status = OrderStatusEnum.cancelled

            order_row.status = OrderStatusEnum.cancelled
            order_row.total_price = 0
            db.flush()

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
    return ResponseModel(
        screen_id=context.screen_id,
        data={"message": "Order item cancelled (soft delete)"},
    )


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

    effective_reason = reason or "Full order cancelled"
    table_id = root_order.table_id

    # 1. Main dine-in cancellation transaction
    total_cancel_value = sum(
        Decimal(str(order.total_price or 0)) for order in related_orders
    )

    record_transaction(
        db,
        client_id=client_id,
        stock_item_id=0,
        inventory_id=f"DINEIN-{root_dinein_id}",
        name="DINEIN_ORDER_CANCELLED",
        transaction_type=TransactionTypeEnum.order_cancelled,
        movement_type=MovementTypeEnum.none,
        quantity=Decimal("1"),
        unit="order",
        before_stock=Decimal("0"),
        after_stock=Decimal("0"),
        reference_id=str(root_order.id),
        reference_type="dinein_order",
        remarks=(
            f"[FULL_DINEIN_CANCELLED] "
            f"Root Order #{root_order.id} | "
            f"Table #{root_order.table_id} | "
            f"Total Value: {total_cancel_value} | "
            f"Reason: {effective_reason}"
        ),
    )

    # 2. Item-level cancellation transactions
    for order in related_orders:
        order.status = OrderStatusEnum.cancelled

        items = (
            db.query(Db_OrderItem_Entity)
            .filter(
                Db_OrderItem_Entity.order_id == order.id,
                Db_OrderItem_Entity.client_id == client_id,
            )
            .all()
        )

        for item in items:
            menu_item = (
                db.query(InventoryEntity)
                .filter(
                    InventoryEntity.id == item.item_id,
                    InventoryEntity.client_id == client_id,
                )
                .first()
            )

            ordered_qty = item.quantity or 1

            if menu_item:
                if item.status == OrderStatusEnum.served:
                    record_transaction(
                        db,
                        client_id=client_id,
                        stock_item_id=menu_item.id,
                        inventory_id=menu_item.inventory_id,
                        name=menu_item.name,
                        transaction_type=TransactionTypeEnum.wastage,
                        movement_type=MovementTypeEnum.none,
                        quantity=Decimal(str(ordered_qty)),
                        unit=menu_item.unit or "pcs",
                        before_stock=Decimal(str(menu_item.availability or 0)),
                        after_stock=Decimal(str(menu_item.availability or 0)),
                        reference_id=str(order.id),
                        reference_type="order",
                        remarks=(
                            f"[FULL_ORDER_CANCELLED_SERVED] "
                            f"Order #{order.id} | "
                            f"{item.item_name} x{ordered_qty} | "
                            f"{effective_reason}"
                        ),
                    )
                else:
                    record_transaction(
                        db,
                        client_id=client_id,
                        stock_item_id=menu_item.id,
                        inventory_id=menu_item.inventory_id,
                        name=menu_item.name,
                        transaction_type=TransactionTypeEnum.item_cancelled,
                        movement_type=MovementTypeEnum.none,
                        quantity=Decimal(str(ordered_qty)),
                        unit=menu_item.unit or "pcs",
                        before_stock=Decimal(str(menu_item.availability or 0)),
                        after_stock=Decimal(str(menu_item.availability or 0)),
                        reference_id=str(order.id),
                        reference_type="order",
                        remarks=(
                            f"[FULL_ORDER_CANCELLED] "
                            f"Order #{order.id} | "
                            f"{item.item_name} x{ordered_qty} | "
                            f"{effective_reason}"
                        ),
                    )

            item.status = OrderStatusEnum.cancelled

    # 3. Free table
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
            "message": "Dine-in cancelled and transactions recorded",
            "cancelled_count": len(related_orders),
            "table_freed": bool(table_id),
        },
    )


@router.delete("/dinein/delete")
def delete_order(
    client_id: str,
    dinein_order_id: Optional[str] = Query(None),
    reason: Optional[str] = Query(None),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    if not dinein_order_id:
        raise HTTPException(status_code=400, detail="Missing dinein_order_id")
    try:
        did_int = int(str(dinein_order_id).strip())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid dinein_order_id format")

    root_order = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.id == did_int,
            Db_Order_Entity.client_id == client_id,
        )
        .first()
    )
    if not root_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if root_order.status == OrderStatusEnum.served:
        raise HTTPException(status_code=400, detail="Cannot cancel a served order")

    root_dinein_id = _root_dinein_id(root_order.dinein_order_id or str(root_order.id))

    related_orders = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.client_id == client_id,
            Db_Order_Entity.dinein_order_id.like(f"{root_dinein_id}%"),
        )
        .all()
    )

    table_id = root_order.table_id
    effective_reason = reason or "Order cancelled"

    for o in related_orders:
        o.status = OrderStatusEnum.cancelled
        items = (
            db.query(Db_OrderItem_Entity)
            .filter(
                Db_OrderItem_Entity.order_id == o.id,
                Db_OrderItem_Entity.client_id == client_id,
            )
            .all()
        )
        for it in items:
            if it.status == OrderStatusEnum.served:
                menu_item = (
                    db.query(InventoryEntity)
                    .filter(
                        InventoryEntity.id == it.item_id,
                        InventoryEntity.client_id == client_id,
                    )
                    .first()
                )
                if menu_item:
                    ordered_qty = it.quantity or 1
                    base_remarks = (
                        f"{effective_reason} | order cancelled | "
                        f"{it.item_name} x{ordered_qty} | "
                        f"[key={it.frontend_unique_key or ''}]"
                    )
                    serving_qty = float(menu_item.serving_quantity or 0)
                    serving_unit = (menu_item.serving_unit or "").strip()
                    stock_unit = (menu_item.unit or "").strip()

                    if serving_qty > 0 and serving_unit and stock_unit:
                        try:
                            converted_serving = _convert(serving_qty, serving_unit, stock_unit)
                            reversal_qty = Decimal(
                                str(round(converted_serving * ordered_qty, 6))
                            )
                            before_stock = Decimal(str(menu_item.availability or 0))
                            after_stock = before_stock + reversal_qty
                            record_transaction(
                                db,
                                client_id=client_id,
                                stock_item_id=menu_item.id,
                                inventory_id=menu_item.inventory_id,
                                name=menu_item.name,
                                transaction_type=TransactionTypeEnum.wastage,
                                movement_type=MovementTypeEnum.reversal,
                                quantity=reversal_qty,
                                unit=stock_unit,
                                before_stock=before_stock,
                                after_stock=after_stock,
                                reference_id=str(o.id),
                                reference_type="order",
                                remarks=f"[WASTAGE_ORDER_CANCELLED] Order #{o.id} — {base_remarks}",
                            )
                            menu_item.availability = after_stock
                        except ValueError as exc:
                            print(
                                f"[WARN] Skipping reversal for item_id={menu_item.id}: {exc}"
                            )

                    if menu_item.recipe:
                        for ingredient in menu_item.recipe:
                            stock_item_id_raw = ingredient.get("stock_item_id")
                            recipe_qty = float(ingredient.get("quantity_required") or 0)
                            recipe_unit = (ingredient.get("unit") or "").strip()
                            if not stock_item_id_raw or recipe_qty <= 0:
                                continue
                            stock_item = (
                                db.query(InventoryEntity)
                                .filter(
                                    InventoryEntity.id == int(stock_item_id_raw),
                                    InventoryEntity.client_id == client_id,
                                )
                                .first()
                            )
                            if not stock_item:
                                continue
                            ing_stock_unit = (stock_item.unit or "").strip()
                            try:
                                reversal = (
                                    _convert(recipe_qty, recipe_unit, ing_stock_unit)
                                    * ordered_qty
                                )
                            except ValueError:
                                continue
                            reversal_decimal = Decimal(str(round(reversal, 6)))
                            before_ing = Decimal(str(stock_item.availability or 0))
                            after_ing = before_ing + reversal_decimal
                            record_transaction(
                                db,
                                client_id=client_id,
                                stock_item_id=stock_item.id,
                                inventory_id=stock_item.inventory_id,
                                name=stock_item.name,
                                transaction_type=TransactionTypeEnum.wastage,
                                movement_type=MovementTypeEnum.reversal,
                                quantity=reversal_decimal,
                                unit=ing_stock_unit,
                                before_stock=before_ing,
                                after_stock=after_ing,
                                reference_id=str(o.id),
                                reference_type="order",
                                remarks=f"[INGREDIENT_REVERSAL_ORDER_CANCELLED] Order #{o.id} — {base_remarks}",
                            )
                            stock_item.availability = after_ing

            else:
                menu_item = (
                    db.query(InventoryEntity)
                    .filter(
                        InventoryEntity.id == it.item_id,
                        InventoryEntity.client_id == client_id,
                    )
                    .first()
                )
                if menu_item:
                    ordered_qty = it.quantity or 1
                    record_transaction(
                        db,
                        client_id=client_id,
                        stock_item_id=menu_item.id,
                        inventory_id=menu_item.inventory_id,
                        name=menu_item.name,
                        transaction_type=TransactionTypeEnum.item_cancelled,
                        movement_type=MovementTypeEnum.none,
                        quantity=Decimal(str(ordered_qty)),
                        unit=menu_item.unit or "",
                        before_stock=Decimal(str(menu_item.availability or 0)),
                        after_stock=Decimal(str(menu_item.availability or 0)),
                        reference_id=str(o.id),
                        reference_type="order",
                        remarks=(
                            f"[ITEM_CANCELLED_ORDER_CANCELLED] Order #{o.id} — "
                            f"{effective_reason} | {it.item_name} x{ordered_qty}"
                        ),
                    )

            it.status = OrderStatusEnum.cancelled

    root_order.status = OrderStatusEnum.cancelled
    db.flush()

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
        data={"message": "Order cancelled (soft delete — row retained for audit)"},
    )


@router.get("/kds/orders")
def get_kds_orders(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    orders = (
        db.query(Db_Order_Entity)
        .filter(
            Db_Order_Entity.client_id == str(client_id),
            Db_Order_Entity.status.in_(
                [
                    OrderStatusEnum.pending,
                    OrderStatusEnum.preparing,
                    OrderStatusEnum.ready,
                ]
            ),
        )
        .order_by(Db_Order_Entity.created_at.asc())
        .all()
    )

    result = [_order_row_to_flat(order) for order in orders]
    return ResponseModel(screen_id=context.screen_id, data=result)