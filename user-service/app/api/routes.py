from fastapi import Depends, HTTPException, APIRouter, Path, Body
from sqlalchemy.orm import Session
from database.postgres import get_db
from entity.user_entity import User, Person, Notification
from utils.auth import hash_password, verify_password, create_access_token, verify_token
from models.saas_context import SaasContext, saasContext
from models.user_model import UserModel, PersonModel, ResetPasswordRequest, LoginRequest, ForgotPasswordRequest
from models.response_model import ResponseModel
from sqlalchemy import and_
from utils.send_email_otp import otpEmailService, otp_store
from utils.create_notification import create_notification, generate_email_body, get_template_body, render_template

import random
from datetime import datetime, timedelta

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
    # user = db.query(User).filter(User.username == userReq.username and User.client_id == client_id).first()
    user = db.query(User).filter(
        # and_() is a SQLAlchemy construct that creates a SQL AND expression: SELECT * FROM user WHERE username = 'admin' AND client_id = 'easyfood';
        and_(User.username == userReq.username, User.client_id == client_id)
    ).first()

    if not user or not verify_password(userReq.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    #  fetch ---create new Person in the person table if not exists
    person = db.query(Person).filter(Person.id == user.id,
                                     Person.client_id == client_id).first()
    if not person:
        # If Person doesn't exist, create it with first_name = username
        person = Person(
            id=user.id,
            client_id=client_id,
            first_name=user.username
        )
        db.add(person)
        db.commit()
        db.refresh(person)
    else:
        if person.first_name != user.username:
            person.first_name = user.username
            db.commit()

    # Create UserModel
    userModel = UserModel(
        id=user.id,
        client_id=user.client_id,
        username=user.username,
        first_name=person.first_name,
        roles=user.roles,
        grants=user.grants,
        hashed_password=user.hashed_password
    )

    token = create_access_token({
        "user_id": str(userModel.id),
        "roles": userModel.roles,
        "client_id": userModel.client_id,
        "grants": userModel.grants
    })

    response = ResponseModel(screen_id="default_user", data={
        "access_token": token, "token_type": "bearer"
    })
    # response.set_response(screen_id="defaultUser", data={"access_token": token, "token_type": "bearer"})
    return response


@router.post("/add")
async def add_user(client_id: str, userReq: UserModel, db: Session = Depends(get_db)):
    hashed_pw = hash_password(userReq.password)
    userReq.client_id = client_id

    person = Person.copyFromModel(userReq)
    db.add(person)
    db.commit()
    user = User(id=person.id, username=userReq.username, hashed_password=hashed_pw,
                client_id=userReq.client_id, roles=userReq.roles, grants=userReq.grants)
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}


@router.post("/reset-password")
def reset_password(req_data: ResetPasswordRequest):
    return {"message": "Feel free to build the api"}


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
# =================================================================================================================================== //

# ---------------- Forgot Password ----------------


