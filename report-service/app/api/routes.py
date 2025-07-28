from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from fastapi.responses import StreamingResponse
from typing import Optional
from database.postgres import get_db
from utils.auth import verify_token
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from app.services.report_service import generate_order_report, get_dashboard_data

router = APIRouter()

# Endpoint to generate order report
# @router.get("/orders", response_class=StreamingResponse)
# def download_order_report(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
#     if context.client_id != client_id:
#         raise HTTPException(status_code=403, detail="Unauthorized")
#     response = generate_order_report(client_id, db)
#     return response

@router.get("/orders", response_class=StreamingResponse)
def download_order_report(client_id: str, date_range: Optional[str] = Query(None, description="e.g. today, last_month"),
    context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if context.client_id != client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    response = generate_order_report(client_id, db, date_range)
    return response

# Endpoint to get real-time dashboard data
@router.get("/dashboard", response_model=ResponseModel[dict])
def dashboard_summary(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    if context.client_id != client_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    dashboard_data = get_dashboard_data(client_id, db)
    response = ResponseModel[dict](screen_id=context.screen_id, status="success", 
                               message="Dashboard data fetched successfully", data=dashboard_data)
    return response
