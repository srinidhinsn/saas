from fastapi import Depends, HTTPException, APIRouter, Request
from sqlalchemy.orm import Session
from database.postgres import get_db
from entity.user_entity import User, Person, PageDefinition
from entity.client_entity import Client, Address
from utils.auth import hash_password, verify_password, create_access_token, verify_token, SECRET_KEY, ALGORITHM
from models.saas_context import SaasContext
from models.user_model import UserModel, ResetpasswordRequest, LoginRequest, PersonModel
from models.response_model import ResponseModel
from models.user_model import DelegatedAccessRequest
from sqlalchemy import and_, cast
from utils.send_email_otp import otpEmailService, otp_store
from utils.create_notification import get_template_body, render_template
from entity.inventory_entity import CategoryEntity
from entity.order_entity import DineinOrder
import random
from datetime import datetime, timedelta
from ..services.add_users import create_user_and_person, getting_screen_id, get_user_perms, has_user_permission
from jose import jwt
import uuid
from sqlalchemy import func
from models.client_model import AddressModel 
router = APIRouter()
# ================== ADD USER ==================
@router.post("/add")
async def add_user(client_id: str, userReq: UserModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    perms = get_user_perms(context, db, client_id)

    if not has_user_permission(perms, "users", "add"):
        raise HTTPException(status_code=403, detail="User add not allowed")

    return await create_user_and_person(client_id=client_id, userReq=userReq, db=db,
                                        token_realm=context.grants[0] if context.grants else None)

# ================== REGISTER USER ==================
@router.post("/register")
async def register_user(client_id: str, userReq: UserModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    perms = get_user_perms(context, db, client_id)

    if not has_user_permission(perms, "users", "register"):
        raise HTTPException(403, "User registration not allowed")

    token_realm = context.grants[0] if context.grants else None
    return await create_user_and_person(client_id=client_id, userReq=userReq, db=db, token_realm=token_realm)

@router.post("/login")
async def login_user(client_id: str, userReq: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        and_(User.username == userReq.username, User.client_id == client_id)
    ).first()

    if not user or not verify_password(userReq.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    userModel = User.copyToModel(user)

    client = db.query(Client).filter(Client.id == client_id).first()
    client_model = Client.copyToModel(client)

    # newly added to handle roles in case insenesitive manner
    roles = [str(r).strip() for r in (userModel.roles or [])]

    token = create_access_token({
        "user_id": str(userModel.id),
        "roles": roles,
        "client_id": userModel.client_id,
        "grants": userModel.grants,
        "realm": client_model.realm
    })
    screen_id = getting_screen_id(token, db)

    print("my screen_id : ", screen_id)

    return ResponseModel(screen_id=screen_id, data={"access_token": token, "token_type": "bearer"})

# ================== DELETE USER ==================
@router.delete("/delete")
async def delete_user(
    client_id: str,
    user_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # Permission checking
    perms = get_user_perms(context, db, client_id)
    if not has_user_permission(perms, "users", "delete"):
        raise HTTPException(status_code=403, detail="User delete not allowed")

    # Validating the UUID
    try:
        user_uuid = uuid.UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    #Fetching user
    user = db.query(User).filter(
        User.id == user_uuid,
        User.client_id == client_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # preventing self delete
    if str(context.user_id) == str(user_uuid):
        raise HTTPException(status_code=400, detail="You cannot delete yourself")

    #Delete related person
    person = db.query(Person).filter(Person.id == user_uuid).first()
    if person:
        db.delete(person)

    # Delete user
    db.delete(user)
    db.commit()

    return ResponseModel(
        screen_id=context.screen_id,
        data={
            "message": "User deleted successfully",
            "user_id": str(user_uuid)
        }
    )

@router.get("/test")
async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context - ", context)
    print("test screen_id - ", context.screen_id)
    response = ResponseModel(screen_id="default_test", data={
                             "message": "Test Authentication Service Running in user routes"})
    return response

@router.get("/test2")
async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context2 - ", context)
    response = ResponseModel(screen_id="default_test", data={
                             "message": "Test2 Authentication Service Running in user routes"})
    return response

@router.get("/test3", include_in_schema=False)
async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context3 - ", context)
    response = ResponseModel(screen_id="default_test", data={
                             "message": "Test3 Authentication Service Running in user routes"})
    return response

# ================== FORGOT PASSWORD ==================
@router.post("/forgot-password")
async def forgot_password(client_id: str, req_data: ResetpasswordRequest, db: Session = Depends(get_db)):
    if not req_data.username:
        raise HTTPException(status_code=400, detail="Username is required")

    user = db.query(User).filter(
        and_(User.username == req_data.username, User.client_id == client_id)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    userModel = User.copyToModel(user)
    person = db.query(Person).filter(Person.id == userModel.id).first()
    if not person or not person.email:
        raise HTTPException(status_code=404, detail="Email not found")

    # If OTP not provided, generate and send OTP
    if not req_data.otp and not req_data.new_password:
        otp = str(random.randint(100000, 999999))
        otp_store[userModel.id] = {
            "otp": otp, "expires": datetime.utcnow() + timedelta(minutes=10)}

        metadata = {"username": userModel.username,
                    "clientId": client_id, "otp": otp}
        template_body = get_template_body(db, client_id, "forgot_password", "template") \
            or "Dear {username}, your OTP for resetting password in {clientId} is {otp}."

        notification_text = render_template(template_body, metadata)
        if not otpEmailService(person.email, notification_text):
            raise HTTPException(status_code=500, detail="Failed to send OTP")

        return ResponseModel(data={"message": "OTP sent successfully"})

    # If OTP and new_password provided, verify OTP and reset password
    if req_data.otp and req_data.new_password:
        otp_data = otp_store.get(userModel.id)
        if not otp_data:
            raise HTTPException(status_code=400, detail="OTP not requested")
        if otp_data["otp"] != req_data.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        if datetime.utcnow() > otp_data["expires"]:
            raise HTTPException(status_code=400, detail="OTP expired")
        if req_data.new_password != req_data.confirm_password:
            raise HTTPException(
                status_code=400, detail="Passwords do not match")

        user.hashed_password = hash_password(req_data.new_password)
        db.commit()
        otp_store.pop(userModel.id, None)

        metadata = {"username": userModel.username, "clientId": client_id}
        template_body = get_template_body(db, client_id, "reset_password_success", "template") \
            or "Dear {username}, your password for {clientId} has been reset successfully."
        otpEmailService(person.email, render_template(template_body, metadata))

        return ResponseModel(screen_id="default_user", data={"message": "Password reset successfully"})

    raise HTTPException(status_code=400, detail="Invalid request data")

# ================== RESET PASSWORD ==================
@router.post("/reset-password")
async def reset_password(client_id: str, req_data: ResetpasswordRequest, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(
        and_(User.username == req_data.username, User.client_id == client_id)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    userModel = User.copyToModel(user)

    # OTP request flow
    if not req_data.otp and not req_data.old_password:
        person = db.query(Person).filter(Person.id == userModel.id).first()
        if not person or not person.email:
            raise HTTPException(status_code=404, detail="User email not found")

        otp = str(random.randint(100000, 999999))
        otp_store[userModel.id] = {
            "otp": otp, "expires": datetime.utcnow() + timedelta(minutes=10)}

        metadata = {"username": userModel.username,
                    "clientId": client_id, "otp": otp}
        template_body = get_template_body(db, client_id, "reset_password", "template") \
            or "Dear {username}, your reset-password OTP for {clientId} is {otp}"

        otpEmailService(person.email, render_template(template_body, metadata))

        return ResponseModel(screen_id=context.screen_id, data={"message": "OTP sent successfully"})

    # OTP verification
    if req_data.otp:
        otp_data = otp_store.get(userModel.id)
        if not otp_data:
            raise HTTPException(status_code=400, detail="OTP not requested")
        if otp_data["otp"] != req_data.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        if datetime.utcnow() > otp_data["expires"]:
            raise HTTPException(status_code=400, detail="OTP expired")

    # Old password verification
    elif req_data.old_password:
        if not verify_password(req_data.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid old password")

    if req_data.new_password != req_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    user.hashed_password = hash_password(req_data.new_password)
    db.commit()
    otp_store.pop(userModel.id, None)

    # Success notification if OTP flow
    if req_data.otp:
        person = db.query(Person).filter(Person.id == userModel.id).first()
        if person and person.email:
            metadata = {"username": userModel.username, "clientId": client_id}
            template_body = get_template_body(db, client_id, "reset_password_success", "template") \
                or "Dear {username}, your password for {clientId} has been reset successfully."
            otpEmailService(person.email, render_template(
                template_body, metadata))

    return ResponseModel(screen_id=context.screen_id, data={"message": "Password reset successfully"})

# ================== PERSON DETAILS ==================
@router.post("/person-details")
async def update_person_details(request: Request, client_id: str, person_req: PersonModel,
                                context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    body = await request.json()

    # If admin edit, user_id comes from body
    target_user_id = body.get("user_id") or context.user_id
    roles = body.get("roles")

    try:
        user_uuid = uuid.UUID(str(target_user_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    # Fetch user using entity and convert to model
    user_entity = db.query(User).filter(
        User.id == user_uuid,
        User.client_id == client_id
    ).first()

    if not user_entity:
        raise HTTPException(status_code=404, detail="User not found")

    user_model = User.copyToModel(user_entity)

    # Fetch person using entity and convert to model
    person_entity = db.query(Person).filter(Person.id == user_uuid).first()

    if person_entity:
        # Update existing person
        person_model = Person.copyToModel(person_entity)
        person_entity.first_name = person_req.first_name
        person_entity.last_name = person_req.last_name
        person_entity.dob = person_req.dob
        person_entity.email = person_req.email
        person_entity.phone = person_req.phone
        action = "updated"
    else:
        # Create new person
        person_entity = Person(
            id=user_model.id,
            first_name=person_req.first_name,
            last_name=person_req.last_name,
            dob=person_req.dob,
            email=person_req.email,
            phone=person_req.phone
        )
        db.add(person_entity)
        action = "added"

    # Role update
    if roles is not None:
        user_entity.roles = [str(r).strip() for r in roles]

    db.commit()
    db.refresh(user_entity)

    # Convert updated entity to model for response
    updated_user_model = User.copyToModel(user_entity)

    return ResponseModel(
        screen_id=context.screen_id,
        data={
            "message": f"User details {action} successfully",
            "user_id": str(updated_user_model.id)
        }
    )

@router.get("/person-details")
async def get_person_details(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    try:
        user_uuid = uuid.UUID(str(context.user_id))
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid user_id format in token")

    person = db.query(Person).filter(Person.id == user_uuid).first()

    if not person:
        person = Person(id=user_uuid, email=None, phone=None,
                        first_name=None, last_name=None, dob=None)
        db.add(person)
        db.commit()
        db.refresh(person)

    return ResponseModel(screen_id=context.screen_id, data={"person": PersonModel.from_orm(person)})

@router.get("/notifications")
def get_notifications(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    return ResponseModel(
        screen_id=context.screen_id,
        data={"notifications": []}
    )

@router.get("/persons")
async def get_all_persons(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    results = (
        db.query(Person, User.username, User.roles)
        .join(User, Person.id == User.id)
        .filter(User.client_id == client_id)
        .all()
    )

    persons = []
    for person, username, roles in results:
        if isinstance(roles, str):
            roles = [roles.strip("{}")]
        elif roles is None:
            roles = []

        persons.append({
            **Person.copyToModel(person).dict(),
            "username": username,
            "role": (roles[0] if roles else "")
        })

    return ResponseModel(
        screen_id=context.screen_id,
        data={"persons": persons}
    )

@router.post("/delegate-access")
async def delegate_access(
    client_id: str,
    req: DelegatedAccessRequest,
    db: Session = Depends(get_db)
):
    # 1️⃣ Validate admin credentials
    admin = db.query(User).filter(User.username == req.admin_username).first()
    if not admin:
        raise HTTPException(
            status_code=401, detail="Invalid admin credentials")
    if not verify_password(req.admin_password, admin.hashed_password):
        raise HTTPException(
            status_code=401, detail="Invalid admin credentials")

    # 2️⃣ Validate requester exists
    requester = db.query(User).filter(User.id == req.requester_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    # 3️⃣ Combine original grants with delegated page
    original_grants = requester.grants or []
    delegated_grants = list(set(original_grants + [req.page]))
    print("the deegated grants", delegated_grants)

    client = db.query(Client).filter(Client.id == client_id).first()
    client_model = Client.copyToModel(client)

    # 4️⃣ Create delegated token
    expire = datetime.utcnow() + timedelta(minutes=1)
    payload = {
        "sub": str(requester.id),
        "roles": admin.roles,
        "client_id": requester.client_id,
        "delegated": True,
        "granted_by": str(admin.id),
        "grants": delegated_grants,
        "exp": expire,
        "realm": client_model.realm
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {"delegated_token": token, "expires_at": expire}

@router.get("/users")
async def get_users_by_client(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.client_id == client_id).all()

    if not users:
        raise HTTPException(
            status_code=404, detail="No users found for this client")

    user_models = User.copyToModels(users)
    return ResponseModel(screen_id=context.screen_id, data={"users": user_models})

@router.get("/screens")
async def get_screens_by_role(
    client_id: str,
    role: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    try:
        # ✅ Fetch screen_id, module, load_type, and operations for the given client and role
        screens = (
            db.query(
                PageDefinition.screen_id,
                PageDefinition.module,
                PageDefinition.load_type,
                PageDefinition.operations
            )
            .filter(PageDefinition.client_id == client_id, PageDefinition.role == role)
            .all()
        )

        # ✅ Convert SQLAlchemy result objects into dicts
        screen_data = [
            {
                "screen_id": s.screen_id,
                "module": s.module,
                "load_type": s.load_type,
                "operations": s.operations,
            }
            for s in screens
        ]

        # ✅ Wrap inside "data" so frontend `.data.data.screen_ids` still works
        return ResponseModel(
            screen_id=context.screen_id,
            data={"screens": screen_data}
        )

    except Exception as e:
        return ResponseModel(
            screen_id=context.screen_id,
            status="error",
            message=f"Failed to fetch screens: {str(e)}"
        )

@router.post("/screens/configure")
async def save_role_screens(
    client_id: str,
    role: str,
    payload: dict,
    db: Session = Depends(get_db),
    context: SaasContext = Depends(verify_token)
):
    try:
        screens = payload.get("accessible", [])

        if not isinstance(screens, list):
            raise ValueError(
                "Invalid payload format. Expected a list of screen objects.")

        # Delete old role-screen mappings
        db.query(PageDefinition).filter(
            PageDefinition.client_id == client_id,
            PageDefinition.role == role
        ).delete()

        # Insert new mappings with all columns
        for s in screens:
            db.add(PageDefinition(
                client_id=client_id,
                role=role,
                screen_id=s.get("screen_id"),
                module=s.get("module"),
                load_type=s.get("load_type"),
                operations=s.get("operations")
            ))

        db.commit()

        return ResponseModel(
            screen_id=context.screen_id,
            message=f"Updated screen configuration for {role}",
            data={"accessible": screens}
        )

    except Exception as e:
        db.rollback()
        return ResponseModel(
            screen_id=context.screen_id,
            status="error",
            message=f"Failed to save config: {str(e)}"
        )

# ================================= Client Table Service ==================================== #
@router.get("/realm")
async def get_clients_by_realm(client_id: str, realm: str = "", context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    query = db.query(Client)
    if realm:
        query = query.filter(Client.realm == realm)
    clients = query.all()
    client_models = [Client.copyToModel(c) for c in clients]

    return ResponseModel(screen_id=context.screen_id, data={"clients": client_models})

@router.get("/realm/ordersummary")
async def get_order_summary_by_realm(realm: str = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    query = db.query(DineinOrder).join(
        Client, DineinOrder.client_id == Client.id)
    if realm:
        query = query.filter(Client.realm == realm)

    total_orders = query.count()
    pending_orders = query.filter(DineinOrder.status == "pending").count()

    return ResponseModel(screen_id=context.screen_id,
                         data={"total_orders": total_orders, "pending_orders": pending_orders})

@router.get("/realms")
async def get_realms(realm: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    category = db.query(CategoryEntity).filter(
        CategoryEntity.id == realm).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail=f"Category with id '{realm}' not found"
        )

    return ResponseModel(screen_id=context.screen_id,
                         data={"realms": category.sub_categories or []})

# ========================================= Role Configurations ================================================ #
@router.get("/permissions/catalog")
def get_permissions_catalog(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    categories = (db.query(CategoryEntity).filter(
        CategoryEntity.client_id=="saas").all())
    return ResponseModel(screen_id=context.screen_id,
                         data={"modules": [{"module": c.id, "label": c.name, "operations": c.sub_categories or []}for c in categories]})

@router.get("/roles/{role}/config")
def get_role_config(client_id: str, role: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    rows = (db.query(PageDefinition).filter(PageDefinition.client_id == client_id,
                                            func.lower(PageDefinition.role) == role.lower()).all())

    config = {}
    for r in rows:
        config.setdefault(r.module, []).extend(r.operations or [])

    return ResponseModel(screen_id=context.screen_id, data={"config": config})


@router.post("/roles/{role}/config")
def save_role_config(client_id: str, role: str, payload: dict, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):

    role = role.strip()

    db.query(PageDefinition).filter(
        PageDefinition.client_id == client_id,
        PageDefinition.role == role
    ).delete()

    modules = payload.get("modules", {})

    for module, ops in modules.items():
        if not ops:
            continue

        db.add(PageDefinition(client_id=client_id, role=role, module=module,
               screen_id=f"default_{module}", load_type="include", operations=ops))

    db.commit()
    return ResponseModel(screen_id=context.screen_id, message="Role configuration saved")


@router.post("/address")
async def save_address(client_id: str,add: AddressModel,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    try:
        user_uuid = uuid.UUID(str(context.user_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id")
    person = db.query(Person).filter(Person.id == user_uuid).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    # If user already has address → UPDATE
    if person.saved_address_ids and len(person.saved_address_ids) > 0:
        address = db.query(Address).filter(
            Address.id == person.saved_address_ids[0]
        ).first()
        
        if address:
            address.address_line1 = add.address_line1
            address.address_line2 = add.address_line2
            address.name = add.name
            address.city = add.city
            address.state = add.state
            address.country = add.country
            address.pincode = add.pincode
            address.contact_name = add.contact_name
            address.contact_number = add.contact_number

            db.commit()

            return ResponseModel(screen_id=context.screen_id,
                data={"message": "Address updated successfully","address_id": address.id})

    # Otherwise CREATE
    new_address = Address(
        address_line1=add.address_line1,
        address_line2=add.address_line2,
        name=add.name,
        city=add.city,
        state=add.state,
        country=add.country,
        pincode=add.pincode,
        contact_name=add.contact_name,
        contact_number=add.contact_number
    )

    db.add(new_address)
    db.flush()

    if not person.saved_address_ids:
        person.saved_address_ids = []
    person.saved_address_ids.append(new_address.id)
    db.commit()
    return ResponseModel(screen_id=context.screen_id,
    data={"message": "Address added successfully","address_id": new_address.id}
    )

@router.get("/address")
async def get_addresses(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == context.user_id).first()

    if not person or not person.saved_address_ids:
        return ResponseModel(screen_id=context.screen_id, data={"addresses": []})

    addresses = db.query(Address).filter(Address.id.in_(person.saved_address_ids)).all()
    address_models = [Address.copyToModel(a) for a in addresses]

    return ResponseModel(screen_id=context.screen_id,data={"addresses": address_models})
