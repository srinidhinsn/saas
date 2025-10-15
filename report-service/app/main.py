
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import routes as report_routes

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


@app.get('/')
def root():
    return {"Report Service":  "Running on 8004"}


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



# Optional: root for sanity check
@app.get("/")
async def read_root():
    return {"message": "Report service is up and running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)

