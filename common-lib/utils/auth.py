from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from models.saas_context import SaasContext, saasContext

SECRET_KEY = "nsn"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(req: Request = None, token: str = Depends(oauth2_scheme)):
    try:
        print ("token - ", token)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print ("Payload - ", payload)

        clientId = payload.get("clientId")

        path = req.url.path
        path_parts = path.split("/")
        urlClientId = path_parts[2]
        urlModule = path_parts[3]
        urlOperation = path_parts[4]
        roles = payload["roles"]
        grants = payload["grants"]
        

        if (grants.index(urlModule) >= 0 and urlClientId == clientId):
            context = SaasContext(clientId, urlModule, urlOperation, str(payload.get("userId")), roles, grants)
            saasContext.set(context)
        
        if context is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return context
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as e:
        print(f"Other JWT error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Token")
    except ValueError:
            print(f"User do not have access to ", urlModule)