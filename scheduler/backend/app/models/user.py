from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class NotificationPreferences(BaseModel):
    email: bool = True
    sms: bool = False
    inApp: bool = True

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phoneNumber: Optional[str] = None
    timezone: Optional[str] = "UTC"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phoneNumber: Optional[str] = None
    timezone: Optional[str] = None
    avatar: Optional[str] = None
    notificationPreferences: Optional[NotificationPreferences] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: Optional[str] = ""
    phoneNumber: Optional[str] = ""
    phoneVerified: bool = False
    emailVerified: bool = False
    provider: str = "local"
    providerId: Optional[str] = ""
    timezone: str = "UTC"
    notificationPreferences: NotificationPreferences = Field(default_factory=NotificationPreferences)
    createdAt: Optional[datetime] = None
