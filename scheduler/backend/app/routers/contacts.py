from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.database import get_database
from app.core.dependencies import get_current_user
from app.models.contact import ContactCreate, ContactResponse
from app.services.google_service import fetch_google_contacts

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])

@router.get("", response_model=List[ContactResponse])
async def list_contacts(current_user: dict = Depends(get_current_user)):
    db = get_database()
    owner_id = str(current_user["id"])
    cursor = db.contacts.find({"owner_id": owner_id}).sort("name", 1)
    
    contacts = []
    async for c in cursor:
        contact_email = c.get("email", "").lower()
        existing_user = await db.users.find_one({"email": contact_email})
        
        contacts.append(ContactResponse(
            id=str(c["_id"]),
            owner_id=owner_id,
            name=c.get("name", ""),
            email=contact_email,
            phone=c.get("phone", ""),
            notes=c.get("notes", ""),
            has_account=bool(existing_user),
            user_id=str(existing_user["_id"]) if existing_user else None,
            avatar=c.get("avatar") or (existing_user.get("avatar") if existing_user else f"https://ui-avatars.com/api/?name={c.get('name')}&background=6366f1&color=fff"),
            created_at=c.get("created_at")
        ))
    return contacts

@router.post("", response_model=ContactResponse)
async def create_contact(contact_in: ContactCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    owner_id = str(current_user["id"])
    email = contact_in.email.lower()
    
    # Check duplicate
    existing = await db.contacts.find_one({"owner_id": owner_id, "email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this email already exists in your list")
        
    existing_user = await db.users.find_one({"email": email})
    
    doc = {
        "owner_id": owner_id,
        "name": contact_in.name,
        "email": email,
        "phone": contact_in.phone or "",
        "notes": contact_in.notes or "",
        "avatar": existing_user.get("avatar") if existing_user else f"https://ui-avatars.com/api/?name={contact_in.name}&background=6366f1&color=fff",
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db.contacts.insert_one(doc)
    
    return ContactResponse(
        id=str(res.inserted_id),
        owner_id=owner_id,
        name=contact_in.name,
        email=email,
        phone=contact_in.phone or "",
        notes=contact_in.notes or "",
        has_account=bool(existing_user),
        user_id=str(existing_user["_id"]) if existing_user else None,
        avatar=doc["avatar"],
        created_at=doc["created_at"]
    )

@router.get("/search")
async def search_contacts(q: str = Query("", min_length=0), current_user: dict = Depends(get_current_user)):
    db = get_database()
    owner_id = str(current_user["id"])
    query_regex = {"$regex": q, "$options": "i"}
    
    cursor = db.contacts.find({
        "owner_id": owner_id,
        "$or": [{"name": query_regex}, {"email": query_regex}, {"phone": query_regex}]
    }).limit(20)
    
    results = []
    async for c in cursor:
        contact_email = c.get("email", "").lower()
        existing_user = await db.users.find_one({"email": contact_email})
        results.append({
            "id": str(c["_id"]),
            "name": c.get("name"),
            "email": contact_email,
            "phone": c.get("phone", ""),
            "has_account": bool(existing_user),
            "user_id": str(existing_user["_id"]) if existing_user else None,
            "avatar": c.get("avatar") or (existing_user.get("avatar") if existing_user else f"https://ui-avatars.com/api/?name={c.get('name')}&background=6366f1&color=fff")
        })
        
    # Also search global registered users if not in contacts
    if len(results) < 5 and q:
        user_cursor = db.users.find({
            "email": query_regex,
            "email": {"$ne": current_user["email"]}
        }).limit(5)
        
        async for u in user_cursor:
            u_email = u.get("email", "").lower()
            if not any(r["email"] == u_email for r in results):
                results.append({
                    "id": str(u["_id"]),
                    "name": u.get("name"),
                    "email": u_email,
                    "phone": u.get("phoneNumber", ""),
                    "has_account": True,
                    "user_id": str(u["_id"]),
                    "avatar": u.get("avatar") or f"https://ui-avatars.com/api/?name={u.get('name')}&background=6366f1&color=fff"
                })
                
    return results

@router.get("/google")
async def import_google_contacts(current_user: dict = Depends(get_current_user)):
    google_token = current_user.get("googleAccessToken")
    if not google_token:
        raise HTTPException(status_code=400, detail="Google account not linked or Google Contacts permission missing. Please log in with Google to sync contacts.")
        
    g_contacts = await fetch_google_contacts(google_token)
    db = get_database()
    owner_id = str(current_user["id"])
    
    imported_count = 0
    for gc in g_contacts:
        email = gc["email"].lower()
        existing = await db.contacts.find_one({"owner_id": owner_id, "email": email})
        if not existing:
            existing_user = await db.users.find_one({"email": email})
            await db.contacts.insert_one({
                "owner_id": owner_id,
                "name": gc["name"],
                "email": email,
                "phone": gc.get("phone", ""),
                "avatar": gc.get("avatar") or f"https://ui-avatars.com/api/?name={gc['name']}&background=6366f1&color=fff",
                "created_at": datetime.now(timezone.utc)
            })
            imported_count += 1
            
    return {"success": True, "imported_count": imported_count, "total_google_contacts": len(g_contacts)}
