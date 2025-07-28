import config.settings
import sys
import os
import logging
from fastapi.testclient import TestClient
from app.main import app  # Replace with your actual FastAPI app
from config.settings import LOGGING_CONFIG

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

client = TestClient(app)

access_token = ""

def test_login_user():
    response = client.post(
        "/saas/easyfood/users/login",
        json={
            "username": "testadmin",
            "password": "testadmin"
        }
    )
    print("response - ", response.json())
    responseJson = response.json().get("data")
    access_token = responseJson.get("access_token")
    assert access_token
    assert response.status_code == 200
    
