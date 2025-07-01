from datetime import datetime
from sqlalchemy.orm import Session
import models
import schemas
from models import ClientService


def generate_client_id(name, company_name, location, contact_number):
    today = datetime.today().strftime("%d%m%y")
    initials = ''.join([
        (name[0] if name else ''),
        (company_name[0] if company_name else ''),
        (location[0] if location else '')
    ]).upper()
    last_digit = contact_number[-1] if contact_number else '0'
    return f"CLI-{today}{initials}{last_digit}"


def create_client(db: Session, client_data: schemas.ClientCreate):
    # Auto-generate client_code
    client_code = generate_client_id(
        client_data.name,
        client_data.company_name,
        client_data.location,
        client_data.contact_number
    )

    # ✅ Check if a client already exists with same generated code, name, and number
    existing = db.query(models.Client).filter(
        models.Client.client_code == client_code,
        models.Client.name == client_data.name,
        models.Client.contact_number == client_data.contact_number
    ).first()

    if existing:
        return existing  # Reuse the existing client, don’t insert again

    # ✅ Create and insert new client
    db_client = models.Client(
        client_code=client_code,
        name=client_data.name,
        company_name=client_data.company_name,
        location=client_data.location,
        contact_number=client_data.contact_number,
        company_number=client_data.company_number,
        company_address=client_data.company_address,
        client_address=client_data.client_address,
        fssai_number=client_data.fssai_number,
        gst_number=client_data.gst_number,
        pan_number=client_data.pan_number,
        aadhar_number=client_data.aadhar_number,
        license_number=client_data.license_number,
        food_license_number=client_data.food_license_number,
        email=client_data.email,
        website=client_data.website,
        bill_paid=False,
        bill_due_date=None
    )

    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


def generate_client_id(name, company_name, location, contact_number):
    today = datetime.today().strftime("%d%m%y")
    initials = ''.join([
        (name[0] if name else ''),
        (company_name[0] if company_name else ''),
        (location[0] if location else '')
    ]).upper()
    last_digit = contact_number[-1] if contact_number else '0'
    return f"CLI-{today}{initials}{last_digit}"


def create_client(db: Session, client_data: schemas.ClientCreate):
    # Auto-generate client_code
    client_code = generate_client_id(
        client_data.name,
        client_data.company_name,
        client_data.location,
        client_data.contact_number
    )

    # ✅ Check if a client already exists with same generated code, name, and number
    existing = db.query(models.Client).filter(
        models.Client.client_code == client_code,
        models.Client.name == client_data.name,
        models.Client.contact_number == client_data.contact_number
    ).first()

    if existing:
        return existing

    # ✅ Create and insert new client
    db_client = models.Client(
        client_code=client_code,
        name=client_data.name,
        company_name=client_data.company_name,
        location=client_data.location,
        contact_number=client_data.contact_number,
        company_number=client_data.company_number,
        company_address=client_data.company_address,
        client_address=client_data.client_address,
        fssai_number=client_data.fssai_number,
        gst_number=client_data.gst_number,
        pan_number=client_data.pan_number,
        aadhar_number=client_data.aadhar_number,
        license_number=client_data.license_number,
        food_license_number=client_data.food_license_number,
        email=client_data.email,
        website=client_data.website,
        bill_paid=client_data.bill_paid,
        bill_due_date=None
    )

    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


def create_client_user(db: Session, client_code: str, user_data: schemas.ClientUserBase):
    client = db.query(models.Client).filter(
        models.Client.client_code == client_code).first()

    if not client:
        raise Exception("Client not found")

    new_user = models.ClientUser(
        client_id=client.id,
        name=user_data.name,
        customer_number=user_data.customer_number,
        review=user_data.review,
        address=user_data.address,
        email=user_data.email,
        rating=user_data.rating
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


#


def assign_services(db: Session, client_id: int, services: list, start_date, end_date, duration: int):
    db.query(ClientService).filter(
        ClientService.client_id == client_id).delete()
    for service in services:
        db_service = ClientService(
            client_id=client_id,
            service_name=service,
            start_date=start_date,
            end_date=end_date,
            duration=duration
        )
        db.add(db_service)
    db.commit()


def get_assigned_services(db: Session, client_id: int):
    return db.query(ClientService).filter(ClientService.client_id == client_id).all()
