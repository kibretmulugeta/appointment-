from fastapi import APIRouter, Query
from typing import List, Dict, Any
import httpx
from app.config import settings

router = APIRouter(prefix="/api/maps", tags=["Maps"])

@router.get("/search")
async def search_places(q: str = Query(..., min_length=2)):
    """Proxy endpoint for Google Maps Places Autocomplete / Places Search."""
    if not q:
        return []

    # If Google Maps API key is configured, query Google Places API
    if settings.GOOGLE_MAPS_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://maps.googleapis.com/maps/api/place/autocomplete/json",
                    params={
                        "input": q,
                        "key": settings.GOOGLE_MAPS_API_KEY,
                        "types": "establishment|geocode"
                    },
                    timeout=5.0
                )
                if res.status_code == 200:
                    data = res.json()
                    predictions = data.get("predictions", [])
                    results = []
                    for p in predictions:
                        results.append({
                            "place_id": p.get("place_id"),
                            "name": p.get("structured_formatting", {}).get("main_text", p.get("description")),
                            "address": p.get("description"),
                            "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={httpx.QueryParams({'query': p.get('description')}).get('query')}"
                        })
                    return results
        except Exception:
            pass

    # Built-in Fallback Places (for instant zero-credential demonstration)
    default_places = [
        {
            "place_id": "starbucks_bole",
            "name": "Starbucks Bole",
            "address": "Bole Road, Addis Ababa, Ethiopia",
            "latitude": 8.9953,
            "longitude": 38.7845,
            "google_maps_url": "https://www.google.com/maps/search/?api=1&query=Starbucks+Bole+Road+Addis+Ababa"
        },
        {
            "place_id": "hilton_hotel",
            "name": "Hilton Addis Ababa",
            "address": "Menelik II Ave, Addis Ababa, Ethiopia",
            "latitude": 9.0185,
            "longitude": 38.7614,
            "google_maps_url": "https://www.google.com/maps/search/?api=1&query=Hilton+Addis+Ababa"
        },
        {
            "place_id": "sheraton_hotel",
            "name": "Sheraton Addis",
            "address": "Taitu Street, Addis Ababa, Ethiopia",
            "latitude": 9.0201,
            "longitude": 38.7584,
            "google_maps_url": "https://www.google.com/maps/search/?api=1&query=Sheraton+Addis"
        },
        {
            "place_id": "office_hq",
            "name": "Main Office Conference Room A",
            "address": "HQ Tower, Suite 400, Financial District",
            "latitude": 9.0100,
            "longitude": 38.7600,
            "google_maps_url": "https://www.google.com/maps/search/?api=1&query=HQ+Tower+Financial+District"
        }
    ]

    filtered = [p for p in default_places if q.lower() in p["name"].lower() or q.lower() in p["address"].lower()]
    if not filtered:
        # Dynamic query fallback place
        filtered.append({
            "place_id": f"custom_{hash(q)}",
            "name": q,
            "address": f"{q}, City Center",
            "latitude": 9.0100,
            "longitude": 38.7600,
            "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={q.replace(' ', '+')}"
        })
    return filtered

@router.get("/place/{place_id}")
async def get_place_details(place_id: str):
    """Proxy endpoint to fetch detailed place coordinates and address."""
    if settings.GOOGLE_MAPS_API_KEY and not place_id.startswith("starbucks_") and not place_id.startswith("custom_"):
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://maps.googleapis.com/maps/api/place/details/json",
                    params={
                        "place_id": place_id,
                        "key": settings.GOOGLE_MAPS_API_KEY,
                        "fields": "name,formatted_address,geometry,url"
                    },
                    timeout=5.0
                )
                if res.status_code == 200:
                    result = res.json().get("result", {})
                    loc = result.get("geometry", {}).get("location", {})
                    return {
                        "place_id": place_id,
                        "name": result.get("name"),
                        "address": result.get("formatted_address"),
                        "latitude": loc.get("lat"),
                        "longitude": loc.get("lng"),
                        "google_maps_url": result.get("url") or f"https://www.google.com/maps/search/?api=1&query={result.get('name')}"
                    }
        except Exception:
            pass

    return {
        "place_id": place_id,
        "name": place_id.replace("_", " ").title(),
        "address": "Bole Road, Addis Ababa, Ethiopia",
        "latitude": 8.9953,
        "longitude": 38.7845,
        "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={place_id.replace('_', '+')}"
    }
