from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.errors import forbidden_error, internal_server_error, service_unavailable
from fastapi import FastAPI
from app.api.v1.api_router import api_router
from app.database import engine, Base
from app.models import *
from app.models import client


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dine-In Service API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)


@app.get('/')
def root():
    return {"Backend Code": "NO Errors!",
            "Without Error": "It's Working Fine!!!"}


@app.get("/protected")
async def protected_route():
    raise forbidden_error()


@app.get("/crash")
async def crash_route():
    raise internal_server_error()


@app.get("/unavailable")
async def unavailable_route():
    raise service_unavailable()


@app.get("/ok")
async def ok_route():
    return {"message": "Everything is fine!"}
