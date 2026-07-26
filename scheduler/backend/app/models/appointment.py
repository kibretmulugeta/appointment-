from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Location(BaseModel):
    name: str = "Meeting Location"
    address: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place_id: Optional[str] = ""
    google_maps_url: Optional[str] = ""

class Participant(BaseModel):
    user_id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = ""
    status: str = "pending"  # pending, accepted, declined, tentative

class AppointmentCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = ""
    start_time: datetime
    end_time: datetime
    timezone: Optional[str] = "UTC"
    location: Location
    participants: List[Participant] = Field(default_factory=list)

class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    timezone: Optional[str] = None
    location: Optional[Location] = None
    participants: Optional[List[Participant]] = None
    status: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    organizer_id: str
    organizer_name: Optional[str] = ""
    organizer_email: Optional[str] = ""
    start_time: datetime
    end_time: datetime
    timezone: str = "UTC"
    location: Location
    participants: List[Participant] = Field(default_factory=list)
    status: str = "pending"  # pending, confirmed, declined, cancelled, completed
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
