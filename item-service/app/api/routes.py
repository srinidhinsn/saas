from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.postgres import get_db
from models.item_model import ItemCategoryModel, ItemModel
from entity.item_entity import ItemCategoryEntity, ItemEntity
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token

router = APIRouter()

# -------------------------- CATEGORY ROUTES --------------------------

@router.get("/read", response_model=ResponseModel[List[ItemCategoryModel]])
def read_categories(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    categories = db.query(ItemCategoryEntity).filter(ItemCategoryEntity.client_id == client_id).all()
    models     = ItemCategoryEntity.copyToModels(categories)
    return ResponseModel(screenId=context.screenId, status="success", message="Fetched categories", data=models)


@router.post("/create", response_model=ResponseModel[ItemCategoryModel])
def create_category(client_id: str, category: ItemCategoryModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if category.client_id != client_id or client_id != context.client_id:
        raise HTTPException(status_code=400, detail="Client ID mismatch or unauthorized")

    db_category = ItemCategoryEntity(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)

    model = ItemCategoryEntity.copyToModel(db_category)

    return ResponseModel(screenId=context.screenId, status="success", message="Category created", data=model)


@router.post("/update", response_model=ResponseModel[ItemCategoryModel])
def update_category(client_id: str, updates: ItemCategoryModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing category ID")
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db_category = db.query(ItemCategoryEntity).filter(ItemCategoryEntity.id == updates.id, ItemCategoryEntity.client_id == client_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_category, key, value)
    db.commit()
    db.refresh(db_category)

    model = ItemCategoryEntity.copyToModel(db_category)

    return ResponseModel(screenId=context.screenId, status="success", message="Category updated", data=model)


@router.post("/delete", response_model=ResponseModel[ItemCategoryModel])
def delete_category(client_id: str, category: ItemCategoryModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db_category = db.query(ItemCategoryEntity).filter(ItemCategoryEntity.id == category.id, ItemCategoryEntity.client_id == client_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(db_category)
    db.commit()

    model = ItemCategoryEntity.copyToModel(db_category)

    return ResponseModel(screenId=context.screenId, status="success", message="Category deleted", data=model)


# -------------------------- ITEM ROUTES --------------------------

@router.get("/items/read", response_model=ResponseModel[List[ItemModel]])
def read_items(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    items  = db.query(ItemEntity).filter(ItemEntity.client_id == client_id).all()
    models = ItemEntity.copyToModels(items)
    return ResponseModel(screenId=context.screenId, status="success", message="Fetched items", data=models)


@router.post("/items/create", response_model=ResponseModel[ItemModel])
def create_item(client_id: str, item: ItemModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if item.client_id != client_id or client_id != context.client_id:
        raise HTTPException(status_code=400, detail="Client ID mismatch or unauthorized")

    db_item = ItemEntity(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    model = ItemEntity.copyToModel(db_item)

    return ResponseModel(screenId=context.screenId, status="success", message="Item created", data=model)


@router.post("/items/update", response_model=ResponseModel[ItemModel])
def update_item(client_id: str, updates: ItemModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing item ID")
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db_item = db.query(ItemEntity).filter(ItemEntity.id == updates.id, ItemEntity.client_id == client_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)

    model = ItemEntity.copyToModel(db_item)

    return ResponseModel(screenId=context.screenId, status="success", message="Item updated", data=model)


@router.post("/items/delete", response_model=ResponseModel[ItemModel])
def delete_item(client_id: str, item: ItemModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db_item = db.query(ItemEntity).filter(ItemEntity.id == item.id, ItemEntity.client_id == client_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(db_item)
    db.commit()

    model = ItemEntity.copyToModel(db_item)

    return ResponseModel(screenId=context.screenId, status="success", message="Item deleted", data=model)
