from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: Optional[str] = ""
    notes: Optional[str] = ""

class ContactResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    email: str
    phone: Optional[str] = ""
    notes: Optional[str] = ""
    has_account: bool = False
    user_id: Optional[str] = None
    avatar: Optional[str] = ""
    created_at: Optional[datetime] = None
