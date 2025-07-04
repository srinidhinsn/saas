import pandas as pd
import os
from app.core.config import USER_FILE
from app.core.security import verify_password, get_password_hash

def load_users():
    if os.path.exists(USER_FILE):
        return pd.read_excel(USER_FILE)
    return pd.DataFrame(columns=["clientid", "username", "password", "role", "email", "phone"])

def save_users(df: pd.DataFrame):
    df.to_excel(USER_FILE, index=False)

def get_clientid(clientid: str) -> pd.DataFrame:
    users_df = load_users()
    return users_df[users_df["clientid"] == clientid]

def get_user(username: str) -> pd.DataFrame:
    users_df = load_users()
    return users_df[users_df["username"] == username]

def get_user_phone(clientid: str) -> str:
    user = get_clientid(clientid)
    if user.empty:
        return None
    return user.iloc[0]["phone"]

def get_user_email(clientid: str) -> str:
    user = get_clientid(clientid)
    if user.empty:
        return None
    return user.iloc[0]["email"]

def get_user_password(clientid: str) -> str:
    user = get_clientid(clientid)
    if user.empty:
        return None
    return user.iloc[0]["password"]

def get_user_role(clientid: str) -> str:
    user = get_clientid(clientid)
    if user.empty:
        return None
    return user.iloc[0]["role"]

def post_new_password(df, clientid: str, new_password: str):
    df.loc[df["clientid"] == clientid, "password"] = get_password_hash(new_password)

def get_all_clientids() -> list:
    df = load_users()
    return df['clientid'].values
