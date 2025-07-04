from fastapi import APIRouter
from app.models.schemas import User, LoginInput, ForgotPasswordInput, ResetPassword, OTPVerifyRequest
from app.services import user_service
from app.utils.helpers import load_users

router = APIRouter()

@router.post("/register")
def register(user: User):
    return user_service.register_user(user)

@router.post("/login")
def login(data: LoginInput):
    return user_service.login_user(data)

@router.get("/usernames")
def get_usernames(clientid: str, role: str):
    df = load_users()
    users = df[(df["clientid"] == clientid) & (df["role"].str.lower() == role.lower())]
    usernames = users["username"].tolist()
    return {"usernames": usernames}

# @router.get("/get-usernames")
# def get_usernames(clientid: str, role: str):
#     df = load_users()
#     users = df[(df["clientid"] == clientid) & (df["role"].str.lower() == role.lower())]
#     usernames = users["username"].tolist()
#     return {"usernames": usernames}

# @router.get("/get-usernames")
# def get_usernames(clientid: str):
#     df = load_users()
#     users = df[df["role"] == role]["clientid"].tolist()
#     return users

@router.get("/get-usernames")
def get_usernames(role: str, clientid: str):
    df = load_users()
    df = df[df["clientid"].str.lower() == clientid.lower()]
    df["role"] = df["role"].str.lower()  # normalize for comparison
    return df[df["role"] == role.lower()]["username"].tolist()

@router.get("/get-usernames-by-clientid-role")
def get_usernames_by_clientid_and_role(clientid: str, role: str):
    df = load_users()
    filtered = df[(df["clientid"] == clientid) & (df["role"].str.lower() == role.lower())]
    return filtered["username"].tolist()


# @router.post("/forgot-password")
# def forgot_password(data: ForgotPasswordInput):
#     return user_service.send_otp(data.clientid, data.method)

# @router.post("/reset-password")
# def reset_password(data: ResetPassword):
#     return user_service.reset_password(data)

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordInput):
    return user_service.send_otp(data.clientid, data.username, data.role, data.method)

@router.post("/reset-password")
def reset_password(data: ResetPassword):
    return user_service.reset_password(data)


@router.post("/verify-otp")
def verify_otp(request: OTPVerifyRequest):
    result = user_service.validate_otp(request.username, request.otp)
    return {"message": result}

@router.post("/logout")
def logout():
    return {"status": "success", "message": "Logged out successfully"}

