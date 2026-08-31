"""Transactional email, used only by the password reset flow.

Degrades the same way the push providers do: with no SMTP credentials
configured, the message is logged rather than sent, so a developer can copy the
reset link out of the console and the flow is exercisable end to end without a
mail account. What it never does is fail silently -- a send that could not
happen is always logged at WARNING.
"""

import smtplib
from email.message import EmailMessage

from src.config import settings
from src.utils.logger import get_logger, log_exception

logger = get_logger("email")


def send_password_reset(recipient: str, reset_url: str) -> bool:
    """Email a password reset link.

    Args:
        recipient: Address to send to.
        reset_url: One-time link, already carrying the reset token.

    Returns:
        True if the message was handed to an SMTP server. False when SMTP is
        not configured (the link is logged instead) or the send failed.
    """
    subject = "Reset your BeepMyDevice password"
    body = (
        "Someone asked to reset the password for this BeepMyDevice account.\n\n"
        f"{reset_url}\n\n"
        f"The link stops working in {settings.SMTP_LINK_LIFETIME_HINT}. "
        "If this wasn't you, nothing has changed and you can ignore this email."
    )

    if not settings.smtp_enabled:
        # Not an error: this is the expected state in development, and the link
        # has to reach someone for the flow to be testable.
        logger.warning(f"SMTP is not configured; password reset link for {recipient}: {reset_url}")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM_ADDRESS
    message["To"] = recipient
    message.set_content(body)

    try:
        with smtplib.SMTP(
            settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS
        ) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
    except Exception:  # pylint: disable=broad-exception-caught
        # Any SMTP failure degrades to "not sent" rather than surfacing as a
        # 500: the caller must respond identically either way.
        log_exception(logger, "Could not send the password reset email", recipient=recipient)
        return False

    logger.info(f"Password reset email sent to {recipient}")
    return True
