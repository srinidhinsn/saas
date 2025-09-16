from sqlalchemy.orm import Session
from entity.user_entity import Notification

# Predefined templates (can be stored in DB too)
NOTIFICATION_TEMPLATES = {
    "reset_password": "You reset your password recently.",
    "change_password": "You updated password recently.",
    "user_add": "You added a new user.",
    "user_delete": "You deleted an existing user.",
    "user_update": "You updated user details.",
}


def create_notification(
    db: Session,
    client_id: str,
    template_name: str,
    notification_body: str,
    type: str = "notification",
    realm: str = "food",
    is_read: bool = False,
):
    """Create and persist a new notification"""
    notif = Notification(
        client_id=client_id,
        template_name=template_name,
        notification_body=notification_body,
        type=type,
        realm=realm,
        is_read=is_read,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def generate_email_body(notif: Notification, template_body: str):
    """
    Replace placeholders in the template using notification metadata.
    Falls back gracefully if metadata is missing keys.
    """
    context = notif.notification_metadata or {}
    try:
        return template_body.format(**context)
    except KeyError:
        return template_body  # return raw template if keys missing


def get_template_body(db: Session, client_id: str, template_name: str, notif_type: str = "template"):
    """Fetch template body from NotificationTemplate table"""
    template_rec = (
        db.query(Notification)
        .filter_by(client_id=client_id, template_name=template_name, type=notif_type)
        .first()
    )
    if template_rec:
        return template_rec.template_body
    # fallback to default dict
    return NOTIFICATION_TEMPLATES.get(template_name)


def render_template(template_body: str, metadata: dict):
    """Render a template string with metadata safely"""
    try:
        return template_body.format(**metadata)
    except KeyError:
        return template_body
