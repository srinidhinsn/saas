from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from common_lib.models.table_model import Table
from database import get_db
from common_lib.models.table_entity import DiningTable
from common_lib.models.order_entity import Order

router = APIRouter()

# GET Tables
@router.get("/{clientid}/tables", response_model=List[Table])
def read_tables(clientid: UUID, db: Session = Depends(get_db)):
    return db.query(DiningTable).filter(DiningTable.client_id == clientid).all()

# Create Tables
@router.post("/{clientid}/tables/create", response_model=Table)
def create_table(table: Table, clientid: UUID, db: Session = Depends(get_db)):

    if table.client_id != clientid:
        raise HTTPException(status_code=400, detail="Client ID mismatch")
    
    db.add(db_table := DiningTable(**table.dict()))
    db.commit()
    db.refresh(db_table)
    return db_table

# Update Tables
@router.post("/{clientid}/tables/update", response_model=Table)
def update_table(clientid: UUID, updates: Table, db: Session = Depends(get_db)):

    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing table ID in body")

    db_table = db.query(DiningTable).filter(DiningTable.id == updates.id, DiningTable.client_id == clientid).first()

    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")

    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_table, key, value)

    db.commit()
    db.refresh(db_table)
    return db_table

# Delete Tables
@router.post("/{clientid}/tables/delete", response_model=Table)
def delete_table(clientid: UUID, table: Table, db: Session = Depends(get_db)):

    if not table.id:
        raise HTTPException(status_code=400, detail="Missing table ID")

    db_table     = db.query(DiningTable).filter(DiningTable.id == table.id, DiningTable.client_id == clientid).first()

    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")

    orders_exist = db.query(Order).filter(Order.table_id == table.id).first()
    if orders_exist:
        raise HTTPException(status_code=400, detail="Cannot delete table with existing orders")

    db.delete(db_table)
    db.commit()
    return db_table




