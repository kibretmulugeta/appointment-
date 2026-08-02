from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1, max_length=150)
    isbn: Optional[str] = ""
    genre: Optional[str] = "General"
    total_pages: Optional[int] = 0
    cover_url: Optional[str] = ""
    library_location: Optional[str] = ""

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    genre: Optional[str] = None
    total_pages: Optional[int] = None
    cover_url: Optional[str] = None
    library_location: Optional[str] = None
    status: Optional[str] = None

class BookResponse(BaseModel):
    id: str
    user_id: str
    title: str
    author: str
    isbn: Optional[str] = ""
    genre: Optional[str] = "General"
    total_pages: Optional[int] = 0
    cover_url: Optional[str] = ""
    library_location: Optional[str] = ""
    status: str = "available"  # available, borrowed, reserved
    created_at: Optional[datetime] = None
