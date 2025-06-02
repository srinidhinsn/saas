from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas import combo as combo_schemas
from app.crud import combo_crud
from app.database import get_db
from uuid import UUID

router = APIRouter()

@router.post("/{clientid}/menu/combos", response_model=combo_schemas.ComboOut)
def create_combo(clientid: str, combo: combo_schemas.ComboCreate, db: Session = Depends(get_db)):
    if str(combo.client_id) != clientid:
        raise HTTPException(status_code=400, detail="Client ID mismatch")
    return combo_crud.create_combo(db, combo)

@router.put("/{clientid}/menu/combos/{combo_id}", response_model=combo_schemas.ComboOut)
def update_combo(clientid: str, combo_id: UUID, combo: combo_schemas.ComboCreate, db: Session = Depends(get_db)):
    updated = combo_crud.update_combo(db, combo_id, combo)
    if not updated:
        raise HTTPException(status_code=404, detail="Combo not found")
    return updated

@router.delete("/{clientid}/menu/combos/{combo_id}")
def delete_combo(clientid: str, combo_id: UUID, db: Session = Depends(get_db)):
    deleted = combo_crud.delete_combo(db, combo_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Combo not found")
    return { "detail": "Combo deleted successfully" }

