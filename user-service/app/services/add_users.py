from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.user_model import UserModel, PersonModel
from models.response_model import ResponseModel
from entity.user_entity import User, Person,PageDefinition
from utils.auth import hash_password, SECRET_KEY, ALGORITHM
from jose import jwt,JWTError

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
    
    page_defs = db.query(PageDefinition).filter(
        PageDefinition.role.in_(roles),
        PageDefinition.module == module,
        PageDefinition.client_id == client_id
    ).all()
    
    for pd in page_defs:
        if "ALL" in pd.operations or (module in pd.operations and pd.load_type == "include"):
            return pd.screen_id
        if module not in pd.operations and pd.load_type == "exclude":
            return pd.screen_id

    return "accessRestricted"

