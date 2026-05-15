@echo off
echo Starting all microservices...

REM ---- USER SERVICE ----
start "user-service" cmd /k "call dev\Scripts\activate && cd user-service && call run.bat 8000"

REM ---- INVENTORY SERVICE ----
start "inventory-service" cmd /k "call dev\Scripts\activate && cd inventory-service && call run.bat 8002"

REM ---- ORDER SERVICE ----
start "order-service" cmd /k "call dev\Scripts\activate && cd order-service && call run.bat 8003"

REM ---- TABLE SERVICE ----
start "table-service" cmd /k "call dev\Scripts\activate && cd table-service && call run.bat 8001"

REM ---- BILLING SERVICE ----
start "billing-service" cmd /k "call dev\Scripts\activate && cd billing-service && call run.bat 8004"

REM ---- DOCUMENT SERVICE ----
start "document-service" cmd /k "call dev\Scripts\activate && cd document-service && call run.bat 8005"

echo All services started!