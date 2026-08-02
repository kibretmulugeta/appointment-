from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.database import get_database
from app.core.dependencies import get_current_user
from app.models.rental import RentalCreate, RentalUpdate, RentalResponse

router = APIRouter(prefix="/api/rentals", tags=["Book Rentals"])

def compute_rental_status(due_date: datetime, return_date: Optional[datetime]) -> str:
    if return_date:
        return "returned"
    now = datetime.now(timezone.utc)
    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)
    if due_date < now:
        return "overdue"
    elif (due_date - now).total_seconds() <= 3 * 86400:  # within 3 days
        return "due_soon"
    return "borrowed"

@router.get("", response_model=List[RentalResponse])
async def list_rentals(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    query = {"user_id": user_id}
    
    cursor = db.rentals.find(query).sort("due_date", 1)
    rentals = []
    async for r in cursor:
        due_date = r.get("due_date")
        return_date = r.get("return_date")
        computed_status = compute_rental_status(due_date, return_date)
        
        # If DB status needs update to overdue/due_soon
        if not return_date and computed_status != r.get("status"):
            await db.rentals.update_one({"_id": r["_id"]}, {"$set": {"status": computed_status}})
            
        if status and computed_status != status:
            continue

        rentals.append(RentalResponse(
            id=str(r["_id"]),
            user_id=user_id,
            book_id=r.get("book_id", ""),
            book_title=r.get("book_title", ""),
            borrower_name=r.get("borrower_name", ""),
            borrower_email=r.get("borrower_email", ""),
            borrower_phone=r.get("borrower_phone", ""),
            borrow_date=r.get("borrow_date"),
            due_date=due_date,
            return_date=return_date,
            status=computed_status,
            notes=r.get("notes", ""),
            created_at=r.get("created_at")
        ))
    return rentals

@router.post("/borrow", response_model=RentalResponse)
async def borrow_book(
    rental_in: RentalCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    
    # Verify book exists if book_id is provided
    if rental_in.book_id:
        try:
            b_oid = ObjectId(rental_in.book_id)
            book = await db.books.find_one({"_id": b_oid})
            if book:
                await db.books.update_one({"_id": b_oid}, {"$set": {"status": "borrowed"}})
        except Exception:
            pass

    status = compute_rental_status(rental_in.due_date, None)
    
    doc = {
        "user_id": user_id,
        "book_id": rental_in.book_id,
        "book_title": rental_in.book_title,
        "borrower_name": rental_in.borrower_name,
        "borrower_email": rental_in.borrower_email or "",
        "borrower_phone": rental_in.borrower_phone or "",
        "borrow_date": rental_in.borrow_date,
        "due_date": rental_in.due_date,
        "return_date": None,
        "status": status,
        "notes": rental_in.notes or "",
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db.rentals.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Create initial confirmation notification
    due_formatted = rental_in.due_date.strftime("%b %d, %Y")
    await db.notifications.insert_one({
        "user_id": user_id,
        "title": f"📚 Book Borrowed: {rental_in.book_title}",
        "message": f"Borrowed by {rental_in.borrower_name}. Return due date is set for {due_formatted}.",
        "type": "rental_borrow",
        "rental_id": str(doc["_id"]),
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })

    return RentalResponse(
        id=str(doc["_id"]),
        user_id=user_id,
        book_id=doc["book_id"],
        book_title=doc["book_title"],
        borrower_name=doc["borrower_name"],
        borrower_email=doc["borrower_email"],
        borrower_phone=doc["borrower_phone"],
        borrow_date=doc["borrow_date"],
        due_date=doc["due_date"],
        return_date=None,
        status=doc["status"],
        notes=doc["notes"],
        created_at=doc["created_at"]
    )

@router.post("/{rental_id}/return", response_model=RentalResponse)
async def return_book(
    rental_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    
    try:
        oid = ObjectId(rental_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rental ID format")
        
    rental = await db.rentals.find_one({"_id": oid, "user_id": user_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental record not found")
        
    now = datetime.now(timezone.utc)
    await db.rentals.update_one(
        {"_id": oid},
        {"$set": {"status": "returned", "return_date": now}}
    )
    
    # Reset book status to available if linked
    if rental.get("book_id"):
        try:
            b_oid = ObjectId(rental["book_id"])
            await db.books.update_one({"_id": b_oid}, {"$set": {"status": "available"}})
        except Exception:
            pass

    # Create Return Notification
    await db.notifications.insert_one({
        "user_id": user_id,
        "title": f"✅ Book Returned: {rental.get('book_title')}",
        "message": f"Successfully marked '{rental.get('book_title')}' as returned.",
        "type": "rental_return",
        "rental_id": str(oid),
        "read": False,
        "created_at": now
    })
    
    updated = await db.rentals.find_one({"_id": oid})
    return RentalResponse(
        id=str(updated["_id"]),
        user_id=user_id,
        book_id=updated.get("book_id", ""),
        book_title=updated.get("book_title", ""),
        borrower_name=updated.get("borrower_name", ""),
        borrower_email=updated.get("borrower_email", ""),
        borrower_phone=updated.get("borrower_phone", ""),
        borrow_date=updated.get("borrow_date"),
        due_date=updated.get("due_date"),
        return_date=updated.get("return_date"),
        status="returned",
        notes=updated.get("notes", ""),
        created_at=updated.get("created_at")
    )

@router.post("/{rental_id}/extend", response_model=RentalResponse)
async def extend_rental(
    rental_id: str,
    days: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    
    try:
        oid = ObjectId(rental_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rental ID format")
        
    rental = await db.rentals.find_one({"_id": oid, "user_id": user_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental record not found")
        
    current_due = rental.get("due_date")
    if current_due.tzinfo is None:
        current_due = current_due.replace(tzinfo=timezone.utc)
        
    new_due = current_due + timedelta(days=days)
    new_status = compute_rental_status(new_due, None)
    
    await db.rentals.update_one(
        {"_id": oid},
        {"$set": {"due_date": new_due, "status": new_status}}
    )
    
    new_due_formatted = new_due.strftime("%b %d, %Y")
    await db.notifications.insert_one({
        "user_id": user_id,
        "title": f"📅 Rental Extended: {rental.get('book_title')}",
        "message": f"Extended rental by {days} days. New due date: {new_due_formatted}.",
        "type": "rental_extend",
        "rental_id": str(oid),
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    updated = await db.rentals.find_one({"_id": oid})
    return RentalResponse(
        id=str(updated["_id"]),
        user_id=user_id,
        book_id=updated.get("book_id", ""),
        book_title=updated.get("book_title", ""),
        borrower_name=updated.get("borrower_name", ""),
        borrower_email=updated.get("borrower_email", ""),
        borrower_phone=updated.get("borrower_phone", ""),
        borrow_date=updated.get("borrow_date"),
        due_date=updated.get("due_date"),
        return_date=updated.get("return_date"),
        status=new_status,
        notes=updated.get("notes", ""),
        created_at=updated.get("created_at")
    )
