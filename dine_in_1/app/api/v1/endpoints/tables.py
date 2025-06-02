from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app import schemas, crud
from app.schemas.table import TableCreate, TableUpdate, TableOut
from app.crud.table_crud import get_tables_by_client, create_table, update_table as crud_update_table, delete_table as crud_delete_table
from app.database import get_db  # assuming you have a get_db dependency

router = APIRouter()

@router.get("/{clientid}/tables", response_model=List[TableOut])
def read_tables(clientid: UUID, db: Session = Depends(get_db)):
    print(f"clientid received: {clientid} (type: {type(clientid)})")

    return get_tables_by_client(db, client_id=clientid)

@router.post("/{clientid}/tables", response_model=TableOut)
def create_table(
    table: TableCreate,
    clientid: UUID,
    db: Session = Depends(get_db)
):
    print("📥 Incoming clientid:", clientid)
    print("📦 Payload from frontend:", table)

    if table.client_id != clientid:
        raise HTTPException(status_code=400, detail="Client ID mismatch")
    return crud.table_crud.create_table(db, table)

@router.put("/{clientid}/tables/{table_id}", response_model=TableOut)
def update_table(clientid: UUID, table_id: UUID, updates: TableUpdate, db: Session = Depends(get_db)):
    updated = crud_update_table(db, client_id=clientid, table_id=table_id, updates=updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Table not found")
    return updated

@router.delete("/{clientid}/tables/{table_id}", response_model=TableOut)
def delete_table(clientid: UUID, table_id: UUID, db: Session = Depends(get_db)):
    deleted = crud_delete_table(db, client_id=clientid, table_id=table_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Table not found")
    return deleted
