@echo off
echo Starting microservices...

REM Activate virtual environment

REM call dev\Scripts\activate

REM Start user-service
cd user-service
echo Starting user service...
call run.bat 8000

cd ..
cd inventory-service
echo Starting inventory service...
call run.bat 8001


cd ..
cd order-service
echo Starting order service...
call run.bat 8002

cd ..
cd table-service
echo Starting table service...
call run.bat 8002


cd ..
echo All services started.
