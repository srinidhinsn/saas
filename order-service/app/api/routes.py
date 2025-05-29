from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.saas_context import SaasContext, saasContext

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

    
@router.get("/{clientId}/order-confirmation")
async def order_confirmation():
    #order service
    return {"message": "Item removed successfully"}
