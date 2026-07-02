from fastapi import HTTPException
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from entity.user_entity import User
from entity.client_entity import Client
from utils.auth import (SECRET_KEY,ALGORITHM,create_access_token)

def refresh_access_token(refresh_token: str, db: Session):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Gets user_id from token
        user_id = payload.get("sub") or payload.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID missing in token")
        
        # Looks up user from database
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Query the Client to get realm
        client = db.query(Client).filter(Client.id == user.client_id).first()
        if not client:
            raise HTTPException(status_code=401, detail="Client not found")
        
        client_model = Client.copyToModel(client)
        
        # Creates new access token with all claims
        access_token = create_access_token({
            "user_id": str(user.id),
            "roles": user.roles,
            "client_id": user.client_id,
            "grants": user.grants,
            "realm": client_model.realm  
        })
        
        return {"access_token": access_token, "token_type": "bearer"}
    
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
