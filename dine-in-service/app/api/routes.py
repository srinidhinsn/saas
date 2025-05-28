from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from database.postgres import get_db
from models.saas_context import SaasContext, saasContext

router = APIRouter()


@router.post("/add-item")
async def add_item(clientid: str, db: Session = Depends(get_db)):
    context: SaasContext = saasContext.get()
    print("Use userid, clientid within the context - ", context)

    return {"message": "Item added successfully"}

@router.post("/add-sub-item")
async def add_sub_item(clientid: str, userReq: UserRequest, db: Session = Depends(get_db)):
   
    return {"message": "Sub-Item added successfully"}


@router.get("/remove-item")
async def remove_item():
    return {"message": "Item removed successfully"}

    
@router.get("/order-confirmation")
async def order_confirmation():
    #order service
    return {"message": "Item removed successfully"}
