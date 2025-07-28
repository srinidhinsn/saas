
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes as report_routes

app = FastAPI(
    title="Report Service",
    version="1.0.0",
    description="Handles report generation and real-time dashboard for multi-tenant SaaS app"
)

# Enable CORS (allow all for testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update to specific origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route structure: /saas/{client_id}/report/*
app.include_router(report_routes.router, prefix="/saas/{client_id}/reports", tags=["Report Service"])

# Optional: root for sanity check
@app.get("/")
def read_root():
    return {"message": "Report service is up and running"}


