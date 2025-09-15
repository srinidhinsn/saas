from datetime import datetime
from sqlalchemy.orm import Session
from entity.user_entity import Notification, NotificationTemplate

NOTIFICATION_TEMPLATES = {
    "reset_password": "{username} ({role}) reset password recently.",
    "change_password": "{username} ({role}) updated password recently.",
    "user_add": "{username} ({role}) added a new user.",
    "user_delete": "{username} ({role}) deleted an existing user.",
    "user_update": "{username} ({role}) updated user details.",
}


def create_notification(
    db: Session,
    client_id: str,
    username: str,
    template_name: str,
    notification_body: str,
    notification_metadata: dict = None,
    type: str = "notification",
    realm: str = "food",
    ref_id: str = None,
    is_read: bool = False,
    is_deleted: bool = False,
    read_by: str = None,
):
    notif = Notification(
        client_id=client_id,
        username=username,
        template_name=template_name,
        notification_body=notification_body,
        notification_metadata=notification_metadata,
        type=type,
        realm=realm,
        ref_id=ref_id,
        is_read=is_read,
        is_deleted=is_deleted,
        read_by=read_by,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def generate_email_body(notif: Notification, template_body: str):
    """
    Replace placeholders in the template using notification metadata.
    :param notif: Notification object
    :param template_body: String template with placeholders
    """
    context = notif.notification_metadata or {}
    return template_body.format(**context)


def get_template_body(db, client_id, template_name, notif_type='template'):
    template_rec = db.query(NotificationTemplate).filter_by(
        client_id=client_id,
        template_name=template_name,
        type=notif_type
    ).first()
    if template_rec:
        return template_rec.template_body
    return None


def render_template(template_body, metadata):
    return template_body.format(**metadata)
