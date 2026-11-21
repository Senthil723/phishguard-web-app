import logging
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode

from app.core.config import Settings

logger = logging.getLogger(__name__)


def send_password_reset_email(email: str, token: str, settings: Settings) -> None:
    """Send a reset link over encrypted SMTP without exposing the token in logs."""
    link = (
        f"{settings.password_reset_frontend_url.rstrip('/')}/reset-password"
        f"#{urlencode({'token': token})}"
    )
    message = EmailMessage()
    message["Subject"] = "Reset your PhishGuard password"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        "A password reset was requested for your PhishGuard account.\n\n"
        f"Open this link within 30 minutes to set a new password:\n{link}\n\n"
        "If you did not request this, you can ignore this email."
    )

    context = ssl.create_default_context()
    if settings.smtp_use_ssl:
        client = smtplib.SMTP_SSL(
            settings.smtp_host, settings.smtp_port, timeout=10, context=context
        )
    else:
        client = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
    with client:
        if not settings.smtp_use_ssl:
            client.starttls(context=context)
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)


def send_password_reset_email_safely(email: str, token: str, settings: Settings) -> None:
    try:
        send_password_reset_email(email, token, settings)
    except Exception:
        logger.exception("Could not send a password reset email")
