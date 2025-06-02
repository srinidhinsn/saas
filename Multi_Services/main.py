# from fastapi import FastAPI
# from app.api.api_router import api_router
# from app.database import engine, Base
# from app.models import *
# from fastapi.middleware.cors import CORSMiddleware

# Base.metadata.create_all(bind=engine)  # Only for dev use

# app = FastAPI(title="Dine-In Service API", version="1.0.0")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(api_router)

#-----------------------------------------------------------------------

# from fastapi import FastAPI
# from table_service.app.routes import router as table_router
# from menu_service.app.routes import router as menu_router
# from combo_service.app.routes import router as combo_router
# from order_service.app.routes import router as order_router

# app = FastAPI(title="Dine-In Microservice Suite")

# # Register routers from each microservice
# app.include_router(table_router)
# app.include_router(menu_router)
# app.include_router(combo_router)
# app.include_router(order_router)

#-----------------------------------------------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers from individual microservices
from table_service.app.routes import router as table_router
from menu_service.app.routes import router as menu_router
from combo_service.app.routes import router as combo_router
from order_service.app.routes import router as order_router
from report_service.app.routes import router as report_router

app = FastAPI(
    title="Dine-In Microservice Suite",
    version="1.0.0",
    description="Manages tables, menu, combos, and orders for multi-tenant dine-in SaaS."
)

# Enable CORS (for React frontend on Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with logical prefixes and tags
app.include_router(table_router, prefix="/api/v1")
app.include_router(menu_router, prefix="/api/v1")
app.include_router(combo_router, prefix="/api/v1")
app.include_router(order_router, prefix="/api/v1")
app.include_router(report_router, prefix="/api/v1")





