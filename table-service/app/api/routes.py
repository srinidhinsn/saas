from fastapi import APIRouter, Depends, HTTPException, Header, Path
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from database.postgres import get_db
from models.table_model import Table
from entity.table_entity import DiningTable
from models.response_model import ResponseModel 
from models.saas_context import SaasContext
from utils.auth import hash_password, verify_password, create_access_token, verify_token

router = APIRouter()

# read tables
@router.get("/read", response_model=ResponseModel[List[Table]])
def read_tables(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    
    table_entities = db.query(DiningTable).filter(DiningTable.client_id == client_id).all()
    tables         = DiningTable.copyToModels(table_entities)
    response       = ResponseModel[List[Table]](screen_id=context.screen_id, data=tables)
    return response

# create tables
@router.post("/create", response_model=ResponseModel[Table])
def create_table(table: Table, client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):

    db_table = DiningTable(**table.dict())
    db.add(db_table)
    db.commit()
    db.refresh(db_table)

    table_model = DiningTable.copyToModel(db_table)
    response    = ResponseModel[Table](screen_id=context.screen_id, data=table_model)
    return response

# update tables
@router.post("/update", response_model=ResponseModel[Table])
def update_table(client_id: str, updates: Table, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):

    if not updates.id:
        raise HTTPException(status_code=400, detail="Missing table ID in body")
    if client_id != context.client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db_table = db.query(DiningTable).filter(DiningTable.id == updates.id, DiningTable.client_id == client_id).first()

    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")

    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_table, key, value)

    db.commit()
    db.refresh(db_table)

    table_model = DiningTable.copyToModel(db_table)
    response    = ResponseModel[Table](screen_id=context.screen_id, status="success", message="Table updated successfully", data=table_model)
    return response

# delete tables
@router.post("/delete", response_model=ResponseModel[Table])
def delete_table(client_id: str, table: Table, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):

    db_table = db.query(DiningTable).filter(DiningTable.id == table.id, DiningTable.client_id == client_id).first()

    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")

    db.delete(db_table)
    db.commit()

    table_model = DiningTable.copyToModel(db_table)
    response    = ResponseModel[Table](screen_id=context.screen_id, status="success", message="Table deleted successfully", data=table_model)
    return response



