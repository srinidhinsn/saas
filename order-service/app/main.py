import config.settings
from fastapi import FastAPI, Depends, Request
from sqlalchemy.orm import Session
from .api import routes
import logging, time
from config.settings import LOGGING_CONFIG


app = FastAPI()
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)
app.include_router(api.router, prefix="/saas/orders")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"Start time: {start_time: .4f}s")
    response = await call_next(request)
    logger.info(f"End time: {time.time(): .4f}s")
    process_time = time.time() - start_time
    logger.info(f"Request: {request.method} {request.url} - Response: {response.status_code} - Time: {process_time: .4f}s")
    return response

@app.get("/saas/orders/")
async def read_root():
    return {"message": "orders Service Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8003)