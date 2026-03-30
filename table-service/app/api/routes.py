from fastapi import APIRouter, Depends, HTTPException, Header, Path
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from database.postgres import get_db
from models.table_model import Table , TablesModel
from entity.table_entity import DiningTable , Tables
from models.response_model import ResponseModel 
from models.saas_context import SaasContext
from utils.auth import verify_token

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
    
    table_model = DiningTable.copyToModel(db_table)

    db.delete(db_table)
    db.commit()

    
    response    = ResponseModel[Table](screen_id=context.screen_id, status="success", message="Table deleted successfully", data=table_model)
    return response


@router.post("/config")
def create_config(data: TablesModel, db: Session = Depends(get_db)):

    existing = db.query(Tables).filter(
        Tables.client_id == data.client_id,
        Tables.section == data.section,
        Tables.zone == data.zone
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="Already exists")

    new_config = Tables(**data.dict())
    db.add(new_config)
    db.commit()
    db.refresh(new_config)

    return new_config

@router.get("/config")
def get_configs(client_id: str, db: Session = Depends(get_db)):
    return db.query(Tables).filter(Tables.client_id == client_id).all()

@router.delete("/config/{id}")
def delete_config(id: int, client_id: str, db: Session = Depends(get_db)):

    config = db.query(Tables).filter(
        Tables.id == id,
        Tables.client_id == client_id
    ).first()

    if not config:
        raise HTTPException(404, "Not found")

    db.delete(config)
    db.commit()

    return {"message": "Deleted"}

