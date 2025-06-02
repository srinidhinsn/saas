from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.user_model import UserRequest
from models.user_entity import User
from utils.auth import hash_password, verify_password, create_access_token

router = APIRouter()

@router.post("/{clientid}/register")
async def register_user(userReq: UserRequest, clientid: str, db: Session = Depends(get_db)):
    userReq.clientid = clientid
    hashed_pw = hash_password(userReq.password)
    user = User(username=userReq.username, hashed_password=hashed_pw, clientid = clientid)
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}

@router.post("/{clientid}/login")
async def login_user(clientid: str, userReq: UserRequest, db: Session = Depends(get_db)):
    userReq.clientid = clientid
    user = db.query(User).filter(User.username == userReq.username and User.clientid == userReq.clientid).first()
    print(user.username)
    print(clientid)
    if not user or not verify_password(userReq.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"sub": user.username, "roles": ["admin"], "clientid": userReq.clientid})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/test")
async def test_msg():
    return {"message": "Test Authentication Service Running in user routes"}