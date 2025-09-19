from fastapi import Depends, HTTPException, APIRouter, Request
from sqlalchemy.orm import Session
from database.postgres import get_db
from entity.user_entity import User, Person
from utils.auth import hash_password, verify_password, create_access_token, verify_token
from models.saas_context import SaasContext
from models.user_model import UserModel, ResetpasswordRequest, LoginRequest,PersonModel
from models.response_model import ResponseModel
from sqlalchemy import and_
from utils.send_email_otp import otpEmailService, otp_store
from utils.create_notification import  get_template_body, render_template
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
    user = db.query(User).filter(
        and_(User.username == userReq.username, User.client_id == client_id)
    ).first()

    if not user or not verify_password(userReq.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    userModel = User.copyToModel(user)

    person = db.query(Person).filter(Person.id == userModel.id).first()
    if not person:
        person = Person(
            id=userModel.id,
            first_name="", 
            last_name="", 
            email=userModel.email if hasattr(userModel, "email") else None
        )
        db.add(person)
        db.commit()
        db.refresh(person)
    else:
        updated = False
        if hasattr(userModel, "email") and userModel.email:
            if userModel.email != person.email:
               person.email = userModel.email
               updated = True
        if updated:
            db.commit()

    userModel.first_name = person.first_name
    userModel.last_name = person.last_name
    userModel.email = person.email
    userModel.phone = person.phone
    token = create_access_token({
        "user_id": str(userModel.id),
        "roles": userModel.roles,
        "client_id": userModel.client_id,
        "grants": userModel.grants
    })

    response = ResponseModel(
        screen_id="default_user",
        data={"access_token": token, "token_type": "bearer"}
    )
    return response

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

# ========================================================================================================================== 
@router.post("/forgot-password")
async def forgot_password(client_id: str, request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    username = body.get("username")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    user = db.query(User).filter(
        and_(User.username == username, User.client_id == client_id)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    userModel = User.copyToModel(user)
    person = db.query(Person).filter(Person.id == userModel.id).first()
    if not person or not person.email:
        raise HTTPException(status_code=404, detail="Email not found")

    otp = str(random.randint(100000, 999999))
    otp_store[userModel.id] = {
        "otp": otp,
        "expires": datetime.utcnow() + timedelta(minutes=10)
    }

    metadata = {
        "username": userModel.username,
        "clientId": client_id,
        "otp": otp,
        "otp_type": "forgot-password"
    }

    template_body = get_template_body(db, client_id, "forgot_password", "template")
    if not template_body:
        template_body = "Dear {username}, your OTP for resetting password in {clientId} is {otp}."

    notification_text = render_template(template_body, metadata)
    if not otpEmailService(person.email, notification_text):
        raise HTTPException(status_code=500, detail="Failed to send OTP")

    return {"message": "OTP sent successfully"}


@router.post("/reset-password")
async def reset_password(
    client_id: str,
    req_data: ResetpasswordRequest,
    db: Session = Depends(get_db)
):
    # Fetch user
    user = db.query(User).filter(
        and_(User.username == req_data.username, User.client_id == client_id)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    userModel = User.copyToModel(user)

    # ------------------- OTP flow -------------------
    if not req_data.otp and not req_data.old_password:
        # OTP requires an email
        person = db.query(Person).filter(Person.id == userModel.id).first()
        if not person or not person.email:
            raise HTTPException(status_code=404, detail="User email not found")

        otp = str(random.randint(100000, 999999))
        otp_store[userModel.id] = {
            "otp": otp,
            "expires": datetime.utcnow() + timedelta(minutes=10)
        }

        metadata = {
            "username": userModel.username,
            "clientId": client_id,
            "otp": otp,
            "otp_type": "reset-password"
        }

        template_body = get_template_body(db, client_id, "reset_password", "template")
        if not template_body:
            template_body = "Dear {username}, your reset-password OTP for {clientId} is {otp}"

        notification_text = render_template(template_body, metadata)
        otpEmailService(person.email, notification_text)

        return {"message": "OTP sent successfully"}

    # ------------------- OTP verification -------------------
    if req_data.otp:
        otp_data = otp_store.get(userModel.id)
        if not otp_data:
            raise HTTPException(status_code=400, detail="OTP not requested")
        if otp_data["otp"] != req_data.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        if datetime.utcnow() > otp_data["expires"]:
            raise HTTPException(status_code=400, detail="OTP expired")

    # ------------------- Old password verification -------------------
    elif req_data.old_password:
        if not verify_password(req_data.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid old password")

    # ------------------- Confirm new password -------------------
    if req_data.new_password != req_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # ------------------- Update password -------------------
    user.hashed_password = hash_password(req_data.new_password)
    db.commit()
    otp_store.pop(userModel.id, None)

    # Optional success notification if OTP flow
    if req_data.otp:
        person = db.query(Person).filter(Person.id == userModel.id).first()
        if person and person.email:
            metadata = {
                "username": userModel.username,
                "clientId": client_id
            }
            template_body = get_template_body(db, client_id, "reset_password_success", "template")
            if not template_body:
                template_body = "Dear {username}, your password for {clientId} has been reset successfully."
            notification_text = render_template(template_body, metadata)
            otpEmailService(person.email, notification_text)

    return {"message": "Password reset successfully"}

@router.post("/person-details")
async def add_edit_person_details(
    client_id: str,
    person_req: PersonModel,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # Fetch the logged-in user
    user = db.query(User).filter(User.id == context.user_id, User.client_id == client_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if a Person entry exists for this user
    existing_person = db.query(Person).filter(Person.id == user.id).first()

    action = "added"
    if existing_person:
        # Update existing person
        existing_person.first_name = person_req.first_name
        existing_person.last_name = person_req.last_name
        existing_person.dob = person_req.dob
        existing_person.email = person_req.email
        existing_person.phone = person_req.phone
        db.commit()
        db.refresh(existing_person)
        action = "updated"
    else:
        # Create new person
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

    # Send notification if email exists
    if person_req.email:
        body = f"Dear {person_req.first_name}, your details have been {action}."
        otpEmailService(person_req.email, body)

    return {"message": f"Person details {action} successfully", "person_id": existing_person.id}


@router.get("/person-details")
async def get_person_details(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # Always fetch the person for the logged-in user
    person = db.query(Person).filter(Person.id == context.user_id).first()
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


@router.get("/notifications")
def get_notifications(
    client_id: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db),
):
    # Currently returning empty list; can be enhanced later
    return []
