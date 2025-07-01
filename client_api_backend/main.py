from uuid import UUID
import uuid
from io import StringIO
from datetime import date
import csv
import os
from passlib.hash import bcrypt
import requests
from fastapi.responses import StreamingResponse, FileResponse
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from schemas import ClientUserBase
from crud import create_client_user
from copy import deepcopy
from models import ClientUser, Client
from schemas import ClientUserCreate
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
import bcrypt
import database
from fastapi.middleware.cors import CORSMiddleware
from schemas import ClientCreate, ServiceAssignment, LoginRequest, LoginResponse
from crud import create_client, create_client_user, assign_services, get_assigned_services
from scheduler import start as start_scheduler


models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()
print("🔥 BEFORE scheduler start")
start_scheduler()

print("AFTER scheduler start")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def start_background_tasks():
    print("🔁 Starting scheduler")
    start_scheduler()


@app.get("/")
def browser():
    return {"Backend": "Working"}


@app.post("/clients", response_model=schemas.ClientOut)
def api_create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    print("Received bill_paid:", client.bill_paid)

    # 🔐 Generate a unique client code
    raw_code = client.company_name or client.name or "CLNT"
    code_prefix = "".join(filter(str.isalnum, raw_code.upper()))[:4]
    unique_suffix = uuid.uuid4().hex[:4].upper()
    client_code = f"{code_prefix}-{unique_suffix}"  # e.g. DELI-5F2A

    # ✅ Hash password securely
    hashed_password = bcrypt.hashpw(client.password.encode(
        "utf-8"), bcrypt.gensalt()).decode("utf-8")

    db_client = models.Client(
        client_code=client_code,
        name=client.name,
        last_name=client.last_name,
        dob=client.dob,
        gender=client.gender,
        city=client.city,
        state=client.state,
        country=client.country,
        country_code=client.country_code,
        password=hashed_password,
        company_name=client.company_name,
        location=client.location,
        contact_number=client.contact_number,
        company_number=client.company_number,
        company_address=client.company_address,
        client_address=client.client_address,
        fssai_number=client.fssai_number,
        gst_number=client.gst_number,
        pan_number=client.pan_number,
        aadhar_number=client.aadhar_number,
        license_number=client.license_number,
        food_license_number=client.food_license_number,
        email=client.email,
        website=client.website,
        bill_paid=client.bill_paid or False
    )

    db.add(db_client)
    db.commit()
    db.refresh(db_client)

    print("✅ Client registered with code:", client_code)
    sync_payload = {
        "client_id": str(db_client.id),
        "services": [],
        "features": ["Dashboard"],
        "start_date": None,
        "end_date": None,
        "duration": ""
    }
    try:
        response = requests.post("http://localhost:8000/api/v1/client/sync-assigned-services",
                                 json=sync_payload)
        print("📬 Sync response:", response.status_code, response.text)

        response.raise_for_status()

        print("✅ Website DB synced with new client")
    except Exception as e:
        print("❌ Sync to website failed:", e)
    return db_client


@app.get("/clients", response_model=list[schemas.ClientOut])
def get_clients(db: Session = Depends(get_db)):
    return db.query(models.Client).all()


@app.get("/clients/{client_id}/users", response_model=list[schemas.ClientUser])
def get_client_users(client_id: UUID, db: Session = Depends(get_db)):
    return db.query(models.ClientUser).filter(models.ClientUser.client_id == client_id).all()


