from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID, uuid4
from database import get_db

from common_lib.models.combo_entity import MenuCombo, ComboItem as ComboItemModel
from common_lib.models.combo_model import Combo, ComboItem

router = APIRouter()

@router.get("/{client_id}/menu/combos", response_model=List[Combo])
def get_combos(client_id: UUID, db: Session = Depends(get_db)):
    combos = db.query(MenuCombo).filter(MenuCombo.client_id == client_id).all()
    result = []

    for combo in combos:
        combo_items = db.query(ComboItemModel).filter(ComboItemModel.combo_id == combo.id).all()
        items = [ComboItem(menu_item_id=ci.menu_item_id, quantity=ci.quantity) for ci in combo_items]

        result.append(Combo(
            id=combo.id,
            client_id=combo.client_id,
            name=combo.name,
            description=combo.description,
            price=combo.price,
            items=items
        ))
    return result

@router.post("/{client_id}/menu/combos/create", response_model=Combo)
def create_combo(client_id: str, combo: Combo, db: Session = Depends(get_db)):

    if str(combo.client_id) != client_id:
        raise HTTPException(status_code=400, detail="Client ID mismatch in combo creation.")

    db_combo = MenuCombo(id=uuid4(), client_id=combo.client_id, name=combo.name, description=combo.description, price=combo.price)
    db.add(db_combo)
    db.flush()

    combo_items = []
    for item in combo.items:
        combo_item = ComboItemModel(id=uuid4(), combo_id=db_combo.id, menu_item_id=item.menu_item_id, quantity=item.quantity)
        db.add(combo_item)
        combo_items.append(item)

    db.commit()
    return Combo(id=db_combo.id, client_id=db_combo.client_id, name=db_combo.name, description=db_combo.description,
                 price=db_combo.price, items=combo_items)


@router.post("/{client_id}/menu/combos/update", response_model=Combo)
def update_combo(client_id: str, combo: Combo, db: Session = Depends(get_db)):
    if not combo.id:
        raise HTTPException(status_code=400, detail="Missing combo ID for update.")
    if str(combo.client_id) != client_id:
        raise HTTPException(status_code=400, detail="Client ID mismatch in combo update.")

    db_combo = db.query(MenuCombo).filter(MenuCombo.id == combo.id).first()
    if not db_combo:
        raise HTTPException(status_code=404, detail="Combo not found for update.")

    db_combo.name        = combo.name
    db_combo.description = combo.description
    db_combo.price       = combo.price

    db.query(ComboItemModel).filter(ComboItemModel.combo_id == combo.id).delete()

    combo_items = []
    for item in combo.items:
        combo_item = ComboItemModel(id=uuid4(), combo_id=combo.id, menu_item_id=item.menu_item_id, quantity=item.quantity)
        db.add(combo_item)
        combo_items.append(item)

    db.commit()
    db.refresh(db_combo)

    return Combo(id=db_combo.id, client_id=db_combo.client_id, name=db_combo.name, description=db_combo.description,
                 price=db_combo.price, items=combo_items)



@router.post("/{client_id}/menu/combos/delete")
def delete_combo(client_id: str, combo_id: UUID = Query(...), db: Session = Depends(get_db)):
    db_combo = db.query(MenuCombo).filter(MenuCombo.id == combo_id).first()
    if not db_combo:
        raise HTTPException(status_code=404, detail="Combo not found for deletion.")

    db.delete(db_combo)
    db.commit()
    return {"detail": "Combo deleted successfully"}





