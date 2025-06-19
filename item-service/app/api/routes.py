from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from database import get_db

from common_lib.models.menu_model import *
from common_lib.models.menu_entity import Item as ItemModel,  ItemCategory as ItemCategoryModel # SQLAlchemy model

router = APIRouter()

# --------------- Item Category ---------------- #

# Get Categories
@router.get("/{clientid}/menu/categories", response_model=List[ItemCategory])
def list_categories(clientid: UUID, db: Session = Depends(get_db)):
    return db.query(ItemCategoryModel).filter(ItemCategoryModel.client_id == clientid).all()

# Create Categories
@router.post("/{clientid}/menu/categories/create", response_model=ItemCategory)
def add_category(clientid: UUID, cat: ItemCategory, db: Session = Depends(get_db)):
    if clientid != cat.client_id:
        raise HTTPException(status_code=400, detail="Client ID mismatch")
    db_category = ItemCategoryModel(**cat.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# Update Categories
@router.post("/{clientid}/menu/categories/update", response_model=ItemCategory)
def edit_category(clientid: UUID, category: ItemCategory, db: Session = Depends(get_db)):
    if not category.id:
        raise HTTPException(status_code=400, detail="Missing category ID")
    
    db_cat = db.query(ItemCategoryModel).filter_by(id=category.id, client_id=clientid).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category.dict(exclude_unset=True).items():
        setattr(db_cat, key, value)
    
    db.commit()
    db.refresh(db_cat)
    return db_cat

# Delete Categories
@router.post("/{clientid}/menu/categories/delete", response_model=ItemCategory)
def remove_category(clientid: UUID, category: ItemCategory, db: Session = Depends(get_db)):
    if not category.id:
        raise HTTPException(status_code=400, detail="Missing category ID")

    db_cat = db.query(ItemCategoryModel).filter_by(id=category.id, client_id=clientid).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(db_cat)
    db.commit()
    return db_cat

# --------------- Item --------------- #

@router.get("/{clientid}/menu/items", response_model=List[Item])
def list_items(clientid: UUID, db: Session = Depends(get_db)):
    return db.query(ItemModel).filter(ItemModel.client_id == clientid).all()

@router.post("/{clientid}/menu/items/create", response_model=Item)
def add_item(clientid: UUID, item: Item, db: Session = Depends(get_db)):
    if clientid != item.client_id:
        raise HTTPException(status_code=400, detail="Client ID mismatch")

    db_item = ItemModel(**item.dict(exclude_unset=True))
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.post("/{clientid}/menu/items/update", response_model=Item)
def edit_item(clientid: UUID, updates: Item, db: Session = Depends(get_db)):
    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing item ID in body")

    db_item = db.query(ItemModel).filter_by(id=updates.id, client_id=clientid).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item

@router.post("/{clientid}/menu/items/delete", response_model=Item)
def remove_item(clientid: UUID, item_id: UUID, db: Session = Depends(get_db)):
    db_item = db.query(ItemModel).filter_by(id=item_id, client_id=clientid).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(db_item)
    db.commit()
    return db_item













