import asyncio
import logging
import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger("scheduler.email")

from app.database import get_database

def _send_smtp_sync(host: str, port: int, user: str, password: str, from_email: str, to_email: str, subject: str, html_content: str) -> tuple[bool, str]:
    """Synchronous SMTP helper run inside threadpool to prevent event loop blocking."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email or user
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=10.0)
        else:
            server = smtplib.SMTP(host, port, timeout=10.0)
            server.starttls()

        if user and password:
            server.login(user, password)

        server.sendmail(from_email or user, [to_email], msg.as_string())
        server.quit()
        logger.info(f"✅ Email sent via SMTP ({host}) to {to_email}")
        return True, f"Email delivered via SMTP ({host}) to {to_email}"
    except Exception as e:
        logger.warning(f"SMTP send email error: {e}")
        return False, str(e)

async def get_email_credentials() -> tuple[str, int, str, str, str, str]:
    """Retrieve Email credentials from settings (.env) or MongoDB database."""
    host = settings.EMAIL_HOST.strip() if settings.EMAIL_HOST else ""
    port = settings.EMAIL_PORT or 587
    user = settings.EMAIL_USER.strip() if settings.EMAIL_USER else ""
    password = settings.EMAIL_PASS.strip() if settings.EMAIL_PASS else ""
    from_email = settings.EMAIL_FROM.strip() if settings.EMAIL_FROM else ""
    api_key = settings.EMAIL_API_KEY.strip() if settings.EMAIL_API_KEY else ""

    if not (api_key or (host and user and password)):
        db = get_database()
        if db is not None:
            try:
                doc = await db.app_settings.find_one({"key": "email_config"})
                if doc:
                    host = doc.get("host", host).strip()
                    port = int(doc.get("port", port))
                    user = doc.get("user", user).strip()
                    password = doc.get("pass", password).strip()
                    from_email = doc.get("fromEmail", from_email).strip()
                    api_key = doc.get("apiKey", api_key).strip()
            except Exception as e:
                logger.warning(f"Error reading Email config from DB: {e}")

    return host, port, user, password, from_email, api_key

async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """Send HTML email using Resend API if API Key configured, SMTP if credentials present, or simulation fallback."""
    if not to_email:
        return {"success": False, "provider": "none", "message": "Recipient email is missing."}

    host, port, user, password, from_email, api_key = await get_email_credentials()
    sender = from_email or user or "Scheduler <noreply@scheduler.com>"

    # 1. Try Resend API if key is present
    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": sender,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                    },
                    timeout=10.0,
                )
                if res.status_code in [200, 201, 202]:
                    logger.info(f"✅ Email sent via Resend API to {to_email}")
                    return {"success": True, "provider": "resend", "message": f"Email delivered via Resend API to {to_email}"}
                else:
                    logger.warning(f"Resend API error: {res.status_code} {res.text}")
                    return {"success": False, "provider": "resend", "message": f"Resend API error ({res.status_code}): {res.text}"}
        except Exception as e:
            logger.warning(f"Failed to send email via Resend API: {e}")

    # 2. Try SMTP if credentials present
    if host and user and password:
        success, msg_detail = await asyncio.to_thread(_send_smtp_sync, host, port, user, password, sender, to_email, subject, html_content)
        if success:
            return {"success": True, "provider": "smtp", "message": msg_detail}
        else:
            return {"success": False, "provider": "smtp", "message": f"SMTP Error ({host}): {msg_detail}"}

    # 3. Fallback Simulation (logs to console/logger)
    logger.info(f"📧 [Email Simulation] To: {to_email} | Subject: {subject}")
    return {
        "success": True,
        "provider": "simulation",
        "message": f"Simulated Email logged for {to_email}. Add your Gmail/SMTP credentials below to send live emails to real inbox.",
    }



def generate_invitation_email(organizer_name: str, title: str, description: str, date_str: str, time_str: str, location_name: str, address: str, maps_url: str, invite_link: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
        <h2 style="color: #6366f1; margin-top: 0;">You're Invited to an Appointment!</h2>
        <p style="font-size: 16px;"><strong>{organizer_name}</strong> has invited you to <strong>{title}</strong>.</p>
        <div style="background: #0f172a; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 5px 0;">📅 <strong>Date:</strong> {date_str}</p>
          <p style="margin: 5px 0;">⏰ <strong>Time:</strong> {time_str}</p>
          <p style="margin: 5px 0;">📍 <strong>Location:</strong> {location_name}</p>
          {f'<p style="margin: 5px 0; color: #94a3b8;">🏢 <strong>Address:</strong> {address}</p>' if address else ''}
          {f'<p style="margin: 5px 0; color: #38bdf8;"><a href="{description}" style="color: #38bdf8;">📝 Notes: {description}</a></p>' if description else ''}
        </div>
        {f'<p><a href="{maps_url}" style="color: #38bdf8; text-decoration: none;">🗺️ Open in Google Maps & Directions</a></p>' if maps_url else ''}
        <div style="margin-top: 30px; text-align: center;">
          <a href="{invite_link}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Respond to Invitation</a>
        </div>
      </div>
    </body>
    </html>
    """
