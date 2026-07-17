from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.user_model import UserModel, PersonModel, ResetpasswordRequest
from models.response_model import ResponseModel
from entity.user_entity import User, Person,PageDefinition
from entity.client_entity import Client, Address
from models.client_model import ClientModel , AddressModel
from entity.inventory_entity import CategoryEntity
from utils.auth import hash_password, SECRET_KEY, ALGORITHM,get_page_definition, get_screen_id
from jose import jwt,JWTError
from sqlalchemy import func , and_
from utils.auth import (verify_password,create_access_token,create_refresh_token)
import os, uuid, random
from utils.send_email_otp import otpEmailService, otp_store
from utils.create_notification import get_template_body, render_template
from zoneinfo import ZoneInfo
from datetime import datetime, timedelta
from dotenv import load_dotenv
import logging
logger = logging.getLogger(__name__)

load_dotenv()
TIMEZONE = os.getenv("TIMEZONE", "UTC") 

async def create_user_and_person(client_id: str, userReq: UserModel, db: Session, token_realm: str = None):
    if not userReq.username or not userReq.password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    existing_user = db.query(User).filter(User.username == userReq.username, User.client_id == client_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists for this client.")

    roles = userReq.roles or []
    grants = userReq.grants or []
    if token_realm and token_realm not in grants:
        grants.append(token_realm)

    hashed_pw = hash_password(userReq.password)

    person_model = PersonModel(
        first_name=userReq.first_name,
        last_name=userReq.last_name,
        dob=userReq.dob,
        email=userReq.email,
        phone=userReq.phone
    )

    try:
        person = Person(**person_model.dict(exclude_unset=True))
        db.add(person)
        db.flush()  

        user = User(id=person.id,username=userReq.username,hashed_password=hashed_pw,client_id=client_id,
            roles=roles,grants=grants)
        db.add(user)
        db.commit()
        db.refresh(user)

        return ResponseModel(screen_id="user_created",
                             data={"message": "User registered successfully", "user_id": str(user.id)})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")

def decoding_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        print("Invalid token:", e)
        return {}

def getting_screen_id(token: str, db: Session, module: str = "users") -> str:
    payload = decoding_token(token)
    if not payload:
        return None

    roles = payload.get("roles", [])
    client_id = payload.get("client_id")
    operation = module

    page_definitions = get_page_definition(roles, module, client_id, db)
    screen_id = get_screen_id(page_definitions, operation)
    return screen_id

def get_user_role_permissions(db, client_id: str, role: str):
    rows = (db.query(PageDefinition)
        .filter(PageDefinition.client_id == client_id,func.lower(PageDefinition.role) == role.lower()).all())
    perms: dict[str, set] = {}

    for r in rows:
        if r.load_type != "include":
            continue
        perms.setdefault(r.module, set()).update(r.operations or [])

    for r in rows:
        if r.load_type != "exclude":
            continue
        if r.module not in perms:
            continue
        perms[r.module] -= set(r.operations or [])
    return perms

def get_user_perms(context, db, client_id):
    roles = [r.lower().strip() for r in (context.roles or [])]
    if "super_admin" in roles:
        return {"__super_admin__": {"ALL"}}
    perms = {}    
    for role in roles:
        rows = (db.query(PageDefinition).filter(
                PageDefinition.client_id == client_id,func.lower(PageDefinition.role) == role).all())

        for r in rows:
            if r.load_type == "include":
                perms.setdefault(r.module, set()).update(r.operations or [])
            elif r.load_type == "exclude":
                perms.setdefault(r.module, set()).difference_update(
                    r.operations or [])
    return perms

def has_user_permission(role_perms, module: str, operation: str | None = None):
    if "ALL" in role_perms.get("__super_admin__", set()):
        return True
    ops = role_perms.get(module, set())
    if "ALL" in ops:
        return True
    
    if operation:
        return any(
            op == operation or op.startswith(f"{operation}/")
            for op in ops
        )
    return bool(ops)

# Login Service

def login_user_service(client_id: str,username: str,password: str,db: Session):
    user = db.query(User).filter(and_(User.username == username,User.client_id == client_id)).first()

    if not user or not verify_password(password,user.hashed_password):
        raise HTTPException(status_code=400,detail="Invalid credentials")

    user_model = User.copyToModel(user)

    client = db.query(Client).filter(Client.id == client_id).first()
    client_model = Client.copyToModel(client)

    roles = [str(r).strip()for r in (user_model.roles or [])]
    
    page_defs = db.query(PageDefinition).filter(
        PageDefinition.role.in_(roles),
        PageDefinition.client_id == client_id
    ).all()
    
    allowed_screen_ids = list({pd.screen_id for pd in page_defs})

    payload = {
        "user_id": str(user_model.id),
        "roles": roles,
        "client_id": user_model.client_id,
        "grants": user_model.grants,
        "realm": client_model.realm,
        "subscription": client_model.subscription or [],
        "allowed_screen_ids": allowed_screen_ids
    }

    access_token = create_access_token(payload)

    refresh_token = create_refresh_token({    "user_id": str(user_model.id),
    "roles": roles,
    "client_id": user_model.client_id,
    "grants": user_model.grants,
    "realm": client_model.realm,
    "subscription": client_model.subscription or [],
    "allowed_screen_ids": allowed_screen_ids})

    screen_id = getting_screen_id(access_token,db)

    return {"screen_id": screen_id,"access_token": access_token,"refresh_token": refresh_token,"token_type": "bearer", "client": client_model}


# Delete User
def delete_user_service(client_id: str,user_id: str,context,db: Session):
    perms = get_user_perms(context,db,client_id)

    if not has_user_permission(perms,"users","delete"):
        raise HTTPException(status_code=403,detail="User delete not allowed")

    try:
        user_uuid = uuid.UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=400,detail="Invalid user_id")

    user = (db.query(User).filter(User.id == user_uuid,User.client_id == client_id).first())

    if not user:
        raise HTTPException(status_code=404,detail="User not found")

    if str(context.user_id) == str(user_uuid):
        raise HTTPException(status_code=400,detail="You cannot delete yourself")

    person = (db.query(Person).filter(Person.id == user_uuid).first())
    if person:
        db.delete(person)
    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully","user_id": str(user_uuid)}

