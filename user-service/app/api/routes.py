from fastapi import Depends, HTTPException, APIRouter, Header
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.user_model import LoginRequest
from models.user_entity import User
from utils.auth import hash_password, verify_password, create_access_token, verify_token
from models.saas_context import SaasContext, saasContext
from models.user_model import UserModel

router = APIRouter()

@router.post("/register")
async def register_user(clientId: str, userReq: UserModel, db: Session = Depends(get_db)):
    hashed_pw = hash_password(userReq.password)
    print("user model 1 - ", userReq)
    userReq.clientId = clientId
    user = User(username=userReq.username, hashed_password=hashed_pw, clientId = userReq.clientId, roles=userReq.roles, grants=userReq.grants)
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}


@router.post("/login")
async def login_user(clientId: str, userReq: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == userReq.username and User.clientId == clientId).first()
    userModel = user.copyToModel(user)
    print("user model - ", userModel)

    if not userModel or not verify_password(userReq.password, userModel.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"userId": userModel.id, "roles": userModel.roles, "clientId": userModel.clientId, "grants" : userModel.grants})
    return {"access_token": token, "token_type": "bearer"}

'''    
@router.post("/login")
async def login_user2(clientId: str, userReq: LoginRequest = Depends(), db: Session = Depends(get_db)):
    context: SaasContext = saasContext.get()
    user = db.query(User).filter(User.username == userReq.username and User.clientId == clientId).first()
    if not user or not verify_password(userReq.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"userId": user.id, "roles": user.roles, "clientId": user.clientId, "grants" : user.grants})
    return {"access_token": token, "token_type": "bearer"}
 '''

@router.get("/test")
async def test_msg(clientId: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context - ", context)
    print("test screenId - ", context.screenId)
    return {"message": "Test Authentication Service Running in user routes"}



@router.get("/test2")
async def test_msg(clientId: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context2 - ", context)
    return {"message": "Test2 Authentication Service Running in user routes"}