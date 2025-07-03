from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as table_router

import logging, time
from config.settings import LOGGING_CONFIG

app = FastAPI()

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

app.include_router(table_router, prefix="/saas/{client_id}/tables")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"Request start time: {request.method} {request.url} - Request: {request} - Time: {start_time: .4f}s")
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Request processed time: {request.method} {request.url} - Response: {response.status_code} - Time: {process_time: .4f}s")
    return response

@app.get("/saas/{client_id}/tables/")
async def read_root():
    return {"message": "tables Service is Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)





