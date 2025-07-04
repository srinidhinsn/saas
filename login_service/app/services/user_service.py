import random
from fastapi import HTTPException
from app.utils.helpers import load_users, save_users, get_clientid, get_user_phone, get_user_email, get_user_password, post_new_password, get_all_clientids
from app.core.security import verify_password, get_password_hash
import os
import pandas as pd
from datetime import datetime, timedelta

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client

from dotenv import load_dotenv

load_dotenv(dotenv_path="login_service/.env")

EMAIL_ADDRESS       = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD      = os.getenv("EMAIL_PASSWORD")
TWILIO_ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
USER_FILE           = os.getenv("EXCEL_PATH", "data/users.xlsx")

client              = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
otp_cache           = {}
otp_timestamps      = {}

import pandas as pd
from datetime import datetime

def generate_client_id(users_df):
    today = datetime.today()
    
    month_letter = chr(64 + today.month)  # 5 → E
    year_suffix  = str(today.year)[-2:]    # 2025 → 25
    day          = f"{today.day:02d}"              # 7 → 07, 20 → 20
    prefix       = f"{month_letter}{year_suffix}{day}"  # E2520

    # Step 4: Filter existing client IDs that match today's prefix
    existing_ids = users_df["clientid"].dropna().astype(str)
    today_ids    = existing_ids[existing_ids.str.startswith(prefix)]

    # Step 5: Extract highest serial number
    if not today_ids.empty:
        max_serial = max(int(id[-4:]) for id in today_ids)  # A1001 → 1001
    else:
        max_serial = 1000  # Start from A1001

    next_serial = max_serial + 1
    client_id   = f"{prefix}A{next_serial:04d}"  # E2520A1001, E2520A1002...

    return client_id

# def register_user(user):
#     if user.clientid in get_all_clientids():
#         raise HTTPException(status_code=400, detail="Client ID already exists")
#     hashed_pw = get_password_hash(user.password)
#     users_df = load_users()
#     new_user = {'clientid': generate_client_id(users_df),
#         'username': user.username,
#         'password': hashed_pw,
#         'role': user.role,
#         'email': user.email,
#         'phone': user.phone}
#     users_df = pd.concat([users_df, pd.DataFrame([new_user])], ignore_index=True)
#     save_users(users_df)
#     return {"message": "User registered successfully"}

# keep this revised 1

# def register_user(user):
#     users_df = load_users()

#     if not user.clientid:
#         # If clientid not provided → this is first user → must be admin
#         if user.role.lower() != "admin":
#             raise HTTPException(status_code=400, detail="First user must be an admin")
        
#         # Generate new clientid
#         new_clientid = generate_client_id(users_df)
#         user.clientid = new_clientid
#     else:
#         # clientid is provided → should already exist
#         if user.clientid not in users_df["clientid"].values:
#             raise HTTPException(status_code=404, detail="Provided Client ID does not exist")

#     # Check if username already exists under same clientid
#     if not users_df[
#         (users_df["clientid"] == user.clientid) & (users_df["username"] == user.username)
#     ].empty:
#         raise HTTPException(status_code=400, detail="Username already exists under this client ID")

#     # Hash password
#     hashed_pw = get_password_hash(user.password)

#     # Register the user
#     new_user = {
#         "clientid": user.clientid,
#         "username": user.username,
#         "password": hashed_pw,
#         "role": user.role.lower(),
#         "email": user.email,
#         "phone": user.phone
#     }
#     users_df = pd.concat([users_df, pd.DataFrame([new_user])], ignore_index=True)
#     save_users(users_df)

#     return {
#         "message": "User registered successfully",
#         "clientid": user.clientid
#     }

