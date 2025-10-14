from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.user_model import UserModel, PersonModel
from models.response_model import ResponseModel
from entity.user_entity import User, Person
from utils.auth import hash_password

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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")