# Forgot Password
async def forgot_password_service(client_id: str,req_data: ResetpasswordRequest,db: Session):
    if not req_data.username:
        raise HTTPException(status_code=400,detail="Username is required")
    user = db.query(User).filter(and_(User.username == req_data.username,User.client_id == client_id)).first()
    if not user:
        raise HTTPException(status_code=404,detail="User not found")

    user_model = User.copyToModel(user)
    person = db.query(Person).filter(Person.id == user_model.id).first()

    if not person or not person.email:
        raise HTTPException(status_code=404,detail="Email not found")
    # Send OTP
    if not req_data.otp and not req_data.new_password:
        otp = str(random.randint(100000, 999999))

        otp_store[user_model.id] = {"otp": otp,"expires": datetime.now(ZoneInfo(TIMEZONE)) + timedelta(minutes=10)}

        metadata = {"username": user_model.username,"clientId": client_id,"otp": otp}

        template_body = (get_template_body(db,client_id,"forgot_password","template") or "Dear {username}, your OTP is {otp}")

        notification_text = render_template(template_body,metadata)

        if not otpEmailService(person.email,notification_text):
            raise HTTPException(status_code=500,detail="Failed to send OTP")

        return ResponseModel(data={"message": "OTP sent successfully"})

    # Verify OTP & Reset Password
    if req_data.otp and req_data.new_password:
        otp_data = otp_store.get(user_model.id)

        if not otp_data:
            raise HTTPException(400,"OTP not requested")

        if otp_data["otp"] != req_data.otp:
            raise HTTPException(400,"Invalid OTP")

        if datetime.now(ZoneInfo(TIMEZONE)) > otp_data["expires"]:
            raise HTTPException(400,"OTP expired")

        if (req_data.new_password != req_data.confirm_password):
            raise HTTPException(400,"Passwords do not match")

        user.hashed_password = hash_password(req_data.new_password)
        db.commit()
        otp_store.pop(user_model.id,None)

        metadata = {"username": user_model.username,"clientId": client_id}

        template_body = (get_template_body(db,client_id,"reset_password_success","template") or "Password reset successful")
        otpEmailService(person.email,render_template(template_body,metadata))

        return ResponseModel(data={"message":"Password reset successfully"})

    raise HTTPException(400,"Invalid request data")

