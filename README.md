# saas
Saas application

1. Create a folder named saas_app
2. Clone/Checkout/Pull latest code from git hub from branch backend-dev. CMD: git clone https://github.com/srinidhinsn/saas.git -b backend-dev
3. Create virtual environment under any project using CMD: python -m venv dev
4. Load virtual environment using CMD: dev/Scripts/activate ("deactivate" command - to exit) 
5. CMD: pip install fastapi uvicorn psycopg2-binary sqlalchemy alembic passlib bcrypt python-jose setuptools pytest httpx
6. Under common-lib folder run CMD: python setup.py build
7. Under  folder run CMD: pip install ..\common-lib
8. uvicorn app.main:app --port 8000 --reload - (Used ports 8000, 8001, 8002, 8003) 
9. Copy all content in init.sql and run on pgAdmin.

   1)  item_name=item.item_name,
                              slug=item.slug,   add this in create_order routes.py 

   2) in tables table>>>>add table_type column in database 


3) class ForgotPasswordRequest(BaseModel):
    username: str


   class ResetPasswordRequest(BaseModel):
    username: str
    otp: str
    new_password: str
    confirm_password: str     changed

    4) in user entity class person ===> added clientId,createdat,updtaedat


    5) inserted client_id column in person table

    6) inventory-services added new route

    7) created forgot and reset password routes in user-service 

    8) updated login-service in user-service/routes.py

    9) common-lib ---> utils added a newfile  send_email_otp.py for generating emailOtp

    10) addPersonDetails and getPersonDetails routes added in user-services 