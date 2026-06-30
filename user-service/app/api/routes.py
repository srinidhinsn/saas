from fastapi import Depends, HTTPException, APIRouter, Request
from sqlalchemy.orm import Session
from database.postgres import get_db
from entity.user_entity import User, Person, PageDefinition
from entity.client_entity import Client, Address
from entity.inventory_entity import InventoryEntity
from utils.auth import hash_password, verify_password, create_access_token, verify_token, SECRET_KEY, ALGORITHM , create_refresh_token
from models.saas_context import SaasContext
from models.user_model import UserModel, ResetpasswordRequest, LoginRequest, PersonModel
from models.response_model import ResponseModel
from models.user_model import DelegatedAccessRequest
from sqlalchemy import and_, cast
from utils.send_email_otp import otpEmailService, otp_store
from utils.create_notification import get_template_body, render_template
from entity.inventory_entity import CategoryEntity
from entity.order_entity import DineinOrder
from services.chat_service import ask_restaurant_ai,ChatbotService,ChatRequest
from datetime import datetime, timedelta, time
from services.add_users import (create_user_and_person, login_user_service, get_user_perms, has_user_permission , delete_user_service , 
                                  forgot_password_service ,reset_password_service)
from services.person_service import (update_person_details_service, get_person_details_service, get_all_persons_service, 
                                       save_address_service, get_addresses_service, update_address_service, get_customer_addresses_service, set_primary_address_service,
find_or_create_customer,search_customers_service)
from services.auth_service import refresh_access_token
from jose import jwt
import uuid , os
from sqlalchemy import func
from models.client_model import AddressModel 
from utils.services import add_master_value , get_master_values ,delete_master_value
from dotenv import load_dotenv
from zoneinfo import ZoneInfo
from jose import JWTError
load_dotenv()
TIMEZONE = os.getenv("TIMEZONE", "UTC") 
router = APIRouter()
router = APIRouter()
# ================== ADD USER ==================
@router.post("/add")
async def add_user(client_id: str, userReq: UserModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    perms = get_user_perms(context, db, client_id)

    if not has_user_permission(perms, "users", "add"):
        raise HTTPException(status_code=403, detail="User add not allowed")

    return await create_user_and_person(client_id=client_id, userReq=userReq, db=db,
                                        token_realm=context.grants[0] if context.grants else None)

# ================== REGISTER USER ==================
@router.post("/register")
async def register_user(client_id: str, userReq: UserModel, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    perms = get_user_perms(context, db, client_id)

    if not has_user_permission(perms, "users", "register"):
        raise HTTPException(403, "User registration not allowed")

    token_realm = context.grants[0] if context.grants else None
    return await create_user_and_person(client_id=client_id, userReq=userReq, db=db, token_realm=token_realm)

@router.post("/login")
async def login_user(client_id: str,userReq: LoginRequest,db: Session = Depends(get_db)):
    result = login_user_service(client_id=client_id,username=userReq.username,password=userReq.password,db=db)

    return ResponseModel(screen_id=result["screen_id"],
        data={"access_token": result["access_token"],"refresh_token": result["refresh_token"],"token_type": result["token_type"]})

# ================== DELETE USER ==================
@router.delete("/delete")
async def delete_user(client_id: str,user_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    result = delete_user_service(client_id=client_id,user_id=user_id,context=context,db=db)

    return ResponseModel(screen_id=context.screen_id,data=result)

@router.get("/test")
async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context - ", context)
    print("test screen_id - ", context.screen_id)
    response = ResponseModel(screen_id="default_test", data={
                             "message": "Test Authentication Service Running in user routes"})
    return response

@router.get("/test2")
async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context2 - ", context)
    response = ResponseModel(screen_id="default_test", data={
                             "message": "Test2 Authentication Service Running in user routes"})
    return response

@router.get("/test3", include_in_schema=False)
async def test_msg(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    print("test context3 - ", context)
    response = ResponseModel(screen_id="default_test", data={
                             "message": "Test3 Authentication Service Running in user routes"})
    return response

# ================== FORGOT PASSWORD ==================
@router.post("/forgot-password")
async def forgot_password(client_id: str,req_data: ResetpasswordRequest,db: Session = Depends(get_db)):
    return await forgot_password_service(client_id,req_data,db)

# ================== RESET PASSWORD ==================
@router.post("/reset-password")
async def reset_password(client_id: str,req_data: ResetpasswordRequest,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    return await reset_password_service(client_id,req_data,context,db)

# ================== PERSON DETAILS ==================
@router.post("/person-details")
async def update_person_details(request: Request,client_id: str,person_req: PersonModel,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    body = await request.json()

    result = await update_person_details_service(client_id,person_req,body,context,db)

    return ResponseModel(screen_id=context.screen_id,data=result)

@router.get("/person-details")
async def get_person_details(client_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    result = await get_person_details_service(context,db)

    return ResponseModel(screen_id=context.screen_id,data=result)

@router.get("/notifications")
def get_notifications(client_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db),):
    return ResponseModel(screen_id=context.screen_id,data={"notifications": []})


@router.get("/persons")
async def get_all_persons(client_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    result = await get_all_persons_service(client_id,db)
    return ResponseModel(screen_id=context.screen_id,data=result)
  
@router.post("/delegate-access")
async def delegate_access(
    client_id: str,
    req: DelegatedAccessRequest,
    db: Session = Depends(get_db)
):
    # 1️⃣ Validate admin credentials
    admin = db.query(User).filter(User.username == req.admin_username).first()
    if not admin:
        raise HTTPException(
            status_code=401, detail="Invalid admin credentials")
    if not verify_password(req.admin_password, admin.hashed_password):
        raise HTTPException(
            status_code=401, detail="Invalid admin credentials")

    # 2️⃣ Validate requester exists
    requester = db.query(User).filter(User.id == req.requester_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    # 3️⃣ Combine original grants with delegated page
    original_grants = requester.grants or []
    delegated_grants = list(set(original_grants))
    print("the deegated grants", delegated_grants)

    client = db.query(Client).filter(Client.id == client_id).first()
    client_model = Client.copyToModel(client)

    # 4️⃣ Create delegated token
    expire = datetime.now(ZoneInfo(TIMEZONE)) + timedelta(minutes=1)
    payload = {
        "sub": str(requester.id),
        "roles": admin.roles,
        "client_id": requester.client_id,
        "delegated": True,
        "granted_by": str(admin.id),
        "grants": delegated_grants,
        "exp": expire,
        "realm": client_model.realm
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {"delegated_token": token, "expires_at": expire}

@router.get("/users")
async def get_users_by_client(client_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    users = db.query(User).filter(User.client_id == client_id).all()
    if not users:
        raise HTTPException(status_code=404, detail="No users found for this client")

    user_models = User.copyToModels(users)
    return ResponseModel(screen_id=context.screen_id, data={"users": user_models})

@router.get("/screens")
async def get_screens_by_role(
    client_id: str,
    role: str,
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    try:
        # ✅ Fetch screen_id, module, load_type, and operations for the given client and role
        screens = (
            db.query(
                PageDefinition.screen_id,
                PageDefinition.module,
                PageDefinition.load_type,
                PageDefinition.operations
            )
            .filter(PageDefinition.client_id == client_id, PageDefinition.role == role)
            .all()
        )

        # ✅ Convert SQLAlchemy result objects into dicts
        screen_data = [
            {
                "screen_id": s.screen_id,
                "module": s.module,
                "load_type": s.load_type,
                "operations": s.operations,
            }
            for s in screens
        ]

        # ✅ Wrap inside "data" so frontend `.data.data.screen_ids` still works
        return ResponseModel(
            screen_id=context.screen_id,
            data={"screens": screen_data}
        )

    except Exception as e:
        return ResponseModel(
            screen_id=context.screen_id,
            status="error",
            message=f"Failed to fetch screens: {str(e)}"
        )

@router.post("/screens/configure")
async def save_role_screens(
    client_id: str,
    role: str,
    payload: dict,
    db: Session = Depends(get_db),
    context: SaasContext = Depends(verify_token)
):
    try:
        screens = payload.get("accessible", [])

        if not isinstance(screens, list):
            raise ValueError(
                "Invalid payload format. Expected a list of screen objects.")

        # Delete old role-screen mappings
        db.query(PageDefinition).filter(
            PageDefinition.client_id == client_id,
            PageDefinition.role == role
        ).delete()

        # Insert new mappings with all columns
        for s in screens:
            db.add(PageDefinition(
                client_id=client_id,
                role=role,
                screen_id=s.get("screen_id"),
                module=s.get("module"),
                load_type=s.get("load_type"),
                operations=s.get("operations")
            ))

        db.commit()

        return ResponseModel(
            screen_id=context.screen_id,
            message=f"Updated screen configuration for {role}",
            data={"accessible": screens}
        )

    except Exception as e:
        db.rollback()
        return ResponseModel(
            screen_id=context.screen_id,
            status="error",
            message=f"Failed to save config: {str(e)}"
        )

# ================================= Client Table Service ==================================== #
@router.get("/realm")
async def get_clients_by_realm(client_id: str, realm: str = "", context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    query = db.query(Client)
    if realm:
        query = query.filter(Client.realm == realm)
    clients = query.all()
    client_models = [Client.copyToModel(c) for c in clients]

    return ResponseModel(screen_id=context.screen_id, data={"clients": client_models})

@router.get("/realm/ordersummary")
async def get_order_summary_by_realm(realm: str = None, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    query = db.query(DineinOrder).join(
        Client, DineinOrder.client_id == Client.id)
    if realm:
        query = query.filter(Client.realm == realm)

    total_orders = query.count()
    pending_orders = query.filter(DineinOrder.status == "pending").count()

    return ResponseModel(screen_id=context.screen_id,
                         data={"total_orders": total_orders, "pending_orders": pending_orders})

@router.get("/realms")
async def get_realms(realm: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    category = db.query(CategoryEntity).filter(CategoryEntity.id == realm).first()

    if not category:
        raise HTTPException(status_code=404,detail=f"Category with id '{realm}' not found")

    return ResponseModel(screen_id=context.screen_id,data={"realms": category.sub_categories or []})

# ========================================= Role Configurations ================================================ #
@router.get("/permissions/catalog")
def get_permissions_catalog(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    categories = (db.query(CategoryEntity).filter(
        CategoryEntity.client_id=="saas").all())
    return ResponseModel(screen_id=context.screen_id,
                         data={"modules": [{"module": c.id, "label": c.name, "operations": c.sub_categories or []}for c in categories]})

@router.get("/roles/{role}/config")
def get_role_config(client_id: str, role: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    rows = (db.query(PageDefinition).filter(PageDefinition.client_id == client_id,
                                            func.lower(PageDefinition.role) == role.lower()).all())
    config = {}
    for r in rows:
        config.setdefault(r.module, []).extend(r.operations or [])

    return ResponseModel(screen_id=context.screen_id, data={"config": config})


@router.post("/roles/{role}/config")
def save_role_config(client_id: str, role: str, payload: dict, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    role = role.strip()
    db.query(PageDefinition).filter(PageDefinition.client_id == client_id,PageDefinition.role == role).delete()
    modules = payload.get("modules", {})

    for module, ops in modules.items():
        if not ops:
            continue

        db.add(PageDefinition(client_id=client_id, role=role, module=module,
               screen_id=f"default_{module}", load_type="include", operations=ops))
    db.commit()
    return ResponseModel(screen_id=context.screen_id, message="Role configuration saved")


@router.post("/address")
async def save_address(client_id: str,add: AddressModel,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    result = await save_address_service(add,context,db)

    return ResponseModel(screen_id=context.screen_id,data=result)

@router.get("/address")
async def get_addresses(client_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    result = await get_addresses_service(context,db)

    return ResponseModel(screen_id=context.screen_id,data=result)

@router.post("/address/{address_id}/set-primary")
async def set_primary(address_id: int, client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    result = await set_primary_address_service(address_id, context, db)
    return ResponseModel(screen_id=context.screen_id, data=result)

@router.get("/roles")
def get_roles(client_id: str, category_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    data = get_master_values(db, client_id, category_id)

    return ResponseModel(screen_id=context.screen_id,status="success",message="Roles fetched",data=data)

@router.post("/roles")
def add_role(client_id: str, category_id: str, value: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    data = add_master_value(db, client_id, category_id, value)

    return ResponseModel(screen_id=context.screen_id,status="success",message="Role added",data=data)

@router.delete("/roles")
def delete_role(client_id: str, category_id: str, value: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    data = delete_master_value(db, client_id, category_id, value)

    return ResponseModel(screen_id=context.screen_id,status="success",message="Role deleted",data=data)

@router.get("/customer/{customer_id}/addresses")
async def get_customer_addresses(client_id: str,customer_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    result = await get_customer_addresses_service(customer_id,db)

    return ResponseModel(screen_id=context.screen_id,data=result)

@router.put("/address/{address_id}")
async def update_address(address_id: int,add: AddressModel,client_id: str,context: SaasContext = Depends(verify_token),db: Session = Depends(get_db)):
    result = await update_address_service(address_id,add,db)

    return ResponseModel(screen_id=context.screen_id,data=result)

@router.post("/refresh")
async def refresh_token(req: Request, db: Session = Depends(get_db)):
    body = await req.json()
    result = refresh_access_token(body.get("refresh_token"), db)
    return ResponseModel(data=result)
@router.post("/customer/find_or_create")
async def find_or_create_customer(client_id: str, payload: dict, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    result = await find_or_create_customer_service(
        email=payload.get("contact_email"),
        phone=payload.get("contact_phone"),
        shipping_address=payload.get("shipping_address"),
        contact_name=payload.get("customer_id"),
        db=db,
    )
    return ResponseModel(screen_id=context.screen_id, data=result)

@router.get("/customer/search")
async def search_customers(client_id: str, q: str = "", context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    result = await search_customers_service(q, db)
    return ResponseModel(screen_id=context.screen_id, data={"customers": result})

@router.post("/chat")
async def chat(client_id: str,req: ChatRequest,db: Session = Depends(get_db)):
    inventory_items = db.query(InventoryEntity).filter(InventoryEntity.client_id == client_id).all()
    categories = db.query(CategoryEntity).filter(CategoryEntity.client_id == client_id).all()

    orders = db.query(DineinOrder).filter(DineinOrder.client_id == client_id).all()

    menu_context = []
    menu_unique_items = set()

    for category in categories:
        category_items = [
            item for item in inventory_items
            if item.category_id == category.id
        ]

        item_lines = []

        for item in category_items:
            if not item.name:
                continue

            clean_name = item.name.strip()

            # Remove duplicate menu items
            if clean_name.lower() in menu_unique_items:
                continue

            menu_unique_items.add(clean_name.lower())
            item_lines.append(f"{clean_name} - ₹{item.price}")

        # Add category only if items exist
        if item_lines:
            menu_context.append(f"{category.name}: {', '.join(item_lines)}")
          
    # ================= BUILD ORDER ITEMS CONTEXT =================
    ordered_items_context = []

    total_orders = len(orders)

    for order in orders:
        order_items = []
        for item in order.items:

            if not item.item_name:
                continue

            order_items.append(f"{item.item_name} x {item.quantity}")

        if order_items:
            ordered_items_context.append(
                f"Order #{order.id}: {', '.join(order_items)}"
            )

    # ================= FINAL CONTEXT =================

    realtime_context = f"""
    MENU:

    {'\n'.join(menu_context)}

    TOTAL MENU ITEMS:
    {len(menu_unique_items)}

    TOTAL ORDERS:
    {total_orders}

    ORDER ITEMS:

    {'\n'.join(ordered_items_context)}
    """
    # ================= ASK AI =================
    reply = await ask_restaurant_ai(req.message,realtime_context)

    return {"reply": reply}
