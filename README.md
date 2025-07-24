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