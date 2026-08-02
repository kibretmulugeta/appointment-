from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from bson import ObjectId
from app.database import get_database
from app.core.dependencies import get_current_user
from app.models.notification import NotificationResponse
from app.services.email_service import send_email
from app.services.sms_service import send_sms

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[dict])
async def list_notifications(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["id"])
    cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(50)
    
    notifications = []
    async for n in cursor:
        n["id"] = str(n["_id"])
        del n["_id"]
        notifications.append(n)
    return notifications

@router.put("/{id}/read")
async def mark_notification_read(id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["id"])
    try:
        await db.notifications.update_one({"_id": ObjectId(id), "user_id": user_id}, {"$set": {"read": True}})
    except Exception:
        await db.notifications.update_one({"_id": id, "user_id": user_id}, {"$set": {"read": True}})
    return {"success": True}

@router.put("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["id"])
    await db.notifications.update_many({"user_id": user_id, "read": False}, {"$set": {"read": True}})
    return {"success": True}

@router.post("/test-email")
async def test_email_notification(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email is missing")

    subject = "Scheduler Test Email Notification"
    html = f"""
    <div style="font-family: Arial, sans-serif; background: #0f172a; color: #fff; padding: 24px; border-radius: 12px;">
      <h2 style="color: #6366f1;">✅ Email Notifications Operational</h2>
      <p>Hello <strong>{current_user.get('name', 'User')}</strong>,</p>
      <p>This is a test email sent from your <strong>Scheduler App</strong>.</p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">If you received this email, your email notification configuration is active.</p>
    </div>
    """
    res = await send_email(user_email, subject, html)
    return res

@router.post("/test-sms")
async def test_sms_notification(
    payload: Optional[dict] = Body(default={}),
    current_user: dict = Depends(get_current_user)
):
    phone = payload.get("phoneNumber") if payload else None
    if not phone:
        phone = current_user.get("phoneNumber")

    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required. Please save a phone number in your profile first.")

    message = f"⏰ Scheduler Test SMS: Hello {current_user.get('name', 'User')}, SMS notifications are active on your account!"
    res = await send_sms(phone, message)
    return res

@router.get("/sms-config")

async def get_sms_config(current_user: dict = Depends(get_current_user)):
    db = get_database()
    sid, token, phone = "", "", ""
    if db is not None:
        doc = await db.app_settings.find_one({"key": "sms_config"})
        if doc:
            sid = doc.get("accountSid", "")
            phone = doc.get("phoneNumber", "")

    # Mask accountSid for safety
    masked_sid = f"{sid[:6]}...{sid[-4:]}" if len(sid) > 10 else sid
    return {
        "configured": bool(sid and phone),
        "accountSid": masked_sid,
        "phoneNumber": phone
    }

@router.post("/sms-config")
async def save_sms_config(
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    account_sid = payload.get("accountSid", "").strip()
    auth_token = payload.get("authToken", "").strip()
    phone_number = payload.get("phoneNumber", "").strip()

    doc = await db.app_settings.find_one({"key": "sms_config"}) or {}
    if "..." in account_sid or not account_sid:
        account_sid = doc.get("accountSid", "")
    if "..." in auth_token or not auth_token:
        auth_token = doc.get("authToken", "")
    if not phone_number:
        phone_number = doc.get("phoneNumber", "")

    if not (account_sid and auth_token and phone_number):
        raise HTTPException(status_code=400, detail="Twilio Account SID, Auth Token, and Sender Phone Number are required")

    await db.app_settings.update_one(
        {"key": "sms_config"},
        {
            "$set": {
                "accountSid": account_sid,
                "authToken": auth_token,
                "phoneNumber": phone_number,
                "updatedBy": current_user.get("id"),
            }
        },
        upsert=True
    )
    return {"success": True, "message": "Twilio SMS configuration saved successfully!"}

@router.get("/email-config")
async def get_email_config(current_user: dict = Depends(get_current_user)):
    db = get_database()
    host, port, user = "", 587, ""
    if db is not None:
        doc = await db.app_settings.find_one({"key": "email_config"})
        if doc:
            host = doc.get("host", "")
            port = doc.get("port", 587)
            user = doc.get("user", "")

    return {
        "configured": bool(host and user),
        "host": host,
        "port": port,
        "user": user,
    }

@router.post("/email-config")
async def save_email_config(
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    host = payload.get("host", "smtp.gmail.com").strip()
    port = int(payload.get("port", 587))
    user = payload.get("user", "").strip()
    password = payload.get("pass", "").strip()
    from_email = payload.get("fromEmail", user).strip()

    doc = await db.app_settings.find_one({"key": "email_config"}) or {}
    if not password:
        password = doc.get("pass", "")

    if not (host and user and password):
        raise HTTPException(status_code=400, detail="SMTP Host, Username, and Password are required")

    await db.app_settings.update_one(
        {"key": "email_config"},
        {
            "$set": {
                "host": host,
                "port": port,
                "user": user,
                "pass": password,
                "fromEmail": from_email,
                "updatedBy": current_user.get("id"),
            }
        },
        upsert=True
    )
    return {"success": True, "message": "SMTP Email Gateway configuration saved successfully!"}



