set PORT=%~1
start "user service" uvicorn app.main:app --port %PORT% --reload