from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_database
from app.core.dependencies import get_current_user
from app.models.user import UserProfileUpdate

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/me")
async def read_current_user_profile(current_user: dict = Depends(get_current_user)):
    return current_user

@router.put("/me")
async def update_current_user_profile(
    profile_in: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    update_data = {k: v for k, v in profile_in.model_dump().items() if v is not None}
    
    if "notificationPreferences" in update_data and isinstance(update_data["notificationPreferences"], dict):
        # Merge notification preferences
        current_prefs = current_user.get("notificationPreferences", {"email": True, "sms": False, "inApp": True})
        current_prefs.update(update_data["notificationPreferences"])
        update_data["notificationPreferences"] = current_prefs

    if update_data:
        try:
            await db.users.update_one(
                {"_id": ObjectId(current_user["id"])},
                {"$set": update_data}
            )
        except Exception:
            await db.users.update_one(
                {"_id": current_user["id"]},
                {"$set": update_data}
            )

    try:
        updated_user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    except Exception:
        updated_user = await db.users.find_one({"_id": current_user["id"]})

    updated_user["id"] = str(updated_user["_id"])
    if "_id" in updated_user:
        del updated_user["_id"]
    if "password" in updated_user:
        del updated_user["password"]

    return updated_user
