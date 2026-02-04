from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from decimal import Decimal, getcontext
from database.postgres import get_db
from models.inventory_model import Inventory, Category
from entity.inventory_entity import InventoryEntity, CategoryEntity
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token
from services import service

# -------------------- CONFIG --------------------
router = APIRouter()
getcontext().prec = 18  # increase decimal precision

# -------------------- INVENTORY CRUD --------------------
@router.get("/read", response_model=ResponseModel[List[Inventory]])
def read_inventory(
    client_id: str,
    realm: str | None = Query(default=None),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    query = db.query(InventoryEntity).filter(InventoryEntity.client_id == client_id)

    if realm:
        query = query.filter(InventoryEntity.realm == realm)

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
    db_item = InventoryEntity(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    model = InventoryEntity.copyToModel(db_item)
    return ResponseModel[Inventory](screen_id=context.screen_id, status="success", message="Inventory item created", data=model)

@router.post("/update", response_model=ResponseModel[Inventory])
def update_inventory(client_id: str, updates: Inventory, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing item ID")
    
    record = db.query(InventoryEntity).filter(InventoryEntity.id == updates.id, InventoryEntity.client_id == client_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    model = InventoryEntity.copyToModel(record)
    return ResponseModel[Inventory](screen_id=context.screen_id, status="success", message="Inventory item updated", data=model)

@router.post("/delete", response_model=ResponseModel[Inventory])
def delete_inventory(client_id: str, item: Inventory, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    record = db.query(InventoryEntity).filter(InventoryEntity.id == item.id, InventoryEntity.client_id == client_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    db.delete(record)
    db.commit()
    model = InventoryEntity.copyToModel(record)
    return ResponseModel[Inventory](screen_id=context.screen_id, status="success", message="Inventory item deleted", data=model)

@router.delete("/delete_all", response_model=ResponseModel[str])
def delete_all_inventory(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    records = db.query(InventoryEntity).filter(InventoryEntity.client_id == client_id).all()

    if not records:
        # ✅ No items? Just return success instead of 404
        return ResponseModel[str](
            screen_id=context.screen_id,
            status="success",
            message="No inventory items found — nothing to delete",
            data="No records to delete"
        )

    for record in records:
        db.delete(record)
    db.commit()

    return ResponseModel[str](
        screen_id=context.screen_id,
        status="success",
        message="All inventory items deleted",
        data="All inventory items deleted successfully"
    )

# -------------------- CATEGORY ROUTES --------------------

@router.get("/read_category", response_model=ResponseModel)
def read_categories(client_id: str, category_id: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    records = db.query(CategoryEntity).filter(CategoryEntity.client_id == client_id).order_by(CategoryEntity.slug).all()
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
    record = db.query(CategoryEntity).filter(CategoryEntity.id == updates.id, CategoryEntity.client_id == client_id).first()
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
    record = db.query(CategoryEntity).filter(CategoryEntity.id == category.id, CategoryEntity.client_id == client_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(record)
    db.commit()
    model = CategoryEntity.copyToModel(record)
    return ResponseModel[Category](screen_id=context.screen_id, status="success", message="Category deleted", data=model)

# -------------------- STOCK ROUTES --------------------
@router.get("/stock", response_model=ResponseModel)
def get_stock_items(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    records = (
        db.query(InventoryEntity)
        .filter(InventoryEntity.client_id == client_id, InventoryEntity.inventory_id == 2)
        .all()
    )
    models = InventoryEntity.copyToModels(records)
    return ResponseModel(
        screen_id=context.screen_id, status="success", message="Fetched stock items", data=models
    )


@router.post("/stock/create", response_model=ResponseModel)
def create_stock_item(
    item: Inventory,
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    payload = item.dict()
    payload["client_id"] = client_id
    payload["inventory_id"] = 2
    payload["realm"] = "inventory"
    db_item = InventoryEntity(**payload)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    model = InventoryEntity.copyToModel(db_item)
    return ResponseModel(
        screen_id=context.screen_id, status="success", message="Stock item created", data=model
    )


@router.post("/stock/update", response_model=ResponseModel)
def update_stock_item(
    updates: Inventory,
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing item ID")

    record = (
        db.query(InventoryEntity)
        .filter(
            InventoryEntity.id == updates.id,
            InventoryEntity.client_id == client_id,
            InventoryEntity.inventory_id == 2,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Stock item not found")

    for key, value in updates.dict(exclude_unset=True).items():
        if key != "client_id":
            setattr(record, key, value)

    db.commit()
    db.refresh(record)
    model = InventoryEntity.copyToModel(record)
    return ResponseModel(
        screen_id=context.screen_id, status="success", message="Stock item updated", data=model
    )


@router.delete("/stock/delete_by_realm_inventory")
async def delete_inventory_records( client_id: str, realm: str, inventory_id: int, db: Session = Depends(get_db)):
    deleted_count = (
        db.query(InventoryEntity)
        .filter( InventoryEntity.client_id == client_id, InventoryEntity.realm == realm, InventoryEntity.inventory_id == inventory_id
        )
        .delete(synchronize_session=False)
    )
    db.commit()

    return {
        "status": "success",
        "deleted": deleted_count,
        "message": f"Deleted {deleted_count} records where realm='{realm}' and inventory_id={inventory_id}"
    }


# -------------------- RECIPE ROUTES --------------------
@router.get("/recipe/{menu_item_id}", response_model=ResponseModel)
def get_recipe_for_menu(
    menu_item_id: int,
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    menu = (
        db.query(InventoryEntity)
        .filter(
            InventoryEntity.id == menu_item_id,
            InventoryEntity.client_id == client_id,
            InventoryEntity.inventory_id == 1,
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
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    menu = (
        db.query(InventoryEntity)
        .filter(
            InventoryEntity.id == menu_item_id,
            InventoryEntity.client_id == client_id,
            InventoryEntity.inventory_id == 1,
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
        InventoryEntity.id == menu_item_id, InventoryEntity.client_id == client_id
    ).update(updates, synchronize_session=False)
    db.commit()
    db.refresh(menu)
    model = InventoryEntity.copyToModel(menu)
    return ResponseModel(
        screen_id=context.screen_id, status="success", message="Recipe updated", data=model
    )

# ============================================= Add Role ======================================================== #
@router.post("/roles", response_model=ResponseModel)
def add_role(client_id: str,category_id: str,value: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    role = value.strip().lower()
    
    if not role:
        raise HTTPException(status_code=400, detail="Role name is required")

    category = db.query(CategoryEntity).filter(
        CategoryEntity.id == category_id,
        CategoryEntity.client_id == client_id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    items = category.sub_categories or []

    if role in [r.lower() for r in items]:
        raise HTTPException(status_code=409, detail="Role already exists")

    category.sub_categories = items + [role]

    existing_role_row = db.query(CategoryEntity).filter(
        CategoryEntity.id == role,
        CategoryEntity.client_id == client_id
    ).first()

    if not existing_role_row:
        db.add(
            CategoryEntity(
                id=role,
                client_id=client_id,
                name=role.capitalize(),
                description=f"Role {role}",
                sub_categories=None,
                slug=f"_Role_{role}",
            )
        )

    db.commit()
    db.refresh(category)

    return ResponseModel(screen_id=context.screen_id,status="success",message="Role added successfully",data=category.sub_categories)

@router.delete("/roles", response_model=ResponseModel)
def delete_role(client_id: str,category_id: str,value: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    role = value.strip().lower()

    category = db.query(CategoryEntity).filter(
        CategoryEntity.id == category_id,
        CategoryEntity.client_id == client_id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    items = category.sub_categories or []

    if role not in [i.lower() for i in items]:
        raise HTTPException(status_code=404, detail="Role not found")

    category.sub_categories = [i for i in items if i.lower() != role]

    role_row = db.query(CategoryEntity).filter(
        CategoryEntity.id == role,
        CategoryEntity.client_id == client_id
    ).first()

    if role_row:
        db.delete(role_row)

    db.commit()
    db.refresh(category)

    return ResponseModel(screen_id=context.screen_id,status="success",message="Role deleted successfully",data=category.sub_categories)
