from fastapi import Depends, HTTPException, APIRouter, Header
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.user_model import LoginRequest
from entity.user_entity import User
from utils.auth import hash_password, verify_password, create_access_token, verify_token
from models.saas_context import SaasContext, saasContext
from models.user_model import UserModel
from models.response_model import ResponseModel

router = APIRouter()

@router.post("/register")
async def register_user(client_id: str, userReq: UserModel, db: Session = Depends(get_db)):
    hashed_pw = hash_password(userReq.password)
    print("user model 1 - ", userReq)
    userReq.client_id = client_id
    user = User(username=userReq.username, hashed_password=hashed_pw, client_id = userReq.client_id, roles=userReq.roles, grants=userReq.grants)
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}


@router.post("/login")
async def login_user(client_id: str, userReq: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == userReq.username and User.client_id == client_id).first()
    userModel = user.copyToModel(user)
    print("user model - ", userModel)

    if not userModel or not verify_password(userReq.password, userModel.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"user_id": str(userModel.id), "roles": userModel.roles, "client_id": userModel.client_id, "grants" : userModel.grants})
    response = ResponseModel(screen_id="defaultUser", data={"access_token": token, "token_type": "bearer"})
    #response.set_response(screen_id="defaultUser", data={"access_token": token, "token_type": "bearer"})
    return response



@router.get("/test")
async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context - ", context)
    print("test screen_id - ", context.screen_id)
    return {"message": "Test Authentication Service Running in user routes"}
     


@router.get("/test2")
async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context2 - ", context)
    return {"message": "Test2 Authentication Service Running in user routes"}