def register_user(user):
    users_df = load_users()

    if not user.clientid:
        # No clientid provided → must be admin
        if user.role.lower() != "admin":
            raise HTTPException(status_code=400, detail="First user must be an admin")
        
        # Generate new clientid
        user.clientid = generate_client_id(users_df)

    else:
        # clientid is provided → must already exist
        if user.clientid not in users_df["clientid"].values:
            raise HTTPException(status_code=404, detail="Provided Client ID does not exist")

        client_users = users_df[users_df["clientid"] == user.clientid]
        role_count = (client_users["role"].str.lower() == user.role.lower()).sum()

        if user.role.lower() == "admin":
            if role_count >= 1:
                raise HTTPException(status_code=400, detail="Denied: Only one admin allowed per client ID")
        else:
            if role_count >= 2:
                raise HTTPException(status_code=400, detail=f"Denied: Only two users allowed for role '{user.role}' under this client ID")

    # Check if username already exists under same clientid
    if not users_df[
        (users_df["clientid"] == user.clientid) & (users_df["username"] == user.username)
    ].empty:
        raise HTTPException(status_code=400, detail="Denied: Username already exists under this client ID")

    # Hash password
    hashed_pw = get_password_hash(user.password)

    # Add new user
    new_user = {
        "clientid": user.clientid,
        "username": user.username,
        "password": hashed_pw,
        "role": user.role.lower(),
        "email": user.email,
        "phone": user.phone
    }

    users_df = pd.concat([users_df, pd.DataFrame([new_user])], ignore_index=True)
    save_users(users_df)

    return {
        "message": "User registered successfully",
        "clientid": user.clientid
    }


# def login_user(data):

#     user_row = get_clientid(data.clientid)

#     if user_row.empty or not verify_password(data.password, get_user_password(data.clientid)):
#         raise HTTPException(status_code=401, detail="Invalid client ID or password")
#     return {"message": "Login successful"}

# Keep this revised 2
# def login_user(data):
#     user_row = get_clientid(data.clientid)

#     if user_row.empty:
#         raise HTTPException(status_code=401, detail="Invalid client ID")

#     # Filter users with correct password
#     matched_users = user_row[
#         user_row["password"].apply(lambda x: verify_password(data.password, x))
#     ]

#     if matched_users.empty:
#         raise HTTPException(status_code=401, detail="Invalid password")

#     # Optional: If role is supplied and needs verification
#     if hasattr(data, 'role') and data.role:
#         matched_users = matched_users[
#             matched_users["role"].str.lower() == data.role.lower()
#         ]
#         if matched_users.empty:
#             raise HTTPException(status_code=401, detail="Role mismatch or unauthorized")

#     user = matched_users.iloc[0]

#     return {
#         "message": "Login successful",
#         "clientid": user["clientid"],
#         "username": user["username"],
#         "role": user["role"]
#     }

def login_user(data):
    user_row = get_clientid(data.clientid)

    if user_row.empty:
        raise HTTPException(status_code=401, detail="Invalid client ID")

    # Filter by role and username
    matched_user = user_row[
        (user_row["role"].str.lower() == data.role.lower()) &
        (user_row["username"].str.lower() == data.username.lower())
    ]

    if matched_user.empty:
        raise HTTPException(status_code=401, detail="No user found with this role and username")

    # Validate password
    if not verify_password(data.password, matched_user.iloc[0]["password"]):
        raise HTTPException(status_code=401, detail="Invalid password")

    user = matched_user.iloc[0]
    return {
        "message": "Login successful",
        "clientid": user["clientid"],
        "username": user["username"],
        "role": user["role"]
    }



def send_otp_email(clientid, recipient_email, otp):
    subject        = "Chariot Consultancy Verification Code"
    body           = f"""\
                        Dear {clientid},

                        Your OTP code is: {otp}

                        If you didn't request this, please ignore this email.

                        Thanks,
                        Chariot Consultancy Team
                        """

    msg            = MIMEMultipart()
    msg["From"]    = EMAIL_ADDRESS
    msg["To"]      = recipient_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.sendmail(EMAIL_ADDRESS, recipient_email, msg.as_string())
        server.quit()
        print("OTP email sent successfully.")
        return True
    except Exception as e:
        print("Error sending email:", e)
        return False
    
def send_sms_otp(mobile_number, otp):
    message = client.messages.create(
        body=f"Your OTP is: {otp}",
        from_=TWILIO_PHONE_NUMBER,
        to=mobile_number
    )
    print("SMS sent:", message.sid)

