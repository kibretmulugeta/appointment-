import logging
import httpx
from app.config import settings

logger = logging.getLogger("scheduler.sms")

async def send_sms(to_phone: str, message_body: str) -> bool:
    """Send SMS notification using Twilio API if credentials configured, or simulated fallback."""
    if not to_phone:
        return False

    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    url,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data={
                        "From": settings.TWILIO_PHONE_NUMBER,
                        "To": to_phone,
                        "Body": message_body,
                    },
                    timeout=10.0,
                )
                if res.status_code in [200, 201]:
                    logger.info(f"✅ Twilio SMS sent to {to_phone}")
                    return True
                else:
                    logger.warning(f"Twilio SMS error: {res.status_code} {res.text}")
        except Exception as e:
            logger.warning(f"Failed to send Twilio SMS: {e}")

    logger.info(f"📱 [SMS Simulation] To: {to_phone} | Body: {message_body}")
    return True
