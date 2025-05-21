from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.user_model import UserRequest
from models.user_entity import User
from utils.auth import hash_password, verify_password, create_access_token

router = APIRouter()

@router.post("/{clientid}/dine-in/select-table")
async def add_item(clientid: str, db: Session = Depends(get_db)):
    
    return {"message": "Item added successfully"}


@router.post("/{clientid}/dine-in/add-item")
async def add_item(clientid: str, db: Session = Depends(get_db)):
    
    return {"message": "Item added successfully"}

@router.post("/{clientid}/dine-in/add-sub-item")
async def add_sub_item(clientid: str, userReq: UserRequest, db: Session = Depends(get_db)):
   
    return {"message": "Sub-Item added successfully"}


@router.get("/{clientid}/dine-in/remove-item")
async def remove_item():
    return {"message": "Item removed successfully"}

    
@router.get("/{clientid}/dine-in/order-confirmation")
async def order_confirmation():
    #order service
    return {"message": "Item removed successfully"}


@router.get("/{clientid}/")
async def remove_item():
    return {"message": "Item removed successfully"}