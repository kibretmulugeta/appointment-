from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RentalCreate(BaseModel):
    book_id: str
    book_title: str
    borrower_name: str = Field(..., min_length=1, max_length=150)
    borrower_email: Optional[str] = ""
    borrower_phone: Optional[str] = ""
    borrow_date: datetime
    due_date: datetime
    notes: Optional[str] = ""

class RentalUpdate(BaseModel):
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    return_date: Optional[datetime] = None
    notes: Optional[str] = None

class RentalResponse(BaseModel):
    id: str
    user_id: str
    book_id: str
    book_title: str
    borrower_name: str
    borrower_email: Optional[str] = ""
    borrower_phone: Optional[str] = ""
    borrow_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    status: str = "borrowed"  # borrowed, due_soon, overdue, returned
    notes: Optional[str] = ""
    created_at: Optional[datetime] = None
