from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from app.core.security import decode_access_token
from app.database import get_database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check Bearer token or Cookie or Query Param
    auth_token = token
    if not auth_token:
        auth_token = request.cookies.get("token")
    if not auth_token:
        auth_token = request.query_params.get("token")
        
    if not auth_token:
        raise credentials_exception
        
    payload = decode_access_token(auth_token)
    if not payload or "sub" not in payload:
        raise credentials_exception
        
    user_id = payload["sub"]
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection uninitialized")
        
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await db.users.find_one({"_id": user_id})
        
    if not user:
        raise credentials_exception
        
    user["id"] = str(user["_id"])
    return user
