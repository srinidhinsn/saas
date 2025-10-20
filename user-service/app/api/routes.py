from fastapi import Depends, HTTPException, APIRouter, Request
from sqlalchemy.orm import Session
from database.postgres import get_db
from entity.user_entity import User, Person
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
from services.add_users import create_user_and_person
from jose import jwt

router = APIRouter()
# ================== ADD USER ==================
@router.post("/add")
async def add_user(client_id: str, userReq: UserModel,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    token_realm = context.grants[0] if context.grants else None
    return await create_user_and_person(client_id=client_id,userReq=userReq, db=db,token_realm=token_realm)

# ================== REGISTER USER ==================
@router.post("/register")
async def register_user(client_id: str, userReq: UserModel,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    token_realm = context.grants[0] if context.grants else None
    return await create_user_and_person(client_id=client_id,userReq=userReq,db=db,token_realm=token_realm)

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
    context = verify_token(token)
    return ResponseModel(
        screen_id=context.screen_id,
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
        otp_store[userModel.id] = {"otp": otp, "expires": datetime.utcnow() + timedelta(minutes=10)}

        metadata = {"username": userModel.username, "clientId": client_id, "otp": otp}
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
            raise HTTPException(status_code=400, detail="Passwords do not match")

        user.hashed_password = hash_password(req_data.new_password)
        db.commit()
        otp_store.pop(userModel.id, None)

        metadata = {"username": userModel.username, "clientId": client_id}
        template_body = get_template_body(db, client_id, "reset_password_success", "template") \
                        or "Dear {username}, your password for {clientId} has been reset successfully."
        otpEmailService(person.email, render_template(template_body, metadata))

        return ResponseModel(screen_id="default_user",data={"message": "Password reset successfully"})

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
        otp_store[userModel.id] = {"otp": otp, "expires": datetime.utcnow() + timedelta(minutes=10)}

        metadata = {"username": userModel.username, "clientId": client_id, "otp": otp}
        template_body = get_template_body(db, client_id, "reset_password", "template") \
                        or "Dear {username}, your reset-password OTP for {clientId} is {otp}"

        otpEmailService(person.email, render_template(template_body, metadata))

        return ResponseModel( screen_id=context.screen_id,data={"message": "OTP sent successfully"})

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

    return ResponseModel( screen_id=context.screen_id,data={"message": "Password reset successfully"})

# ================== PERSON DETAILS ==================
@router.post("/person-details")
async def update_person_details(
    client_id: str,
    person_req: PersonModel,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == context.user_id, 
        User.client_id == client_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch existing person
    person = db.query(Person).filter(Person.id == user.id).first()
    action = "added"

    if person:
        # Update existing
        person.first_name = person_req.first_name
        person.last_name = person_req.last_name
        person.dob = person_req.dob
        person.email = person_req.email
        person.phone = person_req.phone
        db.commit()
        db.refresh(person)
        action = "updated"
    else:
        # Create new
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

    # Send email notification if email exists
    if person_req.email:
        body = f"Dear {person_req.first_name}, your details have been {action} successfully."
        try:
            otpEmailService(person_req.email, body)
        except Exception as e:
            # Log email failure but don't fail the request
            print(f"Email failed: {e}")

    return ResponseModel(
        screen_id=context.screen_id,
        data={
            "message": f"Person details {action} successfully",
            "person": PersonModel.from_orm(person)
        }
    )

@router.get("/person-details")
async def get_person_details(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    person = db.query(Person).filter(Person.id == context.user_id).first()

    if not person:
        # Create empty Person record so user can later update it
        person = Person(id=context.user_id, email=None, phone=None, first_name=None, last_name=None, dob=None)
        db.add(person)
        db.commit()
        db.refresh(person)
    
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

@router.get("/persons")
async def get_all_persons(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    results = (
        db.query(Person, User.username, User.roles)
        .join(User, Person.id == User.id)
        .filter(User.client_id == client_id)
        .all()
    )

    persons = [
        {
            **Person.copyToModel(person).dict(),
            "username": username,
            "role": (roles[0] if roles else "")
        }
        for person, username, roles in results
    ]

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
