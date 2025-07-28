from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database.postgres import get_db
from models.inventory_model import Inventory
from entity.inventory_entity import InventoryEntity
from models.inventory_model import Category
from entity.inventory_entity import CategoryEntity
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token
from app.services import service

router = APIRouter()

# -------------------- INVENTORY ROUTES --------------------

@router.get("/read", response_model=ResponseModel[List[Inventory]])
def read_inventory(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    records = db.query(InventoryEntity).filter(InventoryEntity.client_id == client_id).all()
    models = InventoryEntity.copyToModels(records)
    return ResponseModel[List[Inventory]](screen_id=context.screen_id, status="success", message="Fetched inventory list", data=models)

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

# -------------------- CATEGORY ROUTES --------------------

@router.get("/read_category", response_model=ResponseModel)
def read_categories(client_id: str, category_id: Optional[str] = Query(None), context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    records = db.query(CategoryEntity).filter(CategoryEntity.client_id == client_id).all()
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
    if not record:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(record, key, value)
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