from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReadingTaskCreate(BaseModel):
    book_id: Optional[str] = ""
    book_title: str = Field(..., min_length=1, max_length=200)
    target_chapter: Optional[str] = ""
    start_page: Optional[int] = 0
    end_page: Optional[int] = 0
    scheduled_time: datetime
    reminder_minutes_before: Optional[int] = 15
    notes: Optional[str] = ""

class ReadingTaskResponse(BaseModel):
    id: str
    user_id: str
    book_id: Optional[str] = ""
    book_title: str
    target_chapter: Optional[str] = ""
    start_page: Optional[int] = 0
    end_page: Optional[int] = 0
    scheduled_time: datetime
    reminder_time: Optional[datetime] = None
    status: str = "pending"  # pending, completed
    notes: Optional[str] = ""
    created_at: Optional[datetime] = None
