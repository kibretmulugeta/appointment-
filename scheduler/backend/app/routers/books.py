from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.database import get_database
from app.core.dependencies import get_current_user
from app.models.book import BookCreate, BookUpdate, BookResponse

router = APIRouter(prefix="/api/books", tags=["Books"])

@router.get("", response_model=List[BookResponse])
async def list_books(
    genre: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    query = {"user_id": user_id}
    if genre:
        query["genre"] = genre
    if status:
        query["status"] = status
        
    cursor = db.books.find(query).sort("title", 1)
    books = []
    async for b in cursor:
        books.append(BookResponse(
            id=str(b["_id"]),
            user_id=user_id,
            title=b.get("title", ""),
            author=b.get("author", ""),
            isbn=b.get("isbn", ""),
            genre=b.get("genre", "General"),
            total_pages=b.get("total_pages", 0),
            cover_url=b.get("cover_url", ""),
            library_location=b.get("library_location", ""),
            status=b.get("status", "available"),
            created_at=b.get("created_at")
        ))
    return books

@router.post("", response_model=BookResponse)
async def create_book(
    book_in: BookCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    
    doc = {
        "user_id": user_id,
        "title": book_in.title,
        "author": book_in.author,
        "isbn": book_in.isbn or "",
        "genre": book_in.genre or "General",
        "total_pages": book_in.total_pages or 0,
        "cover_url": book_in.cover_url or f"https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300",
        "library_location": book_in.library_location or "",
        "status": "available",
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db.books.insert_one(doc)
    doc["_id"] = res.inserted_id
    
    return BookResponse(
        id=str(doc["_id"]),
        user_id=user_id,
        title=doc["title"],
        author=doc["author"],
        isbn=doc["isbn"],
        genre=doc["genre"],
        total_pages=doc["total_pages"],
        cover_url=doc["cover_url"],
        library_location=doc["library_location"],
        status=doc["status"],
        created_at=doc["created_at"]
    )

@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: str,
    book_in: BookUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    
    try:
        oid = ObjectId(book_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid book ID format")
        
    existing = await db.books.find_one({"_id": oid, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Book not found")
        
    update_data = {k: v for k, v in book_in.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.books.update_one({"_id": oid}, {"$set": update_data})
        
    updated = await db.books.find_one({"_id": oid})
    return BookResponse(
        id=str(updated["_id"]),
        user_id=user_id,
        title=updated.get("title", ""),
        author=updated.get("author", ""),
        isbn=updated.get("isbn", ""),
        genre=updated.get("genre", "General"),
        total_pages=updated.get("total_pages", 0),
        cover_url=updated.get("cover_url", ""),
        library_location=updated.get("library_location", ""),
        status=updated.get("status", "available"),
        created_at=updated.get("created_at")
    )

@router.delete("/{book_id}")
async def delete_book(
    book_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    try:
        oid = ObjectId(book_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid book ID format")
        
    res = await db.books.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")
        
    return {"status": "success", "message": "Book deleted"}
