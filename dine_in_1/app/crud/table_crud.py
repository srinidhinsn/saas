from sqlalchemy.orm import Session
from uuid import UUID
from app import models, schemas
from app.models.table import DiningTable

from app.schemas.table import TableCreate, TableUpdate, TableOut


def get_tables_by_client(db: Session, client_id: UUID):
    return db.query(DiningTable).filter(DiningTable.client_id == client_id).all()


def get_table(db: Session, client_id: UUID, table_id: UUID):
    return db.query(DiningTable).filter(DiningTable.id == table_id, DiningTable.client_id == client_id).first()


def create_table(db: Session, table: TableCreate):
    db_table = DiningTable(**table.dict())
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table


def update_table(db: Session, client_id: UUID, table_id: UUID, updates: TableUpdate):
    db_table = get_table(db, client_id, table_id)
    if not db_table:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_table, key, value)
    db.commit()
    db.refresh(db_table)
    return db_table


def delete_table(db: Session, client_id: UUID, table_id: UUID):
    db_table = get_table(db, client_id, table_id)
    if not db_table:
        return None
    db.delete(db_table)
    db.commit()
    return db_table
