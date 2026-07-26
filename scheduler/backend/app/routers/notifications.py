from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId
from app.database import get_database
from app.core.dependencies import get_current_user
from app.models.notification import NotificationResponse

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