@app.get("/tickets")
def get_tickets(db: Session = Depends(get_db)):
    clients = db.query(models.Client).all()
    tickets = []

    for client in clients:
        try:
            # Get latest service entry for this client
            latest_service = db.query(models.ClientService).filter(
                models.ClientService.client_id == client.id
            ).order_by(models.ClientService.end_date.desc()).first()

            start_date = (
                latest_service.start_date.strftime("%d/%m/%y")
                if latest_service and latest_service.start_date
                else "---"
            )
            end_date = (
                latest_service.end_date.strftime("%d/%m/%y")
                if latest_service and latest_service.end_date
                else "---"
            )

            users = db.query(models.ClientUser).filter(
                models.ClientUser.client_id == client.id
            ).all()

            # If no client users exist
            if not users:
                tickets.append({
                    "ticket": f"#{str(client.id)[-5:]}",
                    "assigned": client.name or "---",
                    "priority": "---",
                    "status": "Paid" if client.bill_paid else "Unpaid",
                    "customer": "---",
                    "start": start_date,
                    "date": end_date,
                    "client_id": client.id,
                    "company": client.company_name or "---",
                    "contact": client.contact_number or "---",
                    "bill_paid": client.bill_paid
                })
            else:
                for user in users:
                    priority = "High" if user.rating and user.rating > 3 else "Low"
                    tickets.append({
                        "ticket": f"#{str(user.id)[-5:]}",
                        "assigned": client.name or "---",
                        "priority": priority,
                        "status": "Paid" if client.bill_paid else "Unpaid",
                        "customer": user.name or "---",
                        "start": start_date,
                        "date": end_date,
                        "client_id": client.id,
                        "company": client.company_name or "---",
                        "contact": client.contact_number or "---",
                        "bill_paid": client.bill_paid
                    })
        except Exception as e:
            print(f"⚠️ Error building ticket for client {client.id}: {e}")

    return tickets


#


@app.post("/clients/{client_code}/users", response_model=schemas.ClientUser)
def create_client_user(client_code: str, user: schemas.ClientUserCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.client_code == client_code).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # 🔐 Hash the password before storing
    hashed_password = (
        bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
        if user.password else None
    )

    db_user = models.ClientUser(
        client_id=client.id,
        name=user.name,
        last_name=user.last_name,
        email=user.email,
        dob=user.dob,
        gender=user.gender,
        address=user.address,
        city=user.city,
        state=user.state,
        country=user.country,
        password=hashed_password,
        customer_number=user.customer_number,
        review=user.review,
        rating=user.rating
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
# ✅ Final working user-creation endpoint


@app.post("/clients/{client_code}/users", response_model=schemas.ClientUser)
def add_user_to_existing_client(client_code: str, user: schemas.ClientUserCreate, db: Session = Depends(get_db)):
    try:
        return create_client_user(client_code, user, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


#


@app.get("/export_clients")
def export_clients(db: Session = Depends(get_db)):
    clients = db.query(models.Client).all()

    headers = [
        "name", "company_name", "location", "contact_number",
        "company_number", "company_address", "client_address",
        "fssai_number", "gst_number", "pan_number", "aadhar_number",
        "license_number", "food_license_number", "email", "website",
        "client_code", "bill_paid"
    ]

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)

    for c in clients:
        writer.writerow([
            c.name, c.company_name, c.location, c.contact_number,
            c.company_number, c.company_address, c.client_address,
            c.fssai_number, c.gst_number, c.pan_number, c.aadhar_number,
            c.license_number, c.food_license_number, c.email, c.website,
            c.client_code, c.bill_paid
        ])

    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=clients_export.csv"
    })


