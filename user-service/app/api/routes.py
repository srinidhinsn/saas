from fastapi import Depends, HTTPException, APIRouter, Request
from sqlalchemy.orm import Session
from database.postgres import get_db
from entity.user_entity import User, Person,PageDefinition
from entity.client_entity import Client
from utils.auth import hash_password, verify_password, create_access_token, verify_token, SECRET_KEY, ALGORITHM
from models.saas_context import SaasContext
from models.user_model import UserModel, ResetpasswordRequest, LoginRequest,PersonModel
from models.response_model import ResponseModel
from models.user_model import DelegatedAccessRequest
from sqlalchemy import and_
from utils.send_email_otp import otpEmailService, otp_store
from utils.create_notification import  get_template_body, render_template
import random
from datetime import datetime, timedelta
from jose import jwt

router = APIRouter()


@router.post("/register")
async def register_user(client_id: str, userReq: UserModel, db: Session = Depends(get_db)):
    hashed_pw = hash_password(userReq.password)
    print("user model 1 - ", userReq)
    userReq.client_id = client_id
    user = User(username=userReq.username, hashed_password=hashed_pw,
                client_id=userReq.client_id, roles=userReq.roles, grants=userReq.grants)
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}

@router.post("/login")
async def login_user(client_id: str, userReq: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        and_(User.username == userReq.username, User.client_id == client_id)
    ).first()

    if not user or not verify_password(userReq.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    userModel = User.copyToModel(user)
    
    client = db.query(Client).filter(Client.id==client_id).first()
    client_model = Client.copyToModel(client)

    token = create_access_token({
        "user_id": str(userModel.id),
        "roles": userModel.roles,
        "client_id": userModel.client_id,
        "grants": userModel.grants,
        "realm": client_model.realm
    })
    return ResponseModel(
        screen_id="default_user",
        data={"access_token": token, "token_type": "bearer"}
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
async def forgot_password(client_id: str, req_data: ResetpasswordRequest, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
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

    otp = str(random.randint(100000, 999999))
    otp_store[userModel.id] = {"otp": otp, "expires": datetime.utcnow() + timedelta(minutes=10)}

    metadata = {"username": userModel.username, "clientId": client_id, "otp": otp}
    template_body = get_template_body(db, client_id, "forgot_password", "template") \
                    or "Dear {username}, your OTP for resetting password in {clientId} is {otp}."

    notification_text = render_template(template_body, metadata)
    if not otpEmailService(person.email, notification_text):
        raise HTTPException(status_code=500, detail="Failed to send OTP")

    return ResponseModel(screen_id=context.screen_id, data={"message": "OTP sent successfully"})
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
        otp_store[userModel.id] = {"otp": otp, "expires": datetime.utcnow() + timedelta(minutes=10)}

        metadata = {"username": userModel.username, "clientId": client_id, "otp": otp}
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
            otpEmailService(person.email, render_template(template_body, metadata))

    return ResponseModel(screen_id=context.screen_id, data={"message": "Password reset successfully"})
# ================== PERSON DETAILS ==================
@router.post("/person-details")
async def add_edit_person_details(
    client_id: str,
    person_req: PersonModel,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == context.user_id, User.client_id == client_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing_person = db.query(Person).filter(Person.id == user.id).first()
    action = "added"

    if existing_person:
        existing_person.first_name = person_req.first_name
        existing_person.last_name = person_req.last_name
        existing_person.dob = person_req.dob
        existing_person.email = person_req.email
        existing_person.phone = person_req.phone
        db.commit()
        db.refresh(existing_person)
        action = "updated"
    else:
        person = Person(
            id=user.id,
            first_name=person_req.first_name,
            last_name=person_req.last_name,
            dob=person_req.dob,
            email=person_req.email,
            phone=person_req.phone
        )
        db.add(person)
        db.commit()
        db.refresh(person)
        existing_person = person

    if person_req.email:
        body = f"Dear {person_req.first_name}, your details have been {action}."
        otpEmailService(person_req.email, body)

    return ResponseModel(
        screen_id=context.screen_id,
        data={"message": f"Person details {action} successfully"}
    )

@router.get("/person-details")
async def get_person_details(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == context.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    return ResponseModel(
        screen_id=context.screen_id,
        data={"person": PersonModel.from_orm(person)}
    )

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



@router.post("/delegate-access")
async def delegate_access(
    client_id: str,
    req: DelegatedAccessRequest,
    db: Session = Depends(get_db)
):
    # 1️⃣ Validate admin credentials
    admin = db.query(User).filter(User.username == req.admin_username).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    if not verify_password(req.admin_password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    # 2️⃣ Validate requester exists
    requester = db.query(User).filter(User.id == req.requester_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    # 3️⃣ Combine original grants with delegated page
    original_grants = requester.grants or []
    delegated_grants = list(set(original_grants + [req.page]))
    print("the deegated grants",delegated_grants)

    client = db.query(Client).filter(Client.id==client_id).first()
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
        raise HTTPException(status_code=404, detail="No users found for this client")

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
        screen_ids = payload.get("accessible", [])

        # Delete old role-screen mappings
        db.query(PageDefinition).filter(
            PageDefinition.client_id == client_id,
            PageDefinition.role == role
        ).delete()

        # Insert new mappings
        for sid in screen_ids:
            db.add(PageDefinition(client_id=client_id, role=role, screen_id=sid))
        db.commit()
        return ResponseModel( screen_id=context.screen_id, message=f"Updated screen configuration for {role}", data={"accessible": screen_ids})
    except Exception as e:
        db.rollback()
        return ResponseModel( screen_id=context.screen_id, status="error", message=f"Failed to save config: {str(e)}")