# Reset Password
async def reset_password_service(client_id: str,req_data: ResetpasswordRequest,context,db: Session):
    user = db.query(User).filter(and_(User.username == req_data.username,User.client_id == client_id)).first()

    if not user:
        raise HTTPException(status_code=404,detail="User not found")

    user_model = User.copyToModel(user)

    # OTP request flow
    if not req_data.otp and not req_data.old_password:
        person = db.query(Person).filter(Person.id == user_model.id).first()
        if not person or not person.email:
            raise HTTPException(status_code=404,detail="User email not found")

        otp = str(random.randint(100000, 999999))
        otp_store[user_model.id] = {"otp": otp,"expires": datetime.now(ZoneInfo(TIMEZONE)) + timedelta(minutes=10)}

        metadata = {"username": user_model.username,"clientId": client_id,"otp": otp}
        template_body = (
            get_template_body(
                db,
                client_id,
                "reset_password",
                "template"
            )
            or
            "Dear {username}, your OTP is {otp}"
        )

        otpEmailService(person.email,render_template(template_body,metadata))

        return ResponseModel(screen_id=context.screen_id,data={"message": "OTP sent successfully"})

    # OTP validation flow
    if req_data.otp:
        otp_data = otp_store.get(user_model.id)

        if not otp_data:
            raise HTTPException(status_code=400,detail="OTP not requested")

        if otp_data["otp"] != req_data.otp:
            raise HTTPException(status_code=400,detail="Invalid OTP")

        if datetime.now(ZoneInfo(TIMEZONE)) > otp_data["expires"]:
            raise HTTPException(status_code=400,detail="OTP expired")

    # Old password validation flow
    elif req_data.old_password:

        if not verify_password(req_data.old_password,user.hashed_password):
            raise HTTPException(status_code=400,detail="Invalid old password")

    if req_data.new_password != req_data.confirm_password:
        raise HTTPException(status_code=400,detail="Passwords do not match")

    user.hashed_password = hash_password(req_data.new_password)
    db.commit()

    otp_store.pop(
        user_model.id,
        None
    )

    # Success email for OTP flow
    if req_data.otp:

        person = db.query(Person).filter(Person.id == user_model.id).first()

        if person and person.email:

            metadata = {"username": user_model.username,"clientId": client_id}
            template_body = (
                get_template_body(
                    db,
                    client_id,
                    "reset_password_success",
                    "template"
                )
                or
                "Password reset successful"
            )

            otpEmailService(person.email,
                render_template(template_body,metadata))

    return ResponseModel(screen_id=context.screen_id,data={"message": "Password reset successfully"})

SUPER_USER_REALM = "super_user"
DEFAULT_CLIENT_CATEGORIES = [
    {
        "id": "dietery",
        "name": "Dietery",
        "description": "Dietry type",
        "sub_categories": ["dietery_01"],
        "slug": "_Dietery",
    },
    {
        "id": "roles",
        "name": "Roles",
        "description": "Roles definition",
        "sub_categories": ["admin"],
        "slug": "_Roles",
    },
    {
        "id": "admin",
        "name": "Admin",
        "description": "admin",
        "sub_categories": None,
        "slug": "_Roles_Admin",
    },
    {
        "id": "section",
        "name": "Section",
        "description": "Section Selection",
        "sub_categories": ["Base"],
        "slug": "_Section",
    },
    {
        "id": "available_timings",
        "name": "Availability Time",
        "description": "Food Availability Timings",
        "sub_categories": ["general(08:00-20:00)"],
        "slug": "_AvailabilityTime",
    },
    {
        "id": "zone",
        "name": "Zones",
        "description": "Zone Selection",
        "sub_categories": ["General"],
        "slug": "_Zones",
    },
]