@app.get("/clients/by_code/{client_code}", response_model=schemas.ClientOut)
def get_client_by_code(client_code: str, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(
        models.Client.client_code == client_code).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.get("/clients/full-details")
def get_client_service_overview(db: Session = Depends(get_db)):
    clients = db.query(models.Client).all()
    result = []

    for client in clients:
        services = db.query(models.ClientService).filter(
            models.ClientService.client_id == client.id).all()
        result.append({
            "id": client.id,
            "name": client.name,
            "services": ", ".join(s.service_name for s in services),
            "startDate": services[0].start_date if services else "",
            "endDate": services[0].end_date if services else "",
            "notify": "Email"  # Replace with real field if available
        })
    return result


#
@app.post("/clients/assign-services")
def assign_client_services(payload: ServiceAssignment, db: Session = Depends(get_db)):
    # 🧹 Step 0: Remove existing ClientService entries
    db.query(models.ClientService).filter(
        models.ClientService.client_id == payload.client_id
    ).delete()
    db.commit()

    # 🌟 Step 0.5: Handle "custom" duration
    if payload.duration == "custom":
        computed_duration = (payload.end_date - payload.start_date).days
    else:
        computed_duration = int(payload.duration)

    # ✅ Step 1: Save new services with safe duration
    assign_services(
        db,
        client_id=payload.client_id,
        services=payload.services,
        start_date=payload.start_date,
        end_date=payload.end_date,
        duration=computed_duration
    )
    print("🚀 Admin is sending features to Website:", payload.features)

    # ✅ Step 2: Update client fields
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if client:
        client.services = ", ".join(payload.services)
        client.enabled_features = ", ".join(payload.features)
        client.start_date = payload.start_date
        client.end_date = payload.end_date
        client.duration = computed_duration  # use int always
        db.commit()

    # ✅ Step 3: Sync to Website Page Backend
    try:
        payload_dict = deepcopy(payload.dict())
        payload_dict["client_id"] = str(payload_dict["client_id"])
        payload_dict["start_date"] = str(payload_dict["start_date"])
        payload_dict["end_date"] = str(payload_dict["end_date"])
        payload_dict["duration"] = computed_duration  # 👈 override for sync

        response = requests.post(
            "http://localhost:8000/api/v1/client/sync-assigned-services",
            json=payload_dict
        )
        response.raise_for_status()

    except Exception as e:
        print("❌ Website sync failed:", e)

    return {"status": "success", "synced_to_website": True}


@app.get("/clients/{client_id}/assigned-services")
def read_assigned_services(client_id: UUID, db: Session = Depends(get_db)):
    services = get_assigned_services(db, client_id)
    return [{"service_name": s.service_name, "start_date": s.start_date, "end_date": s.end_date, "duration": s.duration} for s in services]


#

@app.put("/clients/{client_id}/payment-status")
def update_bill_paid(client_id: UUID, bill_paid: bool, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client.bill_paid = bill_paid
    db.commit()
    return {"message": "Payment status updated", "client_id": client_id, "bill_paid": client.bill_paid}


@app.get("/clients/{client_id}/invoice")
def generate_invoice(client_id: UUID, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(
        models.Client.id == client_id).first()
    services = db.query(models.ClientService).filter(
        models.ClientService.client_id == client_id).all()

    env = Environment(loader=FileSystemLoader("templates"))
    template = env.get_template("invoice_template.html")
    html_out = template.render(
        client=client, services=services, date=date.today())

    pdf_path = f"invoices/invoice_{client_id}.pdf"
    HTML(string=html_out).write_pdf(pdf_path)

    return FileResponse(pdf_path, media_type="application/pdf", filename=f"invoice_{client.name}.pdf")


@app.get("/download-invoice")
def download_invoice():
    input_path = "invoices/templates/invoice_static.html"
    output_path = "invoices/generated_invoice.pdf"
    HTML(input_path).write_pdf(output_path)
    return FileResponse(output_path, filename="invoice.pdf", media_type="application/pdf")


@app.get("/api/v1/client/{client_id}/assigned-services")
def get_client_services(client_id: UUID, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return {
        "services": client.services,
        "features": client.enabled_features or [],
        "start_date": client.start_date,
        "end_date": client.end_date,
        "duration": client.duration
    }


#
@app.get("/clients/{client_id}", response_model=schemas.ClientOut)
def get_client(client_id: UUID, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.put("/clients/{client_id}", response_model=schemas.ClientOut)
def update_client(client_id: UUID, updated: schemas.ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = updated.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client


#


@app.put("/clients/{client_id}", response_model=schemas.ClientOut)
def update_client_profile(client_id: UUID, updates: schemas.ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(
        models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in updates.dict(exclude_unset=True).items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client


@app.post("/login", response_model=LoginResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    print("🔐 Login attempt:", payload)

    client = db.query(Client).filter(
        Client.client_code == payload.client_code).first()
    if not client:
        raise HTTPException(status_code=404, detail="Invalid client code")

    # Check against the admin-level login
    if not bcrypt.checkpw(payload.password.encode(), client.password.encode()):
        raise HTTPException(status_code=401, detail="Invalid password")

    return {
        "client_id": str(client.id),
        "client_code": client.client_code,
        "username": client.name
    }
