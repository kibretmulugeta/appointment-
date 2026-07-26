from fastapi import APIRouter, HTTPException, status, Response, Depends, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone
from bson import ObjectId
import httpx
from app.config import settings
from app.database import get_database
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import UserRegister, UserLogin, UserResponse
from app.services.google_service import exchange_google_code_for_token, get_google_user_profile

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=dict)
async def register(user_in: UserRegister, response: Response):
    db = get_database()
    existing = await db.users.find_one({"email": user_in.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user_doc = {
        "name": user_in.name,
        "email": user_in.email.lower(),
        "password": get_password_hash(user_in.password),
        "phoneNumber": user_in.phoneNumber or "",
        "phoneVerified": False,
        "emailVerified": False,
        "provider": "local",
        "timezone": user_in.timezone or "UTC",
        "avatar": f"https://ui-avatars.com/api/?name={user_in.name}&background=6366f1&color=fff",
        "notificationPreferences": {"email": True, "sms": False, "inApp": True},
        "createdAt": datetime.now(timezone.utc)
    }

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_access_token(user_id)

    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=30 * 24 * 3600,
        samesite="lax",
        secure=settings.ENV == "production"
    )

    user_doc["id"] = user_id
    del user_doc["_id"]
    del user_doc["password"]
    return {"success": True, "token": token, "user": user_doc}

@router.post("/login", response_model=dict)
async def login(credentials: UserLogin, response: Response):
    db = get_database()
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or "password" not in user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token(user_id)

    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=30 * 24 * 3600,
        samesite="lax",
        secure=settings.ENV == "production"
    )

    user["id"] = user_id
    del user["_id"]
    if "password" in user:
        del user["password"]

    return {"success": True, "token": token, "user": user}

def get_redirect_uri(request: Request) -> str:
    if settings.GOOGLE_CALLBACK_URL and "localhost" not in settings.GOOGLE_CALLBACK_URL and "127.0.0.1" not in settings.GOOGLE_CALLBACK_URL:
        return settings.GOOGLE_CALLBACK_URL
    base = str(request.base_url).rstrip('/')
    # Enforce HTTPS on production hosts like Render / Vercel
    if base.startswith("http://") and "localhost" not in base and "127.0.0.1" not in base:
        base = base.replace("http://", "https://")
    return f"{base}/api/auth/google/callback"

@router.get("/google")
async def google_auth(request: Request):
    callback_url = get_redirect_uri(request)
    google_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={callback_url}&"
        f"response_type=code&"
        f"scope=https://www.googleapis.com/auth/userinfo.profile%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/contacts.readonly&"
        f"access_type=offline"
    )
    return RedirectResponse(google_url)

@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, error: str = None):
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    if error or not code:
        return RedirectResponse(f"{frontend_url}/login?error={error or 'no_code'}")

    callback_url = get_redirect_uri(request)
    tokens = await exchange_google_code_for_token(code, redirect_uri=callback_url)
    if not tokens or "access_token" not in tokens:
        return RedirectResponse(f"{frontend_url}/login?error=token_exchange_failed")

    access_token = tokens["access_token"]
    google_profile = await get_google_user_profile(access_token)
    if not google_profile or "email" not in google_profile:
        return RedirectResponse(f"{frontend_url}/login?error=failed_to_fetch_google_profile")

    email = google_profile["email"].lower()
    google_id = google_profile.get("id")
    name = google_profile.get("name", email.split('@')[0])
    avatar = google_profile.get("picture", "")

    db = get_database()
    user = await db.users.find_one({"email": email})

    if not user:
        user_doc = {
            "name": name,
            "email": email,
            "provider": "google",
            "providerId": google_id,
            "googleAccessToken": access_token,
            "avatar": avatar,
            "emailVerified": True,
            "timezone": "UTC",
            "notificationPreferences": {"email": True, "sms": False, "inApp": True},
            "createdAt": datetime.now(timezone.utc)
        }
        res = await db.users.insert_one(user_doc)
        user_id = str(res.inserted_id)
    else:
        user_id = str(user["_id"])
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"providerId": google_id, "avatar": avatar or user.get("avatar"), "googleAccessToken": access_token}}
        )

    jwt_token = create_access_token(user_id)
    redirect_res = RedirectResponse(f"{frontend_url}/?token={jwt_token}&oauth=success")
    redirect_res.set_cookie(
        key="token",
        value=jwt_token,
        httponly=True,
        max_age=30 * 24 * 3600,
        samesite="lax",
        secure=settings.ENV == "production"
    )
    return redirect_res

@router.get("/github")
async def github_auth():
    github_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={settings.GITHUB_CLIENT_ID}&"
        f"redirect_uri={settings.GITHUB_CALLBACK_URL}&"
        f"scope=user:email"
    )
    return RedirectResponse(github_url)

@router.get("/github/callback")
async def github_callback(code: str = None, error: str = None):
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    if error or not code:
        return RedirectResponse(f"{frontend_url}/login?error={error or 'no_code'}")

    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_res.json()
            access_token = token_data.get("access_token")

            if not access_token:
                return RedirectResponse(f"{frontend_url}/login?error=github_token_failed")

            user_res = await client.get("https://api.github.com/user", headers={"Authorization": f"Bearer {access_token}"})
            gh_user = user_res.json()

            email = gh_user.get("email")
            if not email:
                email_res = await client.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {access_token}"})
                emails = email_res.json()
                primary = next((e for e in emails if e.get("primary")), None)
                email = primary.get("email") if primary else (emails[0].get("email") if emails else None)

            if not email:
                return RedirectResponse(f"{frontend_url}/login?error=github_email_private")

            email = email.lower()
            name = gh_user.get("name") or gh_user.get("login") or email.split('@')[0]
            avatar = gh_user.get("avatar_url", "")
            gh_id = str(gh_user.get("id"))

            db = get_database()
            user = await db.users.find_one({"email": email})
            if not user:
                user_doc = {
                    "name": name,
                    "email": email,
                    "provider": "github",
                    "providerId": gh_id,
                    "avatar": avatar,
                    "emailVerified": True,
                    "timezone": "UTC",
                    "notificationPreferences": {"email": True, "sms": False, "inApp": True},
                    "createdAt": datetime.now(timezone.utc)
                }
                res = await db.users.insert_one(user_doc)
                user_id = str(res.inserted_id)
            else:
                user_id = str(user["_id"])
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"providerId": gh_id, "avatar": avatar or user.get("avatar")}}
                )

            jwt_token = create_access_token(user_id)
            redirect_res = RedirectResponse(f"{frontend_url}/?token={jwt_token}&oauth=success")
            redirect_res.set_cookie(
                key="token",
                value=jwt_token,
                httponly=True,
                max_age=30 * 24 * 3600,
                samesite="lax",
                secure=settings.ENV == "production"
            )
            return redirect_res
    except Exception as e:
        return RedirectResponse(f"{frontend_url}/login?error={str(e)}")

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("token")
    return {"success": True, "message": "Logged out successfully"}