def validate_otp(clientid, input_otp):
    if clientid not in otp_cache:
        return "OTP not requested or already verified."

    stored_otp = otp_cache[clientid]
    sent_time  = otp_timestamps.get(clientid, datetime.now())

    if datetime.now() - sent_time > timedelta(minutes=1.5):
        del otp_cache[clientid]
        del otp_timestamps[clientid]
        return "OTP expired. Please request a new one."

    if input_otp == stored_otp:
        del otp_cache[clientid]
        del otp_timestamps[clientid]
        return "OTP verified successfully."
    
    return "Invalid OTP."

# def send_otp(clientid, method):

#     user = get_clientid(clientid)
#     if user.empty:
#         raise HTTPException(status_code=404, detail="User not found")
#     otp = str(random.randint(100000, 999999))

#     otp_cache[clientid] = otp
#     otp_timestamps[clientid] = datetime.now()

#     if method == "sms":

#         mobile_number = get_user_phone(clientid)
#         mobile_number = "+91" + str(mobile_number)
#         if not mobile_number:
#             raise HTTPException(status_code=400, detail="Phone number not provided")
#         send_sms_otp(mobile_number, otp)
#         print(f"SMS OTP to {clientid}: {otp}")
#         print(f"OTP sent at: {otp_timestamps[clientid]}")

#     elif method == "email":
#         recipient_email = get_user_email(clientid)
#         if not recipient_email:
#             raise HTTPException(status_code=400, detail="Email not provided")
#         send_otp_email(clientid, recipient_email, otp)
#         print(f"Email OTP to {clientid}: {otp}")
#         print(f"OTP sent at: {otp_timestamps[clientid]}")

#     else:
#         raise HTTPException(status_code=400, detail="Invalid method")
    
#     return {"message": "OTP sent successfully"}

def send_otp(clientid, username, role, method):
    df = load_users()

    user = df[
        (df["clientid"] == clientid) &
        (df["username"] == username) &
        (df["role"] == role)
    ]
    if user.empty:
        raise HTTPException(status_code=404, detail="User not found")

    otp = str(random.randint(100000, 999999))
    key = (clientid, username, role)

    otp_cache[key] = otp
    otp_timestamps[key] = datetime.now()

    if method == "sms":
        phone = user.iloc[0]["phone"]
        if not phone:
            raise HTTPException(status_code=400, detail="Phone number not provided")
        send_sms_otp("+91" + str(phone), otp)
        print(f"SMS OTP to {clientid}: {otp}")
        print(f"OTP sent at: {otp_timestamps[key]}")

    elif method == "email":
        email = user.iloc[0]["email"]
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided")
        send_otp_email(clientid, email, otp)
        print(f"Email OTP to {clientid}: {otp}")
        print(f"OTP sent at: {otp_timestamps[key]}")

    else:
        raise HTTPException(status_code=400, detail="Invalid method")

    return {"message": "OTP sent successfully"}


# def reset_password(data):

#     user = get_clientid(data.clientid)

#     if user.empty:
#         raise HTTPException(status_code=404, detail="User not found")
    
#     result = validate_otp(data.clientid, data.otp)
#     if result != "OTP verified successfully.":
#         raise HTTPException(status_code=400, detail=result)

#     # OTP is valid and not expired, so proceed
#     df = load_users()
#     post_new_password(df, clientid=data.clientid, new_password=data.new_password)
#     save_users(df)

#     return {"message": "Password reset successful"}

def reset_password(data):
    key = (data.clientid, data.username, data.role)

    if key not in otp_cache:
        raise HTTPException(status_code=400, detail="No OTP request found for this user")

    if otp_cache[key] != data.otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    if (datetime.now() - otp_timestamps[key]).seconds > 300:
        del otp_cache[key]
        raise HTTPException(status_code=400, detail="OTP expired")

    df = load_users()
    df.loc[
        (df["clientid"] == data.clientid) &
        (df["username"] == data.username) &
        (df["role"] == data.role),
        "password"
    ] = get_password_hash(data.new_password)

    save_users(df)
    del otp_cache[key]
    del otp_timestamps[key]

    return {"message": "Password reset successful"}




