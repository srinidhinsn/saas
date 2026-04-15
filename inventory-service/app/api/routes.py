from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from decimal import Decimal, getcontext
from database.postgres import get_db
from models.inventory_model import Inventory, Category, InventoryTransaction
from entity.inventory_entity import InventoryEntity, CategoryEntity, InventoryTransactionEntity
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token
from services import service
from utils.transaction import _compute_current_stock, record_transaction, _convert, build_inventory_transaction
from sqlalchemy import text
from utils.services import add_master_value , get_master_values ,delete_master_value

# -------------------- CONFIG --------------------
router = APIRouter()
getcontext().prec = 18  # increase decimal precision

# -------------------- INVENTORY CRUD --------------------
@router.get("/read", response_model=ResponseModel[List[Inventory]])
def read_inventory(
    client_id: str,
    inventory_id: str | None = Query(default=None),
    zone_config_id: Optional[str] = Query(default=None),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    query = db.query(InventoryEntity).filter(InventoryEntity.client_id == client_id)

    if inventory_id:
        query = query.filter(InventoryEntity.inventory_id == inventory_id)
    if zone_config_id:
        query = query.filter(InventoryEntity.zone_config_id == zone_config_id)
    records = query.all()
    models = InventoryEntity.copyToModels(records)

    return ResponseModel[List[Inventory]](
        screen_id=context.screen_id,
        status="success",
        message="Fetched inventory list",
        data=models
    )


@router.post("/create", response_model=ResponseModel[Inventory])
def create_inventory(item: Inventory, client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    payload = item.dict()
    payload["client_id"] = client_id

    if not payload.get("id"):
        result = db.execute(text("SELECT nextval('inventory_id_seq')"))
        payload["id"] = result.scalar()
    zone_id = payload.get("zone_config_id")
    if zone_id in [None, "", "null"] or str(zone_id) == "nan":
        payload["zone_config_id"] = 0

    db_item = InventoryEntity(**payload)
    db.add(db_item)
    db.commit()

    saved = db.query(InventoryEntity).filter(
        InventoryEntity.id == db_item.id,
        InventoryEntity.zone_config_id == db_item.zone_config_id,
        InventoryEntity.client_id == client_id
    ).first()

    model = InventoryEntity.copyToModel(saved)
    return ResponseModel[Inventory](screen_id=context.screen_id,status="success",message="Inventory item created",data=model)


@router.post("/update", response_model=ResponseModel[Inventory])
def update_inventory(
    client_id: str,
    updates: Inventory,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing item ID")

    payload = updates.dict(exclude_unset=True)
    payload["client_id"] = client_id

    zone_id = payload.get("zone_config_id")
    if zone_id in [None, "", "null"] or str(zone_id) == "nan":
        zone_id = 0
    else:
        zone_id = int(zone_id)

    payload["zone_config_id"] = zone_id

    # ✅ Image-only path: ONLY when image_id is real AND unit_price is truly absent
    # unit_price=0 is a valid price — must NOT trigger image-only path
    image_id_val = payload.get("image_id")
    has_real_image = image_id_val and str(image_id_val).strip() not in ("", "null", "None")
    has_unit_price = "unit_price" in payload  # key present = price update intended

    if has_real_image and not has_unit_price:
        records = db.query(InventoryEntity).filter(
            InventoryEntity.id == updates.id,
            InventoryEntity.client_id == client_id
        ).all()

        if not records:
            raise HTTPException(status_code=404, detail="Inventory item not found")

        for record in records:
            record.image_id = image_id_val

        db.commit()

        return ResponseModel(
            screen_id=context.screen_id,
            status="success",
            message="Image updated for all zones",
            data=InventoryEntity.copyToModel(records[0])
        )

    # Normal update path — find the specific zone record
    record = db.query(InventoryEntity).filter(
        InventoryEntity.id == updates.id,
        InventoryEntity.zone_config_id == zone_id,
        InventoryEntity.client_id == client_id
    ).first()

    if record:
        for key, value in payload.items():
            setattr(record, key, value)
    else:
        record = InventoryEntity(**payload)
        db.add(record)

    db.commit()
    db.refresh(record)

    return ResponseModel(
    screen_id=context.screen_id,
    status="success",
    message="Inventory updated successfully",
    data=InventoryEntity.copyToModel(record)
    )

@router.post("/update/avail", response_model=ResponseModel[Inventory])
def update_inventory_availability(
    client_id: str,
    updates: Inventory,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Update a menu item's availability and record it as an ADJUSTMENT transaction
    in inventory_transactions for full audit history.
    """
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing item ID")

    record = db.query(InventoryEntity).filter(
        InventoryEntity.id == updates.id,
        InventoryEntity.client_id == client_id,
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = updates.dict(exclude_unset=True)
    new_availability = update_data.pop("availability", None)

    # Apply any other metadata fields that came along in the payload
    for key, value in update_data.items():
        if key != "client_id":
            setattr(record, key, value)

    # Only record a transaction if availability is actually being changed
    if new_availability is not None:
        new_qty = Decimal(str(new_availability))
        before_stock = Decimal(str(record.availability or 0))
        delta = new_qty - before_stock

        if delta != Decimal("0"):
            movement = "IN" if delta > 0 else "OUT"

            record_transaction(
                db,
                build_inventory_transaction(
                    client_id=client_id,
                    item_obj=record,
                    transaction_type="MENU_AVAILABILITY_ADJUSTMENT",
                    movement_type=movement,
                    quantity=abs(delta),
                    unit=record.serving_unit or record.unit,
                    before_stock=before_stock,
                    after_stock=new_qty,
                    created_by=getattr(context, "user_id", None),
                    remarks=f"Manual availability update for menu item '{record.name}'",
                )
            )

        record.availability = new_qty

    db.commit()
    db.refresh(record)
    model = InventoryEntity.copyToModel(record)

    return ResponseModel[Inventory](
        screen_id=context.screen_id,
        status="success",
        message="Inventory availability updated",
        data=model,
    )


@router.post("/delete", response_model=ResponseModel[Inventory])
def delete_inventory(
    client_id: str,
    item: Inventory,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if not item.id:
        raise HTTPException(status_code=400, detail="Missing item ID")

    # ✅ Fetch ALL records with this id (base + all zone variants)
    records = db.query(InventoryEntity).filter(
        InventoryEntity.id == item.id,
        InventoryEntity.client_id == client_id
    ).all()

    if not records:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Return the base record as the response model
    base_record = next(
        (r for r in records if r.zone_config_id == 0 or r.zone_config_id is None),
        records[0]
    )
    model = InventoryEntity.copyToModel(base_record)

    # ✅ Delete ALL zone variants together
    for record in records:
        db.delete(record)

    db.commit()

    return ResponseModel[Inventory](
        screen_id=context.screen_id,
        status="success",
        message="Inventory item and all zone variants deleted",
        data=model
    )

@router.delete("/delete_all", response_model=ResponseModel[str])
def delete_all_inventory( client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    records = db.query(InventoryEntity).filter(
        InventoryEntity.client_id == client_id
    ).all()

    if not records:
        return ResponseModel[str](
            screen_id=context.screen_id,
            status="success",
            message="No inventory items found — nothing to delete",
            data="No records to delete"
        )

    for record in records:
        db.delete(record)
    db.commit()

    return ResponseModel[str]( screen_id=context.screen_id, status="success", message="All inventory items deleted", data="All inventory items deleted successfully")
# -------------------- CATEGORY ROUTES --------------------


@router.get("/read_category", response_model=ResponseModel)
def read_categories(client_id: str, category_id: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    records = db.query(CategoryEntity).filter(
        CategoryEntity.client_id == client_id
    ).order_by(CategoryEntity.slug).all()
    
    models = CategoryEntity.copyToModels(records)
    print("models - ", models)
    
    categoryTree = service.build_category_tree(models, category_id)
    print("categoryTree - ", categoryTree)
    
    return ResponseModel(screen_id=context.screen_id, status="success", message="Fetched categories", data=categoryTree)

@router.post("/create_category", response_model=ResponseModel[Category])
def create_category(category: Category, client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    db_item = CategoryEntity(**category.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    model = CategoryEntity.copyToModel(db_item)
    
    return ResponseModel[Category](screen_id=context.screen_id, status="success", message="Category created", data=model)


@router.post("/update_category", response_model=ResponseModel[Category])
def update_category(client_id: str, updates: Category, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing category ID")
    
    record = db.query(CategoryEntity).filter(
        CategoryEntity.id == updates.id, 
        CategoryEntity.client_id == client_id
    ).first()
    
    print("Updating category:", record.id, "Client:", record.client_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Perform the update explicitly with both filters
    db.query(CategoryEntity).filter(
        CategoryEntity.id == updates.id,
        CategoryEntity.client_id == client_id
    ).update(
        updates.dict(exclude_unset=True),
        synchronize_session=False
    )
    
    db.commit()
    db.refresh(record)
    model = CategoryEntity.copyToModel(record)
    
    return ResponseModel[Category](screen_id=context.screen_id, status="success", message="Category updated", data=model)


@router.post("/delete_category", response_model=ResponseModel[Category])
def delete_category(client_id: str, category: Category, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    record = db.query(CategoryEntity).filter(
        CategoryEntity.id == category.id, 
        CategoryEntity.client_id == client_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(record)
    db.commit()
    model = CategoryEntity.copyToModel(record)
    
    return ResponseModel[Category](screen_id=context.screen_id, status="success", message="Category deleted", data=model)


# -------------------- STOCK ROUTES --------------------

@router.get("/stock", response_model=ResponseModel)
def get_stock_items(client_id: str,inventory_id: Optional[str] = Query(None),context: SaasContext = Depends(verify_token),db: Session = Depends(get_db),):
    query = db.query(InventoryEntity).filter(
        InventoryEntity.client_id == client_id
    )
 
    if inventory_id:
        query = query.filter(InventoryEntity.inventory_id == inventory_id)

    records = query.all()
    models = InventoryEntity.copyToModels(records)
 
    return ResponseModel(screen_id=context.screen_id, status="success", message="Fetched stock items", data=models)
 
 
@router.post("/stock/create", response_model=ResponseModel)
def create_stock_item(
    item: Inventory,
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Creates a stock item (metadata only) in the inventory table, then records
    the opening quantity as an IN transaction in inventory_transactions.
 
    - inventory table  → name, description, category_id, unit_price, unit_cost,
                         unit_gst, realm, code, image_id, slug … (availability
                         is kept in sync but quantity of truth lives in transactions)
    - inventory_transactions → quantity, unit, movement_type=IN,
                               transaction_type=STOCK_IN, before/after stock
    """
    if not item.inventory_id:
        raise HTTPException(status_code=400, detail="inventory_id is required")
 
    payload = item.dict()
    payload["client_id"] = client_id
    if not payload.get("id"):
        result = db.execute(text("SELECT nextval('inventory_id_seq')"))
        payload["id"] = result.scalar()
 
    # Quantity that will go into the transaction (defaults to 0 if not provided)
    opening_qty = Decimal(str(payload.get("availability") or "0"))
    unit = payload.get("unit")
 
    # Store the item WITHOUT the opening quantity (we track it via transactions)
    # availability is set to 0 here; it will be re-synced after the transaction
    payload["availability"] = Decimal("0")
 
    db_item = InventoryEntity(**payload)
    db.add(db_item)
    db.flush()  # get the auto-generated id before committing
 
    # Record the opening stock as an IN transaction (even if 0)
    before_stock = Decimal("0")
    after_stock = before_stock + opening_qty
 
    record_transaction(
        db,
        build_inventory_transaction(
            client_id=client_id,
            item_obj=db_item,
            transaction_type="STOCK_IN",
            movement_type="IN",
            quantity=opening_qty,
            unit=unit,
            before_stock=before_stock,
            after_stock=after_stock,
            created_by=getattr(context, "user_id", None),
            remarks="Opening stock on item creation",
        )
    )
 
    # Sync availability back onto the inventory row
    db_item.availability = after_stock
 
    db.commit()
    db.refresh(db_item)
    model = InventoryEntity.copyToModel(db_item)
 
    return ResponseModel(
        screen_id=context.screen_id,
        status="success",
        message="Stock item created with opening transaction",
        data=model,
    )
 
@router.post("/stock/add", response_model=ResponseModel)
def add_stock_quantity(
    client_id: str,
    stock_item_id: int,
    quantity: Decimal,
    unit: Optional[str] = None,
    remarks: Optional[str] = None,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Add more stock to an existing item (e.g. restocking rice after 3 days).
    Records an IN transaction and updates availability on the inventory row.
    Does NOT create a new inventory row.
    """
    record = db.query(InventoryEntity).filter(
        InventoryEntity.id == stock_item_id,
        InventoryEntity.client_id == client_id,
    ).first()
 
    if not record:
        raise HTTPException(status_code=404, detail="Stock item not found")
 
    before_stock = _compute_current_stock(db, client_id, stock_item_id)
    after_stock = before_stock + Decimal(str(quantity))
 
    record_transaction(
        db,
        build_inventory_transaction(
            client_id=client_id,
            item_obj=record,
            transaction_type="STOCK_IN",
            movement_type="IN",
            quantity=Decimal(str(quantity)),
            unit=unit or record.unit,
            before_stock=before_stock,
            after_stock=after_stock,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=getattr(context, "user_id", None),
            remarks=remarks or "Stock replenishment",
        )
    )
 
    # Sync availability
    record.availability = after_stock
    db.commit()
    db.refresh(record)
    model = InventoryEntity.copyToModel(record)
 
    return ResponseModel(
        screen_id=context.screen_id,
        status="success",
        message=f"Added {quantity} {unit or record.unit} to {record.name}",
        data=model,
    )
 
@router.post("/stock/deduct", response_model=ResponseModel)
def deduct_stock_quantity(
    client_id: str,
    stock_item_id: int,
    quantity: Decimal,
    unit: Optional[str] = None,
    transaction_type: str = "ORDER_DEDUCTION",
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None,
    remarks: Optional[str] = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Deduct stock from an existing item (e.g. an order used 200g of rice).
    Records an OUT transaction and updates availability on the inventory row.
    Raises 400 if the deduction would result in negative stock.
    """
    record = db.query(InventoryEntity).filter(
        InventoryEntity.id == stock_item_id,
        InventoryEntity.client_id == client_id,
    ).first()
 
    if not record:
        raise HTTPException(status_code=404, detail="Stock item not found")
 
    qty = Decimal(str(quantity))
    before_stock = _compute_current_stock(db, client_id, stock_item_id)
    after_stock = before_stock - qty
 
    if after_stock < Decimal("0"):
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {before_stock}, Requested: {qty}",
        )
 
    tx = build_inventory_transaction(
        client_id=client_id,
        item_obj=record,
        transaction_type=transaction_type,
        movement_type="OUT",
        quantity=qty,
        unit=unit or record.unit,
        before_stock=before_stock,
        after_stock=after_stock,
        reference_id=reference_id,
        reference_type=reference_type,
        created_by=getattr(context, "user_id", None),
        remarks=remarks,
    )
    record_transaction(db, tx)
 
    # Sync availability
    record.availability = after_stock
    db.commit()
    db.refresh(record)
    model = InventoryEntity.copyToModel(record)
 
    return ResponseModel(
        screen_id=context.screen_id,
        status="success",
        message=f"Deducted {quantity} {unit or record.unit} from {record.name}",
        data=model,
    )


@router.post("/stock/manual-deduct", response_model=ResponseModel)
def manual_deduct_stock(
    client_id: str,
    stock_item_id: int,
    quantity: Decimal,
    transaction_type: str,
    unit: Optional[str] = None,
    remarks: Optional[str] = None,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    allowed_types = {"RETURN", "CANCELLATION"}
    if transaction_type.upper() not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"transaction_type must be one of: {', '.join(allowed_types)}"
        )

    record = db.query(InventoryEntity).filter(
        InventoryEntity.id == stock_item_id,
        InventoryEntity.client_id == client_id,
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Stock item not found")

    qty = Decimal(str(quantity))
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")

    # ── Unit conversion (same logic as _deduct_stock_for_order) ──────────────
    input_unit = (unit or record.unit or "").strip()   # unit user typed in modal
    stock_unit = (record.unit or "").strip()           # unit the stock is stored in

    if input_unit and stock_unit and input_unit != stock_unit:
        # e.g. user enters 20ml but stock is in litre → converts to 0.02
        try:
            converted_qty = Decimal(str(_convert(float(qty), input_unit, stock_unit)))
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Unit conversion failed: {e}"
            )
    else:
        # Same unit or no unit provided — use as-is
        converted_qty = qty
    # ─────────────────────────────────────────────────────────────────────────

    before_stock = _compute_current_stock(db, client_id, stock_item_id)
    after_stock = before_stock - converted_qty

    if after_stock < Decimal("0"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock. "
                f"Available: {before_stock} {stock_unit}, "
                f"Requested: {qty} {input_unit}"
                + (f" = {converted_qty} {stock_unit}" if input_unit != stock_unit else "")
            ),
        )

    tx = build_inventory_transaction(
        client_id=client_id,
        item_obj=record,
        transaction_type=transaction_type.upper(),
        movement_type="OUT",
        quantity=converted_qty,          # store in stock's native unit
        unit=stock_unit,                 # always store native unit in transaction
        before_stock=before_stock,
        after_stock=after_stock,
        created_by=getattr(context, "user_id", None),
        remarks=remarks or None,
    )
    record_transaction(db, tx)

    record.availability = after_stock
    db.commit()
    db.refresh(record)
    model = InventoryEntity.copyToModel(record)

    return ResponseModel(
        screen_id=context.screen_id,
        status="success",
        message=(
            f"Deducted {qty} {input_unit}"
            + (f" ({converted_qty} {stock_unit})" if input_unit != stock_unit else "")
            + f" from {record.name}"
        ),
        data=model,
    )

@router.post("/stock/update", response_model=ResponseModel)
def update_stock_item(
    updates: Inventory,
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Update stock item metadata (name, description, unit_price, category_id …).
    If 'availability' is included in the payload it is treated as an ADJUSTMENT
    transaction (sets stock to the given absolute value) rather than a delta.
    """
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing item ID")
 
    record = db.query(InventoryEntity).filter(
        InventoryEntity.id == updates.id,
        InventoryEntity.client_id == client_id,
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Stock item not found")
 
    update_data = updates.dict(exclude_unset=True)
    new_availability = update_data.pop("availability", None)
 
    # Apply metadata updates (everything except availability)
    for key, value in update_data.items():
        if key != "client_id":
            setattr(record, key, value)
 
    # Handle availability change as an ADJUSTMENT transaction
    if new_availability is not None:
        new_qty = Decimal(str(new_availability))
        before_stock = _compute_current_stock(db, client_id, record.id)
        delta = new_qty - before_stock
 
        if delta != Decimal("0"):
            movement = "IN" if delta > 0 else "OUT"

            tx = build_inventory_transaction(
                client_id=client_id,
                item_obj=record,
                transaction_type="ADJUSTMENT",
                movement_type=movement,
                quantity=abs(delta),
                unit=record.unit,
                before_stock=before_stock,
                after_stock=new_qty,
                created_by=getattr(context, "user_id", None),
                remarks="Manual stock adjustment via update",
            )
            record_transaction(db, tx)
 
        record.availability = new_qty
 
    db.commit()
    db.refresh(record)
    model = InventoryEntity.copyToModel(record)
 
    return ResponseModel(screen_id=context.screen_id, status="success", message="Stock item updated", data=model)

 
@router.delete("/stock/delete_by_inventory")
async def delete_inventory_records(client_id: str, inventory_id: str,db: Session = Depends(get_db)):
    deleted_count = (
        db.query(InventoryEntity)
        .filter(
            InventoryEntity.client_id == client_id,
            InventoryEntity.inventory_id == inventory_id
        )
        .delete(synchronize_session=False)
    )
    db.commit()
 
    return { "status": "success", "deleted": deleted_count, "message": f"Deleted {deleted_count} records for inventory_id='{inventory_id}'"}
 
 
# -------------------- TRANSACTION ROUTES --------------------
 
@router.get("/transactions", response_model=ResponseModel[List[InventoryTransaction]])
def get_transactions(
    client_id: str,
    stock_item_id: Optional[int] = Query(None),
    inventory_id: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),   # IN | OUT
    transaction_type: Optional[str] = Query(None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Fetch transaction history with optional filters.
    Results are ordered newest-first.
    """
    query = db.query(InventoryTransactionEntity).filter(
        InventoryTransactionEntity.client_id == client_id
    )
 
    if stock_item_id:
        query = query.filter(InventoryTransactionEntity.stock_item_id == stock_item_id)
    if inventory_id:
        query = query.filter(InventoryTransactionEntity.inventory_id == inventory_id)
    if movement_type:
        query = query.filter(InventoryTransactionEntity.movement_type == movement_type.upper())
    if transaction_type:
        query = query.filter(InventoryTransactionEntity.transaction_type == transaction_type.upper())
 
    total = query.count()
    records = (
        query.order_by(InventoryTransactionEntity.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    models = InventoryTransactionEntity.copyToModels(records)
 
    return ResponseModel[List[InventoryTransaction]](
        screen_id=context.screen_id,
        status="success",
        message=f"Fetched {len(models)} of {total} transactions",
        data=models,
    )
 
 
@router.get("/transactions/summary", response_model=ResponseModel)
def get_stock_summary(
    client_id: str,
    stock_item_id: int,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Returns a summary for a single stock item:
    total IN, total OUT, and current computed stock level.
    """
    record = db.query(InventoryEntity).filter(
        InventoryEntity.id == stock_item_id,
        InventoryEntity.client_id == client_id,
    ).first()
 
    if not record:
        raise HTTPException(status_code=404, detail="Stock item not found")
 
    rows = (
        db.query(InventoryTransactionEntity)
        .filter(
            InventoryTransactionEntity.client_id == client_id,
            InventoryTransactionEntity.stock_item_id == stock_item_id,
        )
        .all()
    )
 
    total_in = sum(Decimal(str(r.quantity)) for r in rows if r.movement_type == "IN")
    total_out = sum(Decimal(str(r.quantity)) for r in rows if r.movement_type == "OUT")
    current_stock = total_in - total_out
 
    return ResponseModel(
        screen_id=context.screen_id,
        status="success",
        message="Stock summary",
        data={
            "stock_item_id": stock_item_id,
            "name": record.name,
            "unit": record.unit,
            "total_in": float(total_in),
            "total_out": float(total_out),
            "current_stock": float(current_stock),
            "availability_on_row": float(record.availability or 0),
            "transaction_count": len(rows),
        },
    )

# -------------------- RECIPE ROUTES --------------------
@router.get("/recipe/{menu_item_id}", response_model=ResponseModel)
def get_recipe_for_menu(
    menu_item_id: int,
    client_id: str,
    menu_inventory_id: str = Query(default="menu"),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    menu = (
        db.query(InventoryEntity)
        .filter(
            InventoryEntity.id == menu_item_id,
            InventoryEntity.client_id == client_id,
            InventoryEntity.inventory_id == menu_inventory_id,
        )
        .first()
    )
    
    if not menu:
        raise HTTPException(status_code=404, detail="Menu item not found")

    return ResponseModel(
        screen_id=context.screen_id,
        status="success",
        message="Fetched recipe",
        data={"recipe": menu.recipe or [], "line_item_id": menu.line_item_id or []},
    )


@router.post("/recipe/update", response_model=ResponseModel)
def update_recipe_for_menu(
    menu_item_id: int,
    payload: Dict[str, Any],
    client_id: str,
    menu_inventory_id: str = Query(default="menu"),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    menu = (
        db.query(InventoryEntity)
        .filter(
            InventoryEntity.id == menu_item_id,
            InventoryEntity.client_id == client_id,
            InventoryEntity.inventory_id == menu_inventory_id,
        )
        .first()
    )
    
    if not menu:
        raise HTTPException(status_code=404, detail="Menu item not found")

    updates = {}
    if "recipe" in payload:
        updates["recipe"] = payload["recipe"] or []
    if "line_item_id" in payload:
        updates["line_item_id"] = payload["line_item_id"] or []

    db.query(InventoryEntity).filter(
        InventoryEntity.id == menu_item_id, 
        InventoryEntity.client_id == client_id
    ).update(updates, synchronize_session=False)
    
    db.commit()
    db.refresh(menu)
    model = InventoryEntity.copyToModel(menu)
    
    return ResponseModel(
        screen_id=context.screen_id, 
        status="success", 
        message="Recipe updated", 
        data=model
    )

@router.get("/item-types")
def get_item_types(client_id: str, category_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    data = get_master_values(db, client_id, category_id)

    return ResponseModel(screen_id=context.screen_id,status="success",message="Config fetched",data=data)

@router.post("/item-types")
def add_item_type(client_id: str, category_id: str, value: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    data = add_master_value(db, client_id, category_id, value)

    return ResponseModel(screen_id=context.screen_id,status="success",message="Config added",data=data)

@router.delete("/item-types")
def delete_item_type(client_id: str, category_id: str, value: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    data = delete_master_value(db, client_id, category_id, value)

    return ResponseModel(screen_id=context.screen_id,status="success",message="Config deleted",data=data)
