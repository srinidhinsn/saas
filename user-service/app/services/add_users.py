from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.user_model import UserModel, PersonModel
from models.response_model import ResponseModel
from entity.client_entity import Client
from entity.user_entity import User, Person
from utils.auth import hash_password
import uuid

async def create_user_and_person(client_id: str, userReq: UserModel, db: Session):
    if not userReq.username or not userReq.password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    # fetching client table to get the  realm
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    realm_grant = client.realm

    # Preparing roles and grants
    roles = userReq.roles or []
    grants = userReq.grants or []
    if realm_grant and realm_grant not in grants:
        grants.append(realm_grant)

    # Hashing password
    hashed_pw = hash_password(userReq.password)

    # Creating PersonModel from userReq
    person_model = PersonModel(
        first_name=userReq.first_name,
        last_name=userReq.last_name,
        dob=userReq.dob,
        email=userReq.email,
        phone=userReq.phone
    )

    # Create Person entity from model
    person = Person(**person_model.dict(exclude_unset=True))
    db.add(person)
    db.commit()
    db.refresh(person)

    # Create User entity from model
    user = User(
        id=person.id,
        username=userReq.username,
        hashed_password=hashed_pw,
        client_id=client_id,
        roles=roles,
        grants=grants
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return ResponseModel(
        screen_id="user_created",
        data={"message": "User registered successfully", "user_id": str(user.id)}
    )
