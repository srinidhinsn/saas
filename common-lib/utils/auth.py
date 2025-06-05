from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from models.saas_context import SaasContext, saasContext
from models.user_model import PageDefinitionModel
from models.user_entity import PageDefinition
from database.postgres import get_db
from sqlalchemy.orm import Session

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

def verify_token(req: Request = None, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
        
        page_definitions = get_page_definition(roles, urlModule, clientId, db)

        # Convert list of PageDefinition entities to PageDefinitionModel instances
        pageDefinitionModels = PageDefinition.copyToModels(page_definitions)
        
        '''
        pageDefinitionModels = [PageDefinitionModel(**page_def.__dict__) for page_def in page_definitions]

        # Remove SQLAlchemy metadata (_sa_instance_state)
        for model in pageDefinitionModels:
            model.__dict__.pop("_sa_instance_state", None)
        '''    
        print("pageDefinitionModels - ", pageDefinitionModels)
            
        if (grants.index(urlModule) >= 0 and urlClientId == clientId):
            screenId = get_screen_id(pageDefinitionModels, urlOperation)
            print ("screenId - ", screenId)
            
            if (screenId == "accessRestricted"):
                raise HTTPException(status_code=403, detail="Restricted Access. Please contact administrator.")

            context = SaasContext(clientId, urlModule, urlOperation, str(payload.get("userId")), roles, grants, screenId)
            saasContext.set(context)

        if context is None:
            raise HTTPException(status_code=403, detail="Restricted Access. Please contact administrator.")
        return context
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as e:
        print(f"Other JWT error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Token")
    except ValueError:
        print(f"User do not have access to ", urlModule)
        raise HTTPException(status_code=403, detail="Restricted Grants. Please contact administrator.")


def get_screen_id(page_definitions, urlOperation):    
    for page_def in page_definitions:
        if urlOperation in page_def.operations and page_def.loadType == "include":
            return page_def.screenId
        if urlOperation not in page_def.operations and page_def.loadType == "exclude":
            return page_def.screenId
    return "accessRestricted"


def get_page_definition(roles: list[str], module: str, clientId: str, db: Session):
    page_definitions = db.query(PageDefinition).filter(
                            PageDefinition.role.in_(roles),  # Multiple roles
                            PageDefinition.module == module,  # Matching module
                            PageDefinition.clientId == clientId  # Matching client ID
                        ).all()

    return page_definitions  # Returning the fetched results
