from fastapi import FastAPI
from app.api.v1.api_router import api_router
from app.database import engine, Base
from app.models import *
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)  # Only for dev use

app = FastAPI(
    title="Dine-In Service API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)


