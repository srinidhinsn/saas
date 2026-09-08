import config.settings
from fastapi import FastAPI, Depends, Request, Header, HTTPException, WebSocket
from sqlalchemy.orm import Session
from api import routes
import logging
import os
import logging.config
import time
from config.settings import LOGGING_CONFIG
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import socket
import consul
# from services.chat_service import chat_service
load_dotenv()

app = FastAPI()
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [origin.strip() for origin in origins.split(",") if origin]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(routes.router, prefix="/saas/{client_id}/users")

# --- Consul registration ---
CONSUL_HOST = os.getenv("CONSUL_HOST", "172.17.0.16")
CONSUL_PORT = int(os.getenv("CONSUL_PORT", "8500"))

SERVICE_HOST = os.getenv("SERVICE_HOST", "127.0.0.1")
SERVICE_NAME = "user-service"
SERVICE_PORT = int(os.getenv("SERVICE_PORT", 8000))
SERVICE_ID = f"{SERVICE_NAME}-{socket.gethostname()}-{SERVICE_PORT}"

c = consul.Consul(
    host=CONSUL_HOST,
    port=CONSUL_PORT
)

@app.on_event("startup")
def register_with_consul():
    c.agent.service.register(
        name=SERVICE_NAME,
        service_id=SERVICE_ID,
        address=SERVICE_HOST,
        port=SERVICE_PORT,
        check=consul.Check.http(
            f"http://{SERVICE_HOST}:{SERVICE_PORT}/",
            interval="10s",
            timeout="5s"
        )
    )
    logger.info(f"[Consul] Registered as {SERVICE_ID}")


@app.on_event("shutdown")
def deregister_from_consul():
    c.agent.service.deregister(SERVICE_ID)
    logger.info(f"[Consul] Deregistered {SERVICE_ID}")
# --- end Consul registration ---



@app.get('/')
def root():
    return {"Login Service":  "Running on 8000"}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(
        f"Request start time: {request.method} {request.url} - Request: {request} - Time: {start_time: .4f}s")
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(
        f"Request processed time: {request.method} {request.url} - Response: {response.status_code} - Time: {process_time: .4f}s")
    return response


@app.get("/saas/{client_id}/users/")
async def read_root():
    return {"message": "Users Service Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


@app.websocket("/chat")
async def chat(websocket: WebSocket):
    await chat_service.chat(websocket)
    