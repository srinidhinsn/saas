from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.schemas.menu import *
from app.schemas.combo import *

from app.crud import menu_crud, combo_crud
from app.database import get_db

router = APIRouter()

# ------- Categories -------
@router.get("/{clientid}/menu/categories", response_model=List[MenuCategoryOut])
def list_categories(clientid: UUID, db: Session = Depends(get_db)):
    return menu_crud.get_categories(db, clientid)

@router.post("/{clientid}/menu/categories", response_model=MenuCategoryOut)
def add_category(clientid: UUID, cat: MenuCategoryCreate, db: Session = Depends(get_db)):
    if clientid != cat.client_id:
        raise HTTPException(400, detail="Client ID mismatch")
    return menu_crud.create_category(db, cat)

@router.put("/{clientid}/menu/categories/{cat_id}", response_model=MenuCategoryOut)
def edit_category(clientid: UUID, cat_id: UUID, updates: MenuCategoryUpdate, db: Session = Depends(get_db)):
    result = menu_crud.update_category(db, clientid, cat_id, updates)
    if not result:
        raise HTTPException(404, detail="Category not found")
    return result

@router.delete("/{clientid}/menu/categories/{cat_id}", response_model=MenuCategoryOut)
def remove_category(clientid: UUID, cat_id: UUID, db: Session = Depends(get_db)):
    result = menu_crud.delete_category(db, clientid, cat_id)
    if not result:
        raise HTTPException(404, detail="Category not found")
    return result


# ------- Menu Items -------
@router.get("/{clientid}/menu/items", response_model=List[MenuItemOut])
def list_items(clientid: UUID, db: Session = Depends(get_db)):
    return menu_crud.get_items(db, clientid)

@router.post("/{clientid}/menu/items", response_model=MenuItemOut)
def add_item(clientid: UUID, item: MenuItemCreate, db: Session = Depends(get_db)):
    if clientid != item.client_id:
        raise HTTPException(400, detail="Client ID mismatch")
    return menu_crud.create_item(db, item)

@router.put("/{clientid}/menu/items/{item_id}", response_model=MenuItemOut)
def edit_item(clientid: UUID, item_id: UUID, updates: MenuItemUpdate, db: Session = Depends(get_db)):
    result = menu_crud.update_item(db, clientid, item_id, updates)
    if not result:
        raise HTTPException(404, detail="Item not found")
    return result

@router.delete("/{clientid}/menu/items/{item_id}", response_model=MenuItemOut)
def remove_item(clientid: UUID, item_id: UUID, db: Session = Depends(get_db)):
    result = menu_crud.delete_item(db, clientid, item_id)
    if not result:
        raise HTTPException(404, detail="Item not found")
    return result

# --------- combos --------------


# ✅ GET combos for a client
@router.get("/{client_id}/menu/combos", response_model=List[ComboOut])
def get_combos(client_id: UUID, db: Session = Depends(get_db)):
    return combo_crud.get_combos_by_client(db, client_id)

