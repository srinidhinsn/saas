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

SECRET_KEY                  = "nsn"
ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context                 = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme               = OAuth2PasswordBearer(tokenUrl="login")

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
    context = None
    try:
        print ("token - ", token)
        payload    = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print ("Payload - ", payload)

        client_id  = payload.get("client_id")
        path       = req.url.path
        path_parts = path.split("/")

        if len(path_parts) < 4:
            raise HTTPException(status_code=400, detail="Invalid URL format")

        url_client_id = path_parts[2]
        urlModule     = path_parts[3]
        urlOperation  = path_parts[4]

        roles         = payload["roles"]
        grants        = payload["grants"]
        
        page_definitions     = get_page_definition(roles, urlModule, client_id, db)

        # Convert list of PageDefinition entities to PageDefinitionModel instances
        pageDefinitionModels = PageDefinition.copyToModels(page_definitions)
        
        '''
        pageDefinitionModels = [PageDefinitionModel(**page_def.__dict__) for page_def in page_definitions]

        # Remove SQLAlchemy metadata (_sa_instance_state)
        for model in pageDefinitionModels:
            model.__dict__.pop("_sa_instance_state", None)
        '''    

        print("pageDefinitionModels - ", pageDefinitionModels)
            
        if (grants.index(urlModule) >= 0 and url_client_id == client_id):
            screenId = get_screen_id(pageDefinitionModels, urlOperation)
            print ("screenId - ", screenId)
            
            if (screenId == "accessRestricted"):
                raise HTTPException(status_code=403, detail="Restricted Access. Please contact administrator.")

            # context = SaasContext(client_id, urlModule, urlOperation, str(payload.get("userId")), roles, grants, screenId)
            # saasContext.set(context)

            context = SaasContext(
                client_id=client_id,
                module=urlModule,
                operation=urlOperation,
                userId=str(payload.get("userId")),
                roles=roles,
                grants=grants,
                screenId=screenId
            )
            saasContext.set(context)

        print("🔍 screenId in context:", context.screenId)


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
    
# def verify_token_new(
#     req: Request = None,
#     token: str = Depends(oauth2_scheme),
#     db: Session = Depends(get_db)
# ):
#     print("🔐 verify_token called")
#     try:
#         print("🔐 Raw token -", token)
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         print("✅ Decoded payload:", payload)

#         client_id = payload.get("client_id")
#         if not client_id:
#             raise HTTPException(status_code=400, detail="client_id missing in token")

#         path = req.url.path
#         print("🌐 Full URL path:", path)

#         path_parts = path.strip("/").split("/")
#         print("📂 Path parts:", path_parts)

#         if len(path_parts) < 3:
#             raise HTTPException(status_code=400, detail="Invalid URL format")

#         url_client_id = path_parts[1]
#         url_module    = path_parts[2]
#         url_operation = path_parts[3] if len(path_parts) > 3 else "default"

#         print("🔎 URL client_id:", url_client_id)
#         print("🔎 URL module:", url_module)
#         print("🔎 URL operation:", url_operation)

#         roles  = payload.get("roles", [])
#         grants = payload.get("grants", [])

#         if url_module not in grants:
#             raise HTTPException(status_code=403, detail="Restricted Grants")

#         page_definitions = get_page_definition(roles, url_module, client_id, db)
#         page_definition_models = PageDefinition.copyToModels(page_definitions)

#         print("📄 Page Definitions:", page_definition_models)

#         screen_id = get_screen_id(page_definition_models, url_operation)
#         print("📺 Screen ID:", screen_id)

#         if screen_id == "accessRestricted":
#             raise HTTPException(status_code=403, detail="Restricted Access")

#         context = SaasContext(
#             client_id=client_id,
#             module=url_module,
#             operation=url_operation,
#             userId=str(payload.get("userId")),
#             roles=roles,
#             grants=grants,
#             screenId=screen_id
#         )

#         saasContext.set(context)
#         return context

#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=401, detail="Token expired")
#     except JWTError as e:
#         print(f"❌ JWT Error: {e}")
#         raise HTTPException(status_code=401, detail="Invalid token")
#     except ValueError as ve:
#         print(f"❌ Value Error (grants check): {ve}")
#         raise HTTPException(status_code=403, detail="Restricted Grants")
#     except Exception as e:
#         print(f"❌ UNEXPECTED ERROR:", e)
#         raise HTTPException(status_code=403, detail="Authorization failed")

def get_screen_id_old(page_definitions, urlOperation):    
    for page_def in page_definitions:
        if urlOperation in page_def.operations and page_def.loadType == "include":
            return page_def.screenId
        if urlOperation not in page_def.operations and page_def.loadType == "exclude":
            return page_def.screenId
    return "accessRestricted"

def get_screen_id(page_definitions, urlOperation):    
    for page_def in page_definitions:
        if ("ALL" in page_def.operations or urlOperation in page_def.operations) and page_def.loadType == "include":
            return page_def.screenId
        if (urlOperation not in page_def.operations and "ALL" not in page_def.operations) and page_def.loadType == "exclude":
            return page_def.screenId
    return "accessRestricted"

def get_page_definition(roles: list[str], module: str, client_id: str, db: Session):
    page_definitions = db.query(PageDefinition).filter(
                            PageDefinition.role.in_(roles),  
                            PageDefinition.module == module,  # Matching module
                            PageDefinition.client_id == client_id  # Matching client ID
                        ).all()

    return page_definitions
