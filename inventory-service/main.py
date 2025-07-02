from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes

app.include_router(routes.router, prefix="/saas/{client_id}/inventory")

@app.get("/")
def root():
    return {"message": "Inventory Service is up and running!"}
