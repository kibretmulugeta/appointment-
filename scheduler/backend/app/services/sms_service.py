import re
import logging
import httpx
from app.config import settings
from app.database import get_database

logger = logging.getLogger("scheduler.sms")

def format_phone_e164(phone: str) -> str:
    """Format phone number to E.164 international standard (+1234567890)."""
    if not phone:
        return ""
    cleaned = re.sub(r'[^\d+]', '', phone.strip())
    # Handle Ethiopian local 10-digit format (09xxxxxxxx or 07xxxxxxxx) -> +2519xxxxxxxx
    if re.match(r'^0[97]\d{8}$', cleaned):
        cleaned = '+251' + cleaned[1:]
    elif not cleaned.startswith('+'):
        cleaned = '+' + cleaned
    return cleaned

async def get_twilio_credentials() -> tuple[str, str, str]:
    """Retrieve Twilio credentials from settings (.env) or MongoDB database."""
    sid = settings.TWILIO_ACCOUNT_SID.strip() if settings.TWILIO_ACCOUNT_SID else ""
    token = settings.TWILIO_AUTH_TOKEN.strip() if settings.TWILIO_AUTH_TOKEN else ""
    phone = settings.TWILIO_PHONE_NUMBER.strip() if settings.TWILIO_PHONE_NUMBER else ""

    if not (sid and token and phone):
        db = get_database()
        if db is not None:
            try:
                doc = await db.app_settings.find_one({"key": "sms_config"})
                if doc and doc.get("accountSid") and doc.get("authToken") and doc.get("phoneNumber"):
                    sid = doc["accountSid"].strip()
                    token = doc["authToken"].strip()
                    phone = doc["phoneNumber"].strip()
            except Exception as e:
                logger.warning(f"Error reading SMS config from DB: {e}")

    return sid, token, phone

async def send_sms(to_phone: str, message_body: str) -> dict:
    """Send SMS notification using Twilio API if credentials configured, or simulated fallback."""
    if not to_phone:
        return {"success": False, "provider": "none", "message": "Recipient phone number is missing."}

    formatted_phone = format_phone_e164(to_phone)
    sid, token, phone_from = await get_twilio_credentials()

    if sid and token and phone_from:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    url,
                    auth=(sid, token),
                    data={
                        "From": phone_from,
                        "To": formatted_phone,
                        "Body": message_body,
                    },
                    timeout=10.0,
                )
                if res.status_code in [200, 201]:
                    logger.info(f"✅ Twilio SMS sent to {formatted_phone}")
                    return {"success": True, "provider": "twilio", "message": f"Twilio SMS sent successfully to {formatted_phone}"}
                else:
                    error_msg = res.text
                    logger.warning(f"Twilio SMS error ({res.status_code}): {error_msg}")
                    return {"success": False, "provider": "twilio", "message": f"Twilio error ({res.status_code}): {error_msg}"}
        except Exception as e:
            logger.warning(f"Failed to send Twilio SMS: {e}")
            return {"success": False, "provider": "twilio", "message": f"Network/Connection error sending SMS: {str(e)}"}

    logger.info(f"📱 [SMS Simulation] To: {formatted_phone} | Body: {message_body}")
    return {
        "success": True,
        "provider": "simulation",
        "message": f"Simulated SMS logged for {formatted_phone}. Add your Twilio Account SID, Auth Token & Sender Phone below to receive real SMS on your mobile phone handset.",
    }


