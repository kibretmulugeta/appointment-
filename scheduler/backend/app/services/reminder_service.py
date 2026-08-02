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
                pref_sms = True if phone else False
                if user_id:
                    try:
                        u = await db.users.find_one({"_id": ObjectId(user_id)})
                        if u and "notificationPreferences" in u:
                            pref_email = u["notificationPreferences"].get("email", True)
                            pref_sms = u["notificationPreferences"].get("sms", True)
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
        logger.error(f"Error in background appointment reminder loop: {e}")

async def process_book_rental_reminders():
    """Background scanner for book return due dates (due soon warnings & overdue alerts)."""
    db = get_database()
    if db is None:
        return

    now = datetime.now(timezone.utc)
    try:
        # Find active rentals not yet returned
        cursor = db.rentals.find({"status": {"$ne": "returned"}})
        async for r in cursor:
            due_date = r.get("due_date")
            if not due_date:
                continue
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
                
            user_id = r.get("user_id")
            book_title = r.get("book_title", "Borrowed Book")
            borrower_name = r.get("borrower_name", "Borrower")
            borrower_email = r.get("borrower_email", "")
            
            time_until_due = (due_date - now).total_seconds()
            hours_until_due = time_until_due / 3600.0

            alert_type = None
            if hours_until_due < 0:
                alert_type = "overdue"
            elif 0 <= hours_until_due <= 24:
                alert_type = "due_1day"
            elif 24 < hours_until_due <= 72:
                alert_type = "due_3days"

            if not alert_type:
                continue

            reminder_key = f"rental_{r['_id']}_{alert_type}"
            already_sent = await db.reminders.find_one({"key": reminder_key})
            if already_sent:
                continue

            # Record reminder dispatch
            await db.reminders.insert_one({
                "key": reminder_key,
                "rental_id": str(r["_id"]),
                "type": alert_type,
                "sent_at": datetime.now(timezone.utc)
            })

            # Formulate Alert
            due_formatted = due_date.strftime("%b %d, %Y")
            if alert_type == "overdue":
                title_msg = f"🚨 OVERDUE BOOK ALERT: '{book_title}'"
                body_msg = f"The borrowed book '{book_title}' by {borrower_name} was due on {due_formatted}. Please return or extend it immediately!"
            elif alert_type == "due_1day":
                title_msg = f"⚠️ URGENT: '{book_title}' is Due Tomorrow!"
                body_msg = f"Reminder: '{book_title}' borrowed by {borrower_name} is due tomorrow ({due_formatted})."
            else:
                title_msg = f"📚 Reminder: '{book_title}' Due in 3 Days"
                body_msg = f"Upcoming return: '{book_title}' borrowed by {borrower_name} is due on {due_formatted}."

            # Update DB rental status if overdue
            if alert_type == "overdue" and r.get("status") != "overdue":
                await db.rentals.update_one({"_id": r["_id"]}, {"$set": {"status": "overdue"}})
            elif alert_type in ["due_1day", "due_3days"] and r.get("status") == "borrowed":
                await db.rentals.update_one({"_id": r["_id"]}, {"$set": {"status": "due_soon"}})

            # In-App Notification
            if user_id:
                await db.notifications.insert_one({
                    "user_id": str(user_id),
                    "title": title_msg,
                    "message": body_msg,
                    "type": alert_type,
                    "rental_id": str(r["_id"]),
                    "read": False,
                    "created_at": datetime.now(timezone.utc)
                })

            if borrower_email:
                email_html = f"""
                <div style="font-family: Arial; background: #0f172a; color: #fff; padding: 20px; border-radius: 8px;">
                  <h3 style="color: #ef4444;" if alert_type == 'overdue' else style="color: #f59e0b;">{title_msg}</h3>
                  <p>Hi <strong>{borrower_name}</strong>,</p>
                  <p>{body_msg}</p>
                  <p>🗓️ <strong>Due Date:</strong> {due_formatted}</p>
                </div>
                """
                await send_email(borrower_email, title_msg, email_html)

    except Exception as e:
        logger.error(f"Error in background book rental reminder loop: {e}")

async def process_reading_task_reminders():
    """Background scanner for scheduled reading reminders."""
    db = get_database()
    if db is None:
        return

    now = datetime.now(timezone.utc)
    try:
        cursor = db.reading_tasks.find({
            "status": "pending",
            "reminder_time": {"$lte": now}
        })
        async for t in cursor:
            reminder_key = f"reading_{t['_id']}"
            already_sent = await db.reminders.find_one({"key": reminder_key})
            if already_sent:
                continue

            await db.reminders.insert_one({
                "key": reminder_key,
                "reading_task_id": str(t["_id"]),
                "sent_at": datetime.now(timezone.utc)
            })

            user_id = t.get("user_id")
            book_title = t.get("book_title", "Book")
            target = t.get("target_chapter") or f"Pages {t.get('start_page')}-{t.get('end_page')}"

            if user_id:
                await db.notifications.insert_one({
                    "user_id": str(user_id),
                    "title": f"📖 Time to Read: {book_title}",
                    "message": f"Scheduled reading block for '{book_title}'. Goal: {target}.",
                    "type": "reading_alert",
                    "task_id": str(t["_id"]),
                    "read": False,
                    "created_at": datetime.now(timezone.utc)
                })

    except Exception as e:
        logger.error(f"Error in background reading task reminder loop: {e}")

async def start_reminder_scheduler(interval_seconds: int = 60):
    """Run all background reminder scanners periodically."""
    logger.info("⏰ Background Reminder & Alert Scheduler Started")
    while True:
        try:
            await process_upcoming_reminders()
            await process_book_rental_reminders()
            await process_reading_task_reminders()
        except Exception as e:
            logger.error(f"Error executing reminder scanner: {e}")
        await asyncio.sleep(interval_seconds)
