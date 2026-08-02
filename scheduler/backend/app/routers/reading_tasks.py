from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.database import get_database
from app.core.dependencies import get_current_user
from app.models.reading_task import ReadingTaskCreate, ReadingTaskResponse

router = APIRouter(prefix="/api/reading-tasks", tags=["Reading Tasks"])

@router.get("", response_model=List[ReadingTaskResponse])
async def list_reading_tasks(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    query = {"user_id": user_id}
    if status:
        query["status"] = status
        
    cursor = db.reading_tasks.find(query).sort("scheduled_time", 1)
    tasks = []
    async for t in cursor:
        tasks.append(ReadingTaskResponse(
            id=str(t["_id"]),
            user_id=user_id,
            book_id=t.get("book_id", ""),
            book_title=t.get("book_title", ""),
            target_chapter=t.get("target_chapter", ""),
            start_page=t.get("start_page", 0),
            end_page=t.get("end_page", 0),
            scheduled_time=t.get("scheduled_time"),
            reminder_time=t.get("reminder_time"),
            status=t.get("status", "pending"),
            notes=t.get("notes", ""),
            created_at=t.get("created_at")
        ))
    return tasks

@router.post("", response_model=ReadingTaskResponse)
async def create_reading_task(
    task_in: ReadingTaskCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    
    minutes_before = task_in.reminder_minutes_before or 15
    sched_time = task_in.scheduled_time
    if sched_time.tzinfo is None:
        sched_time = sched_time.replace(tzinfo=timezone.utc)
        
    reminder_time = sched_time - timedelta(minutes=minutes_before)
    
    doc = {
        "user_id": user_id,
        "book_id": task_in.book_id or "",
        "book_title": task_in.book_title,
        "target_chapter": task_in.target_chapter or "",
        "start_page": task_in.start_page or 0,
        "end_page": task_in.end_page or 0,
        "scheduled_time": sched_time,
        "reminder_time": reminder_time,
        "status": "pending",
        "notes": task_in.notes or "",
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db.reading_tasks.insert_one(doc)
    doc["_id"] = res.inserted_id
    
    # Schedule initial notification alert
    sched_formatted = sched_time.strftime("%b %d at %I:%M %p")
    await db.notifications.insert_one({
        "user_id": user_id,
        "title": f"📖 Reading Reminder Scheduled: {task_in.book_title}",
        "message": f"Scheduled for {sched_formatted}. Target: {task_in.target_chapter or f'Pages {task_in.start_page}-{task_in.end_page}'}",
        "type": "reading_reminder",
        "task_id": str(doc["_id"]),
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    return ReadingTaskResponse(
        id=str(doc["_id"]),
        user_id=user_id,
        book_id=doc["book_id"],
        book_title=doc["book_title"],
        target_chapter=doc["target_chapter"],
        start_page=doc["start_page"],
        end_page=doc["end_page"],
        scheduled_time=doc["scheduled_time"],
        reminder_time=doc["reminder_time"],
        status=doc["status"],
        notes=doc["notes"],
        created_at=doc["created_at"]
    )

@router.patch("/{task_id}/toggle", response_model=ReadingTaskResponse)
async def toggle_reading_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID format")
        
    task = await db.reading_tasks.find_one({"_id": oid, "user_id": user_id})
    if not task:
        raise HTTPException(status_code=404, detail="Reading task not found")
        
    new_status = "completed" if task.get("status") == "pending" else "pending"
    await db.reading_tasks.update_one({"_id": oid}, {"$set": {"status": new_status}})
    
    updated = await db.reading_tasks.find_one({"_id": oid})
    return ReadingTaskResponse(
        id=str(updated["_id"]),
        user_id=user_id,
        book_id=updated.get("book_id", ""),
        book_title=updated.get("book_title", ""),
        target_chapter=updated.get("target_chapter", ""),
        start_page=updated.get("start_page", 0),
        end_page=updated.get("end_page", 0),
        scheduled_time=updated.get("scheduled_time"),
        reminder_time=updated.get("reminder_time"),
        status=new_status,
        notes=updated.get("notes", ""),
        created_at=updated.get("created_at")
    )

@router.delete("/{task_id}")
async def delete_reading_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["id"])
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID format")
        
    res = await db.reading_tasks.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return {"status": "success", "message": "Reading task deleted"}
