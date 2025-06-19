#from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as user_router
from fastapi import FastAPI

app = FastAPI()

app.include_router(user_router, prefix="/saas/{client_id}")