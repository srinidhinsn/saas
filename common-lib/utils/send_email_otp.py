from email.mime.text import MIMEText
import smtplib
import random


otp_store = {}


def otpEmailService(to_email: str, otp: str) -> bool:
    try:
        senderEmail = "magizhchisk@gmail.com"
        gmailAppPassword = "avqkjxqzjsrnqims"

        # MIMEText is used to format the body of the email
        msg = MIMEText(f"Your OTP is {otp}.", "plain")
        msg["Subject"] = "Password Reset OTP"
        msg["From"] = senderEmail
        msg["To"] = to_email

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(senderEmail, gmailAppPassword)
            server.send_message(msg)  # simpler than sendmail()

        return True
    except Exception as e:
        print("Error sending email:", e)
        return False
