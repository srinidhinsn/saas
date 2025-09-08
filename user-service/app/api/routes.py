from fastapi import Depends, HTTPException, APIRouter, Header, Path, Body
from sqlalchemy.orm import Session
from database.postgres import get_db
from entity.user_entity import User, Person
from utils.auth import hash_password, verify_password, create_access_token, verify_token
from utils.send_email_otp import otpEmailService, otp_store
from models.saas_context import SaasContext, saasContext
from models.user_model import UserModel, ResetPasswordRequest, LoginRequest, ForgotPasswordRequest, PersonModel
from models.response_model import ResponseModel
from sqlalchemy import and_

import random
import smtplib
from email.mime.text import MIMEText
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

# @router.post("/login")
# async def login_user(client_id: str, userReq: LoginRequest, db: Session = Depends(get_db)):
#     # user = db.query(User).filter(User.username == userReq.username and User.client_id == client_id).first()
#     user = db.query(User).filter(
#         # and_() is a SQLAlchemy construct that creates a SQL AND expression: SELECT * FROM user WHERE username = 'admin' AND client_id = 'easyfood';
#         and_(User.username == userReq.username, User.client_id == client_id)).first()
#     userModel = user.copyToModel(user)
#     print("user model - ", userModel)

#     if not userModel or not verify_password(userReq.password, userModel.hashed_password):
#         raise HTTPException(status_code=400, detail="Invalid credentials")
#     token = create_access_token({"user_id": str(userModel.id), "roles": userModel.roles,
#                                 "client_id": userModel.client_id, "grants": userModel.grants})
#     response = ResponseModel(screen_id="default_user", data={
#                              "access_token": token, "token_type": "bearer"})
#     # response.set_response(screen_id="defaultUser", data={"access_token": token, "token_type": "bearer"})
#     return response


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


# @router.post("/reset-password")
# def reset_password(req_data: ResetpasswordRequest):
#     return {"message": "Feel free to build the api"}


# @router.get("/test")
# async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
#     print("test context - ", context)
#     print("test screen_id - ", context.screen_id)
#     response = ResponseModel(screen_id="default_test", data={
#                              "message": "Test Authentication Service Running in user routes"})
#     return response


# @router.get("/test2")
# async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
#     print("test context2 - ", context)
#     response = ResponseModel(screen_id="default_test", data={
#                              "message": "Test2 Authentication Service Running in user routes"})
#     return response


# @router.get("/test3", include_in_schema=False)
# async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
#     print("test context3 - ", context)
#     response = ResponseModel(screen_id="default_test", data={
#                              "message": "Test3 Authentication Service Running in user routes"})
#     return response


# Forgot password


@router.post("/forgot-password")
async def forgotPassword(
    client_id: str = Path(...),
    req_data: ForgotPasswordRequest = Body(),
    db: Session = Depends(get_db)
):
    # Finding the user
    user = db.query(User).filter(
        and_(User.username == req_data.username,
             User.client_id == client_id)
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get the email otp from the person table
    person = db.query(Person).filter(Person.id == user.id).first()
    if not person or not person.email:
        raise HTTPException(
            status_code=404, detail="Email not found for this user")

    # creating otp and storing it
    otp = str(random.randint(100000, 999999))
    otp_store[user.id] = {
        "otp": otp, "expires": datetime.utcnow() + timedelta(minutes=10)}

    # Sending otp to emailAddress
    if not otpEmailService(person.email, otp):
        raise HTTPException(status_code=500, detail="Failed to send OTP")

    return {"message": "OTP sent successfully!!!"}


@router.post("/reset-password")
async def resetPassword(client_id: str, req_data: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Fetch the user from "user" table
    user = db.query(User).filter(
        and_(User.username == req_data.username, User.client_id == client_id)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    #  checking otp
    otp_data = otp_store.get(user.id)
    if not otp_data or otp_data["otp"] != req_data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if datetime.utcnow() > otp_data["expires"]:
        raise HTTPException(status_code=400, detail="OTP expired")

    # check the new password
    if req_data.new_password != req_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    #  Update the new password
    user.hashed_password = hash_password(req_data.new_password)
    db.commit()

    otp_store.pop(user.id, None)

    return {"message": "Password changed successfully"}


# person details table apis


@router.post("/person-details")
async def addPersonDetails(
    client_id: str = Path(...),
    person_req: PersonModel = Body(...),
    db: Session = Depends(get_db)
):
    # Check if user exists with same client_id
    user = db.query(User).filter(User.client_id == client_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if a person exists for this user
    existing_person = db.query(Person).filter(Person.id == user.id).first()
    if existing_person:
        # Update existing person
        existing_person.first_name = person_req.first_name
        existing_person.last_name = person_req.last_name
        existing_person.dob = person_req.dob
        existing_person.email = person_req.email
        existing_person.phone = person_req.phone
        db.commit()
        db.refresh(existing_person)

        # Sync username to user table
        user.username = person_req.first_name
        db.commit()

        return {"message": "Person details updated successfully", "person_id": existing_person.id}

    # Create new person
    person = Person(
        id=user.id,  # Use same ID as User for 1:1 mapping
        first_name=person_req.first_name,
        last_name=person_req.last_name,
        dob=person_req.dob,
        email=person_req.email,
        phone=person_req.phone
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    # Sync username to user table
    user.username = person_req.first_name
    db.commit()

    return {"message": "Person details added successfully", "person_id": person.id}


@router.get("/person-details")
async def getPersonDetails(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == context.user_id,
                                     Person.client_id == client_id).first()
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
