from datetime import datetime
from sqlalchemy.orm import Session
from entity.user_entity import Notification

NOTIFICATION_TEMPLATES = {
    "reset_password": "{username} ({role}) reset password recently.",
    "change_password": "{username} ({role}) updated password recently.",
    "user_add": "{username} ({role}) added a new user.",
    "user_delete": "{username} ({role}) deleted an existing user.",
    "user_update": "{username} ({role}) updated user details.",
}


def create_notifications_from_db(
    db: Session,
    client_id: str,
    username: str,
    template_name: str,
    metadata: dict = None,
    template_body: str = None
):
    """
    Create and store a notification in DB with dynamic template.
    """
    if metadata is None:
        metadata = {}

    # Use the template from NOTIFICATION_TEMPLATES if template_body not provided
    if not template_body:
        template_body = NOTIFICATION_TEMPLATES.get(
            template_name, "{username} performed an action.")

    try:
        notification_text = template_body.format(**metadata)
    except KeyError as e:
        # Fill missing metadata keys with 'UNKNOWN'
        missing_key = str(e).strip("'")
        metadata[missing_key] = "UNKNOWN"
        notification_text = template_body.format(**metadata)

    notif = Notification(
        client_id=client_id,
        username=username,
        notification_body=notification_text,
        notification_metadata=metadata  # store actual metadata
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
