import logging
import httpx
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger("scheduler.google")

async def exchange_google_code_for_token(code: str) -> Dict[str, Any]:
    """Exchange authorization code for Google access token."""
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_CALLBACK_URL,
                "grant_type": "authorization_code",
            },
            timeout=10.0,
        )
        if res.status_code == 200:
            return res.json()
        logger.error(f"Google Token Exchange Error: {res.status_code} {res.text}")
        return None

async def get_google_user_profile(access_token: str) -> Dict[str, Any]:
    """Fetch user profile details from Google UserInfo API."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )
        if res.status_code == 200:
            return res.json()
        return None

async def fetch_google_contacts(access_token: str) -> List[Dict[str, Any]]:
    """Fetch user contacts using Google People API."""
    contacts = []
    if not access_token:
        return contacts

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            if res.status_code == 200:
                data = res.json()
                connections = data.get("connections", [])
                for person in connections:
                    name = person.get("names", [{}])[0].get("displayName", "Google Contact")
                    email = person.get("emailAddresses", [{}])[0].get("value", "")
                    phone = person.get("phoneNumbers", [{}])[0].get("value", "")
                    avatar = person.get("photos", [{}])[0].get("url", "")
                    if email:
                        contacts.append({
                            "name": name,
                            "email": email,
                            "phone": phone,
                            "avatar": avatar,
                            "source": "google"
                        })
    except Exception as e:
        logger.warning(f"Google People API fetch contacts warning: {e}")
    return contacts
