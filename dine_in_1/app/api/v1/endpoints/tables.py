from fastapi import HTTPException
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.models.table import DiningTable

from app.models.order_item import OrderItem

from app.models.order import Order
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
    updated = crud_update_table(
        db, client_id=clientid, table_id=table_id, updates=updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Table not found")
    return updated


@router.delete("/{clientid}/tables/{table_id}")
def delete_table(clientid: UUID, table_id: UUID, db: Session = Depends(get_db)):
    try:
        # ✅ Delete linked order items first
        db.query(OrderItem).filter(OrderItem.order_id.in_(
            db.query(Order.id).filter(Order.table_id == table_id)
        )).delete(synchronize_session=False)
        db.commit()

        # ✅ Delete served orders
        db.query(Order).filter(Order.table_id == table_id,
                               Order.status == "served").delete(synchronize_session=False)
        db.commit()

        # ✅ Check if any remaining active orders exist
        active_orders = db.query(Order).filter(
            Order.table_id == table_id).count()
        if active_orders > 0:
            raise HTTPException(
                status_code=400, detail="Cannot delete table with remaining orders")

        # ✅ Proceed with table deletion
        table = db.query(DiningTable).filter(DiningTable.id ==
                                             table_id, DiningTable.client_id == clientid).first()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        db.delete(table)
        db.commit()

        return {"message": "Table and associated served orders deleted successfully"}

    except HTTPException as http_exc:
        # Let FastAPI handle known HTTP errors
        raise http_exc

    except Exception as e:
        print(f"❌ Unexpected error during table deletion: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/{clientid}/tables/{table_id}", response_model=TableOut)
def get_table(clientid: UUID, table_id: UUID, db: Session = Depends(get_db)):
    print(
        f"Fetching table details for Client: {clientid}, Table ID: {table_id}")

    table = db.query(DiningTable).filter(
        DiningTable.id == table_id, DiningTable.client_id == clientid
    ).first()

    if not table:
        print(f"⚠️ Table {table_id} for Client {clientid} not found!")
        raise HTTPException(status_code=404, detail="Table not found")

    print(f"✅ Found Table: {table.table_number}, Type: {table.table_type}")
    return table
