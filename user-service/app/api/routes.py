from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.user_model import UserRequest
from models.user_entity import User
from utils.auth import hash_password, verify_password, create_access_token
from models.saas_context import SaasContext, saasContext

router = APIRouter()


@router.post("/register")
async def register_user(clientid: str, userReq: UserRequest, db: Session = Depends(get_db)):
    hashed_pw = hash_password(userReq.password)
    user = User(username=userReq.username, hashed_password=hashed_pw, clientid = clientid)
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}

@router.post("/login")
async def login_user(clientid: str, userReq: UserRequest, db: Session = Depends(get_db)):
    context: SaasContext = saasContext.get()
    print("context - ", context)
    user = db.query(User).filter(User.username == userReq.username and User.clientid == context.clientid).first()
    if not user or not verify_password(userReq.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"sub": context.userid, "roles": context.roles, "clientid": context.clientid, "grants" : context.grants})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/test")
async def test_msg(clientid: str):
    return {"message": "Test Authentication Service Running in user routes"}