from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str = "invitation"  # invitation, rsvp, cancellation, reminder
    appointment_id: Optional[str] = None
    read: bool = False

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    appointment_id: Optional[str] = None
    read: bool = False
    created_at: Optional[datetime] = None
