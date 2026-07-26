import asyncio
import logging
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.database import get_database
from app.services.email_service import send_email
from app.services.sms_service import send_sms

logger = logging.getLogger("scheduler.reminders")

async def process_upcoming_reminders():
    """Background task scanning upcoming appointments and sending reminders (24h, 1h, 15m)."""
    db = get_database()
    if db is None:
        return

    now = datetime.now(timezone.utc)
    # Check appointments in the next 24 hours
    start_window = now
    end_window = now + timedelta(hours=24)

    try:
        cursor = db.appointments.find({
            "status": {"$in": ["pending", "confirmed"]},
            "start_time": {"$gte": start_window, "$lte": end_window}
        })
        
        async for appt in cursor:
            start_time = appt.get("start_time")
            if not start_time:
                continue

            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)

            time_diff = (start_time - now).total_seconds()
            minutes_left = time_diff / 60.0

            # Determine reminder interval trigger
            reminder_type = None
            if 1430 <= minutes_left <= 1450:
                reminder_type = "24h"
            elif 50 <= minutes_left <= 70:
                reminder_type = "1h"
            elif 10 <= minutes_left <= 20:
                reminder_type = "15m"

            if not reminder_type:
                continue

            reminder_key = f"{appt['_id']}_{reminder_type}"
            already_sent = await db.reminders.find_one({"key": reminder_key})
            if already_sent:
                continue

            # Record reminder dispatch to prevent duplicate sends
            await db.reminders.insert_one({
                "key": reminder_key,
                "appointment_id": str(appt["_id"]),
                "type": reminder_type,
                "sent_at": datetime.now(timezone.utc)
            })

            # Send reminders to participants
            title = appt.get("title", "Upcoming Appointment")
            loc_name = appt.get("location", {}).get("name", "Meeting Location")
            time_formatted = start_time.strftime("%b %d, %Y at %I:%M %p UTC")

            participants = appt.get("participants", [])
            for p in participants:
                email = p.get("email")
                phone = p.get("phone")
                p_name = p.get("name", "User")
                user_id = p.get("user_id")

                # In-App Notification
                if user_id:
                    await db.notifications.insert_one({
                        "user_id": str(user_id),
                        "title": f"⏰ Reminder: {title}",
                        "message": f"Starting in {reminder_type}! {title} at {loc_name} ({time_formatted}).",
                        "type": "reminder",
                        "appointment_id": str(appt["_id"]),
                        "read": False,
                        "created_at": datetime.now(timezone.utc)
                    })

                # Check user preferences if registered
                pref_email = True
                pref_sms = False
                if user_id:
                    try:
                        u = await db.users.find_one({"_id": ObjectId(user_id)})
                        if u and "notificationPreferences" in u:
                            pref_email = u["notificationPreferences"].get("email", True)
                            pref_sms = u["notificationPreferences"].get("sms", False)
                    except Exception:
                        pass

                # Email Reminder
                if email and pref_email:
                    email_html = f"""
                    <div style="font-family: Arial; background: #0f172a; color: #fff; padding: 20px; border-radius: 8px;">
                      <h3 style="color: #6366f1;">⏰ Appointment Reminder ({reminder_type} left)</h3>
                      <p>Hi <strong>{p_name}</strong>,</p>
                      <p>Your appointment <strong>{title}</strong> is starting in {reminder_type}.</p>
                      <p>📍 <strong>Location:</strong> {loc_name}</p>
                      <p>🕒 <strong>Time:</strong> {time_formatted}</p>
                    </div>
                    """
                    await send_email(email, f"⏰ Reminder: {title} ({reminder_type} left)", email_html)

                # SMS Reminder
                if phone and pref_sms:
                    sms_text = f"⏰ Reminder: '{title}' starts in {reminder_type} at {loc_name} ({time_formatted})."
                    await send_sms(phone, sms_text)

    except Exception as e:
        logger.error(f"Error in background reminder loop: {e}")

async def start_reminder_scheduler(interval_seconds: int = 60):
    """Run reminder scanner loop periodically."""
    logger.info("⏰ Background Reminder Scheduler Started")
    while True:
        try:
            await process_upcoming_reminders()
        except Exception as e:
            logger.error(f"Error executing reminder scanner: {e}")
        await asyncio.sleep(interval_seconds)
