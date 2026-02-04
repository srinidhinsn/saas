from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.user_model import UserModel, PersonModel
from models.response_model import ResponseModel
from entity.user_entity import User, Person,PageDefinition
from utils.auth import hash_password, SECRET_KEY, ALGORITHM,get_page_definition, get_screen_id
from jose import jwt,JWTError
from sqlalchemy import func

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
    perms = {}
    roles = [r.lower().strip() for r in (context.roles or [])]

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
    ops = role_perms.get(module, set())
    if "ALL" in ops:
        return True
    
    if operation:
        return any(
            op == operation or op.startswith(f"{operation}/")
            for op in ops
        )
    return bool(ops)