def seed_default_categories(client_id: str, created_by: str, db: Session, admin_role: str = "admin"):
    now = datetime.now(ZoneInfo(TIMEZONE))
    categories = [
        {
            "id": "dietery",
            "name": "Dietery",
            "description": "Dietry type",
            "sub_categories": ["dietery_01"],
            "slug": "_Dietery",
        },
        {
            "id": "roles",
            "name": "Roles",
            "description": "Roles definition",
            "sub_categories": [admin_role],
            "slug": "_Roles",
        },
        {
            "id": admin_role,
            "name": admin_role.replace("_", " ").title(),
            "description": admin_role,
            "sub_categories": None,
            "slug": f"_Roles_{admin_role.title()}",
        },
        {
            "id": "section",
            "name": "Section",
            "description": "Section Selection",
            "sub_categories": ["Base"],
            "slug": "_Section",
        },
        {
            "id": "available_timings",
            "name": "Availability Time",
            "description": "Food Availability Timings",
            "sub_categories": ["morning(08:00-20:00)"],
            "slug": "_AvailabilityTime",
        },
        {
            "id": "zone",
            "name": "Zones",
            "description": "Zone Selection",
            "sub_categories": ["General"],
            "slug": "_Zones",
        },
    ]

    for cat in categories:
        db.add(CategoryEntity(
            id=cat["id"],
            client_id=client_id,
            name=cat["name"],
            description=cat["description"],
            sub_categories=cat["sub_categories"],
            slug=cat["slug"],
            created_by=created_by,
            updated_by=created_by,
            created_at=now,
            updated_at=now,
        ))
async def register_client_service(reg_type: str,user: UserModel,address: AddressModel | None,client: ClientModel | None,db: Session):
    if reg_type not in ("merchant", "user"):
        raise HTTPException(status_code=400, detail="reg_type must be 'merchant' or 'user'")

    if not user.username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    if not client or not client.id or not client.name:
        raise HTTPException(status_code=400,detail="client.id and client.name  are required for registration",)
    if reg_type == "merchant" and not client.realm:
        raise HTTPException(status_code=400, detail="client.realm is required for merchant registration")

    target_client_id = client.id
    
    if reg_type == "merchant":
        roles = user.roles or ["admin"]
        grants = user.grants or ["admin"]
        realm = client.realm
    else:
        roles =  [SUPER_USER_REALM]
        grants = [SUPER_USER_REALM]
        realm = SUPER_USER_REALM
    if db.query(Client).filter(Client.id == target_client_id).first():
        raise HTTPException(status_code=400, detail="Client ID already exists")

    existing_user = (db.query(User).filter(User.username == user.username, User.client_id == target_client_id).first())
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists for this client.")

    try:
        client_entity = Client(
            id=target_client_id,
            name=client.name,
            realm=realm,
            email=user.email,
            phone=user.phone,
        )
        db.add(client_entity)

        person = Person(
            first_name=user.first_name,
            last_name=user.last_name,
            dob=user.dob,
            email=user.email,
            phone=user.phone,
        )
        db.add(person)
        db.flush()  

        if address is not None:
           full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
           address_entity = Address(
            address_line1=address.address_line1,
            address_line2=address.address_line2 or "",
            name=full_name,
            city=address.city,
            state=address.state or "",
            country=address.country,
            pincode=address.pincode,
            contact_name=address.contact_name or full_name,
            contact_number=address.contact_number or user.phone,
        )
           db.add(address_entity)
           db.flush()

           person.saved_address_ids = [address_entity.id]
           client_entity.saved_address_ids = [str(address_entity.id)]

        user_entity = User(
            id=person.id,
            username=user.username,
            hashed_password=hash_password(user.password),
            client_id=target_client_id,
            roles=roles,
            grants=grants,
        )
        db.add(user_entity)

        admin_role = SUPER_USER_REALM if reg_type == "user" else "admin"
        seed_default_categories(client_id=target_client_id, created_by=str(person.id), db=db,admin_role=admin_role,)

        db.commit()
        db.refresh(user_entity)
        db.refresh(client_entity)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("register_client_service failed for reg_type=%s client_id=%s", reg_type, target_client_id)
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    payload = {
        "user_id": str(user_entity.id),
        "roles": roles,
        "client_id": target_client_id,
        "grants": grants,
        "realm": realm,
        "subscription": [],
        "allowed_screen_ids": [],
    }
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    screen_id = getting_screen_id(access_token, db)

    return {"screen_id": screen_id,"client_id": target_client_id,"user_id": str(user_entity.id),"access_token": access_token,"refresh_token": refresh_token,"token_type": "bearer",}
