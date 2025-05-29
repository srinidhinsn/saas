from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.user_model import UserRequest
from models.user_entity import User
from utils.auth import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/{clientId}/add-item")
async def add_item(clientId: str, db: Session = Depends(get_db)):
    
    return {"message": "Item added successfully"}

@router.post("/{clientId}/add-sub-item")
async def add_sub_item(clientId: str, userReq: UserRequest, db: Session = Depends(get_db)):
   
    return {"message": "Sub-Item added successfully"}


@router.get("/{clientId}/remove-item")
async def remove_item():
    return {"message": "Item removed successfully"}