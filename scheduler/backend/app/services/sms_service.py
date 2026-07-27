import re
import logging
import httpx
from app.config import settings

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


async def send_sms(to_phone: str, message_body: str) -> dict:
    """Send SMS notification using Twilio API if credentials configured, or simulated fallback."""
    if not to_phone:
        return {"success": False, "provider": "none", "message": "Recipient phone number is missing."}

    formatted_phone = format_phone_e164(to_phone)

    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    url,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data={
                        "From": settings.TWILIO_PHONE_NUMBER,
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
                    logger.warning(f"Twilio SMS error: {res.status_code} {error_msg}")
                    return {"success": False, "provider": "twilio", "message": f"Twilio error ({res.status_code}): {error_msg}"}
        except Exception as e:
            logger.warning(f"Failed to send Twilio SMS: {e}")

    logger.info(f"📱 [SMS Simulation] To: {formatted_phone} | Body: {message_body}")
    return {
        "success": True,
        "provider": "simulation",
        "message": f"Simulated SMS logged for {formatted_phone}. Configure TWILIO credentials for live text messaging.",
    }

