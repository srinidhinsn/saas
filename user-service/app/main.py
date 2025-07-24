import config.settings
from fastapi import FastAPI, Depends, Request, Header, HTTPException
from sqlalchemy.orm import Session
from .api import routes
import logging
import time
from config.settings import LOGGING_CONFIG
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

app.include_router(routes.router, prefix="/saas/{client_id}/users")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    uvicorn.run(app, host="127.0.0.1", port=8000)
