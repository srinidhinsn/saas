from fastapi import APIRouter
from app.api.v1.endpoints import tables, menu, combos, orders, client

api_router = APIRouter()
api_router.include_router(tables.router, prefix="/api/v1", tags=["Tables"])
api_router.include_router(menu.router, prefix="/api/v1", tags=["Menu"])
api_router.include_router(combos.router, prefix="/api/v1", tags=["combos"])
api_router.include_router(orders.router, prefix="/api/v1", tags=["Orders"])
api_router.include_router(
    client.router, prefix="/api/v1/client", tags=["Client"])
