from fastapi import Depends, HTTPException, APIRouter, Header
from sqlalchemy.orm import Session
from database.postgres import get_db
from entity.user_entity import User, Person
from utils.auth import hash_password, verify_password, create_access_token, verify_token
from models.saas_context import SaasContext, saasContext
from models.user_model import UserModel, ResetpasswordRequest, LoginRequest
from models.response_model import ResponseModel
from sqlalchemy import and_

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
async def login_user(
    client_id: str,
    userReq: LoginRequest,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        and_(User.username == userReq.username, User.client_id == client_id)
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    userModel = user.copyToModel(user)

    if not verify_password(userReq.password, userModel.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_access_token({
        "user_id": str(userModel.id),
        "roles": userModel.roles,
        "client_id": userModel.client_id,
        "grants": userModel.grants
    })

    return ResponseModel(
        screen_id="default_user",
        data={"access_token": token, "token_type": "bearer"}
    )


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

@router.post("/reset-password")
def reset_password(req_data: ResetpasswordRequest):
    return {"message": "Feel free to build the api"}


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
