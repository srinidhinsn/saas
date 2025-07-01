from apscheduler.schedulers.background import BackgroundScheduler
from datetime import date, timedelta
from database import SessionLocal
import models


def check_expiring_services():
    db = SessionLocal()
    try:
        soon = date.today() + timedelta(days=3)
        expiring = db.query(models.ClientService).filter(
            models.ClientService.end_date == soon).all()
        for s in expiring:
            print(
                f"Reminder: Service for client {s.client_id} is expiring on {s.end_date}")
            # You can send an email or notification here
    finally:
        db.close()


def start():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_expiring_services, 'interval', days=1)
    scheduler.start()
