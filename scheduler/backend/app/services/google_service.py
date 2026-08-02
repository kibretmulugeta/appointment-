import logging
import httpx
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger("scheduler.google")

async def exchange_google_code_for_token(code: str, redirect_uri: str = None) -> Dict[str, Any]:
    """Exchange authorization code for Google access token."""
    callback_url = redirect_uri or settings.GOOGLE_CALLBACK_URL
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": callback_url,
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

async def fetch_google_contacts(access_token: str) -> tuple[List[Dict[str, Any]], str]:
    """Fetch user contacts using Google People API, returning (contacts, error_message)."""
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                "https://people.googleapis.com/v1/people/me/connections",
                params={
                    "personFields": "names,emailAddresses,phoneNumbers,photos",
                    "pageSize": 100
                },
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            if res.status_code == 200:
                data = res.json()
                connections = data.get("connections", [])
                contacts = []
                for person in connections:
                    names = person.get("names", [])
                    emails = person.get("emailAddresses", [])
                    phones = person.get("phoneNumbers", [])
                    photos = person.get("photos", [])

                    name = names[0].get("displayName") if names else None
                    email = emails[0].get("value") if emails else None
                    phone = phones[0].get("value") if phones else ""
                    avatar = photos[0].get("url") if photos else ""

                    if name and email:
                        contacts.append({
                            "name": name,
                            "email": email.lower(),
                            "phone": phone,
                            "avatar": avatar,
                            "source": "google"
                        })
                return contacts, ""
            
            logger.warning(f"Google People API Warning ({res.status_code}): {res.text}")
            if res.status_code in [401, 403]:
                return [], "Google Contacts permission missing or People API not enabled in your Google Cloud Console. Please log in again with Google."
            return [], f"Google API Error ({res.status_code}): {res.text}"
        except Exception as e:
            logger.error(f"Failed to fetch Google contacts: {e}")
            return [], f"Network error connecting to Google API: {str(e)}"
