from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date
from pydantic import BaseModel
from app.models.client import Client

router = APIRouter()


class ServiceAssignment(BaseModel):
    client_id: UUID
    services: list[str]
    features: list[str]
    start_date: date
    end_date: date
    duration: str


@router.post("/sync-assigned-services")
def sync_client(payload: ServiceAssignment, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == payload.client_id).first()

    services = ", ".join(payload.services) if payload.services else ""
    features = ", ".join(payload.features) if payload.features else ""

    if not client:
        client = Client(
            id=payload.client_id,
            name="Synced Client",
            services=services,
            enabled_features=features,
            start_date=payload.start_date,
            end_date=payload.end_date,
            duration=payload.duration,
        )
        db.add(client)
    else:
        client.services = services
        client.enabled_features = features
        client.start_date = payload.start_date
        client.end_date = payload.end_date
        client.duration = payload.duration

    db.commit()
    return {"status": "Client synced to Website backend"}

# ✅ Corrected route definition


@router.get("/{client_id}/assigned-services")
def get_assigned_services(client_id: UUID, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return {
        "services": client.services.split(",") if client.services else [],
        "features": client.enabled_features.split(",") if client.enabled_features else [],
        "start_date": client.start_date,
        "end_date": client.end_date,
        "duration": client.duration
    }