@router.post("/forgot-password")
async def forgot_password(client_id: str, req_data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        and_(User.username == req_data.username, User.client_id == client_id)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    person = db.query(Person).filter(Person.id == user.id).first()
    if not person or not person.email:
        raise HTTPException(status_code=404, detail="Email not found")

    otp = str(random.randint(100000, 999999))
    otp_store[user.id] = {"otp": otp,
                          "expires": datetime.utcnow() + timedelta(minutes=10)}
    metadata = {
        "username": user.username,
        "clientId": client_id,
        "otp": otp,
        "otp_type": "forgot-password"
    }

    template_body = get_template_body(
        db, client_id, "forgot_password", "template")
    if not template_body:
        template_body = "Dear {username}, your forgot-password OTP for {clientId} is {otp}"
    notification_text = render_template(template_body, metadata)

    create_notification(
        db=db,
        client_id=client_id,
        username=user.username,
        template_name="forgot_password",
        notification_body=notification_text,
        notification_metadata=metadata,
        type="template",
        realm="food"
    )

    if not otpEmailService(person.email, notification_text):
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    return {"message": "OTP sent successfully"}

# ---------------- Reset Password ----------------


@router.post("/reset-password")
async def reset_password(
    client_id: str,
    req_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == req_data.username,
        User.client_id == client_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    person = db.query(Person).filter(Person.id == user.id).first()
    if not person or not person.email:
        raise HTTPException(status_code=404, detail="User email not found")

    otp_data = otp_store.get(user.id)
    if not otp_data:
        otp = str(random.randint(100000, 999999))
        otp_store[user.id] = {
            "otp": otp, "expires": datetime.utcnow() + timedelta(minutes=10)}
        metadata = {
            "username": user.username,
            "clientId": client_id,
            "otp": otp,
            "otp_type": "reset-password"
        }
        template_body = get_template_body(
            db, client_id, "reset_password", "template")

        if not template_body:
            template_body = "Dear {username}, your reset-password OTP for {clientId} is {otp}"
        notification_text = render_template(template_body, metadata)

        print('Template body:', template_body)
        print('Notification text:', notification_text)

        create_notification(
            db=db,
            client_id=client_id,
            username=user.username,
            template_name="reset_password_otp",
            notification_body=notification_text,
            notification_metadata=metadata,
            type="template",
            realm="food"
        )
        otpEmailService(person.email, notification_text)
        return {"message": "OTP sent successfully"}

    if otp_data["otp"] != req_data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if datetime.utcnow() > otp_data["expires"]:
        raise HTTPException(status_code=400, detail="OTP expired")
    if req_data.new_password != req_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    user.hashed_password = hash_password(req_data.new_password)
    db.commit()
    otp_store.pop(user.id, None)
    metadata = {
        "username": user.username,
        "clientId": client_id
    }
    template_body = get_template_body(
        db, client_id, "reset_password_success", "template")
    if not template_body:
        template_body = "Dear {username}, your password for {clientId} has been reset successfully."
    notification_text = render_template(template_body, metadata)
    create_notification(
        db=db,
        client_id=client_id,
        username=user.username,
        template_name="reset_password_success",
        notification_body=notification_text,
        notification_metadata=metadata,
        type="template",
        realm="food"
    )
    otpEmailService(person.email, notification_text)
    return {"message": "Password reset successfully"}

# --------------------------------- Person Details -----------------------------------------


@router.post("/person-details")
async def add_person_details(
    client_id: str = Path(...),
    person_req: PersonModel = Body(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.client_id == client_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing_person = db.query(Person).filter(
        Person.id == user.id,
        Person.client_id == client_id
    ).first()

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
            client_id=client_id,
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

    user.username = person_req.first_name
    db.commit()

    metadata = {
        "username": person_req.first_name,
        "role": "user",
        "clientId": client_id,
        "action": action
    }
    template_name = "user_details_update" if action == "updated" else "user_add"
    body = f"Dear {person_req.first_name}, your details for {client_id} have been {action}."
    create_notification(
        db=db,
        client_id=client_id,
        username=person_req.first_name,
        template_name=template_name,
        notification_body=body,
        notification_metadata=metadata,
        type="notification",
        realm="food"
    )
    if person_req.email:
        otpEmailService(person_req.email, body)

    return {"message": f"Person details {action} successfully", "person_id": existing_person.id}


@router.get("/person-details")
async def get_person_details(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    person = db.query(Person).filter(
        Person.id == context.user_id,
        Person.client_id == client_id
    ).first()

    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    return {
        "data": {
            "id": person.id,
            "first_name": person.first_name,
            "last_name": person.last_name,
            "dob": person.dob,
            "email": person.email,
            "phone": person.phone,
            "created_at": person.created_at,
            "updated_at": person.updated_at,
        }
    }


# Notifications


@router.get("/notifications")
def get_notifications(
    client_id: str,
    db: Session = Depends(get_db),
    context: SaasContext = Depends(verify_token),
):
    notifications = db.query(Notification).filter_by(
        client_id=client_id).order_by(Notification.created_at.desc()).all()
    return [
        {
            "id": str(n.id),
            "client_id": n.client_id,
            "username": n.username,
            "notification_body": n.notification_body,
            "template_name": n.template_name,
            "notification_metadata": n.notification_metadata,
            "type": n.type,
            "realm": n.realm,
            "ref_id": n.ref_id,
            "is_read": n.is_read,
            "is_deleted": n.is_deleted,
            "read_by": n.read_by,
            "created_at": n.created_at.isoformat() if isinstance(n.created_at, datetime) else n.created_at,
            "updated_at": n.updated_at.isoformat() if isinstance(n.updated_at, datetime) else n.updated_at,
        }
        for n in notifications
    ]
