set PORT=%~1
start "inventory service" uvicorn app.main:app --port %PORT% --reload