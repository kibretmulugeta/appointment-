from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.database import get_database
from app.core.dependencies import get_current_user
from app.models.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.services.email_service import send_email, generate_invitation_email
from app.services.sms_service import send_sms
from app.config import settings

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

def serialize_appointment(doc: dict) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.get("", response_model=List[dict])
async def list_appointments(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    user_email = current_user["email"].lower()

    query = {
        "$or": [
            {"organizer_id": user_id},
            {"participants.user_id": user_id},
            {"participants.email": user_email}
        ]
    }

    if status_filter:
        query["status"] = status_filter

    if start_date and end_date:
        query["start_time"] = {"$gte": start_date, "$lte": end_date}

    cursor = db.appointments.find(query).sort("start_time", 1)
    results = []
    async for doc in cursor:
        results.append(serialize_appointment(doc))
    return results

@router.post("", response_model=dict)
async def create_appointment(
    appt_in: AppointmentCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    organizer_id = str(current_user["id"])
    organizer_email = current_user["email"].lower()
    organizer_name = current_user.get("name", organizer_email)

    # 1. Check Appointment Conflict
    conflict = await db.appointments.find_one({
        "organizer_id": organizer_id,
        "status": {"$ne": "cancelled"},
        "$or": [
            {"start_time": {"$lt": appt_in.end_time, "$gte": appt_in.start_time}},
            {"end_time": {"$gt": appt_in.start_time, "$lte": appt_in.end_time}},
            {"start_time": {"$lte": appt_in.start_time}, "end_time": {"$gte": appt_in.end_time}}
        ]
    })

    # Prepare participants
    enriched_participants = []
    for p in appt_in.participants:
        p_email = p.email.lower()
        if p_email == organizer_email:
            continue
            
        p_user = await db.users.find_one({"email": p_email})
        p_user_id = str(p_user["_id"]) if p_user else None
        p_phone = p.phone or (p_user.get("phoneNumber") if p_user else "")

        enriched_participants.append({
            "user_id": p_user_id,
            "name": p.name or (p_user.get("name") if p_user else p_email),
            "email": p_email,
            "phone": p_phone or "",
            "status": "pending"
        })

    # Include organizer in participants list as accepted
    enriched_participants.insert(0, {
        "user_id": organizer_id,
        "name": organizer_name,
        "email": organizer_email,
        "phone": current_user.get("phoneNumber", ""),
        "status": "accepted"
    })

    doc = {
        "title": appt_in.title,
        "description": appt_in.description or "",
        "organizer_id": organizer_id,
        "organizer_name": organizer_name,
        "organizer_email": organizer_email,
        "start_time": appt_in.start_time,
        "end_time": appt_in.end_time,
        "timezone": appt_in.timezone or "UTC",
        "location": appt_in.location.model_dump(),
        "participants": enriched_participants,
        "status": "pending" if len(enriched_participants) > 1 else "confirmed",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    res = await db.appointments.insert_one(doc)
    appt_id = str(res.inserted_id)

    # 2. Trigger Multi-Channel Notifications to Invited Participants
    date_str = appt_in.start_time.strftime("%A, %B %d, %Y")
    time_str = f"{appt_in.start_time.strftime('%I:%M %p')} - {appt_in.end_time.strftime('%I:%M %p')} ({appt_in.timezone})"
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    invite_link = f"{frontend_url}/appointments/{appt_id}"

    for p in enriched_participants:
        if p["email"] == organizer_email:
            continue

        # In-App Notification
        if p["user_id"]:
            await db.notifications.insert_one({
                "user_id": p["user_id"],
                "title": f"📅 New Appointment Invitation: {appt_in.title}",
                "message": f"{organizer_name} invited you to {appt_in.title} on {date_str} at {appt_in.location.name}.",
                "type": "invitation",
                "appointment_id": appt_id,
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })

        # Email Notification
        email_html = generate_invitation_email(
            organizer_name=organizer_name,
            title=appt_in.title,
            description=appt_in.description or "",
            date_str=date_str,
            time_str=time_str,
            location_name=appt_in.location.name,
            address=appt_in.location.address or "",
            maps_url=appt_in.location.google_maps_url or "",
            invite_link=invite_link
        )
        background_tasks.add_task(send_email, p["email"], f"Invitation: {appt_in.title}", email_html)

        # SMS Notification
        if p.get("phone"):
            sms_text = f"You have been invited to '{appt_in.title}' by {organizer_name} on {date_str} at {appt_in.location.name}. View details: {invite_link}"
            background_tasks.add_task(send_sms, p["phone"], sms_text)

    doc["id"] = appt_id
    del doc["_id"]
    if conflict:
        doc["warning"] = f"Conflict detected with another appointment between {conflict['start_time'].strftime('%I:%M %p')} - {conflict['end_time'].strftime('%I:%M %p')}"

    return doc

@router.get("/{id}")
async def get_appointment_detail(id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        appt = await db.appointments.find_one({"_id": ObjectId(id)})
    except Exception:
        appt = await db.appointments.find_one({"_id": id})

    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    user_id = str(current_user["id"])
    user_email = current_user["email"].lower()

    # Authorization Check
    is_organizer = appt["organizer_id"] == user_id
    is_participant = any(p.get("user_id") == user_id or p.get("email") == user_email for p in appt.get("participants", []))

    if not is_organizer and not is_participant:
        raise HTTPException(status_code=403, detail="Not authorized to view this appointment")

    return serialize_appointment(appt)

@router.post("/{id}/accept")
async def accept_invitation(id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    return await update_rsvp_status(id, "accepted", current_user, background_tasks)

@router.post("/{id}/decline")
async def decline_invitation(id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    return await update_rsvp_status(id, "declined", current_user, background_tasks)

@router.post("/{id}/tentative")
async def tentative_invitation(id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    return await update_rsvp_status(id, "tentative", current_user, background_tasks)

async def update_rsvp_status(id: str, status_choice: str, current_user: dict, background_tasks: BackgroundTasks):
    db = get_database()
    try:
        appt = await db.appointments.find_one({"_id": ObjectId(id)})
    except Exception:
        appt = await db.appointments.find_one({"_id": id})

    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    user_id = str(current_user["id"])
    user_email = current_user["email"].lower()

    # Update participant status
    updated_participants = []
    found = False
    for p in appt.get("participants", []):
        if p.get("user_id") == user_id or p.get("email") == user_email:
            p["status"] = status_choice
            found = True
        updated_participants.append(p)

    if not found:
        raise HTTPException(status_code=400, detail="You are not listed as a participant in this appointment")

    # Check overall appointment status
    all_accepted = all(p["status"] == "accepted" for p in updated_participants if p["email"] != appt["organizer_email"])
    overall_status = "confirmed" if all_accepted else appt["status"]

    try:
        await db.appointments.update_one(
            {"_id": appt["_id"]},
            {"$set": {"participants": updated_participants, "status": overall_status, "updated_at": datetime.now(timezone.utc)}}
        )
    except Exception:
        pass

    # Notify Organizer
    organizer_id = appt["organizer_id"]
    user_name = current_user.get("name", user_email)
    title = appt["title"]

    await db.notifications.insert_one({
        "user_id": organizer_id,
        "title": f"RSVP Update: {title}",
        "message": f"{user_name} has {status_choice} your invitation to {title}.",
        "type": "rsvp",
        "appointment_id": id,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })

    # Notify via email to organizer
    organizer_email = appt.get("organizer_email")
    if organizer_email:
        email_body = f"<p><strong>{user_name}</strong> has responded <strong>{status_choice.upper()}</strong> to your appointment <strong>{title}</strong>.</p>"
        background_tasks.add_task(send_email, organizer_email, f"RSVP Response: {title}", email_body)

    return {"success": True, "status": status_choice, "appointment_status": overall_status}

@router.post("/{id}/cancel")
async def cancel_appointment(id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        appt = await db.appointments.find_one({"_id": ObjectId(id)})
    except Exception:
        appt = await db.appointments.find_one({"_id": id})

    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    user_id = str(current_user["id"])
    if appt["organizer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the organizer can cancel this appointment")

    await db.appointments.update_one({"_id": appt["_id"]}, {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}})

    # Notify all participants
    title = appt["title"]
    for p in appt.get("participants", []):
        if p.get("user_id") and p["user_id"] != user_id:
            await db.notifications.insert_one({
                "user_id": p["user_id"],
                "title": f"Cancelled: {title}",
                "message": f"The appointment '{title}' has been cancelled by the organizer.",
                "type": "cancellation",
                "appointment_id": id,
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })

        if p.get("email") and p["email"] != appt["organizer_email"]:
            background_tasks.add_task(send_email, p["email"], f"Cancelled: {title}", f"<p>The appointment <strong>{title}</strong> has been cancelled by the organizer.</p>")
        if p.get("phone"):
            background_tasks.add_task(send_sms, p["phone"], f"Notice: Appointment '{title}' has been cancelled by the organizer.")

    return {"success": True, "message": "Appointment cancelled successfully"}

@router.delete("/{id}")
async def delete_appointment(id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        res = await db.appointments.delete_one({"_id": ObjectId(id), "organizer_id": str(current_user["id"])})
    except Exception:
        res = await db.appointments.delete_one({"_id": id, "organizer_id": str(current_user["id"])})

    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found or not authorized to delete")

    return {"success": True, "message": "Appointment deleted successfully"}
