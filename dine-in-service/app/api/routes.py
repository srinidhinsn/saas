from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.saas_context import SaasContext, saasContext

router = APIRouter()


@router.post("/addItem")
async def add_item(clientId: str, db: Session = Depends(get_db)):
    context: SaasContext = saasContext.get()
    print("Use userId, clientId within the context - ", context)

    return {"message": "Item added successfully"}

@router.post("/addSubItem")
async def add_sub_item(clientId: str, userReq: UserRequest, db: Session = Depends(get_db)):
   
    return {"message": "Sub-Item added successfully"}


@router.get("/removeItem")
async def remove_item():
    return {"message": "Item removed successfully"}

    
@router.get("/orderConfirmation")
async def order_confirmation():
    #order service
    return {"message": "Item removed successfully"}
