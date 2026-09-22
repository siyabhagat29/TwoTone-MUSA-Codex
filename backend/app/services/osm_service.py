import math
import requests
from typing import List, Dict, Any, Optional
from ..config import (
    TOMTOM_API_KEY,
    OSRM_ROUTING_URL,
    NOMINATIM_API_URL,
    OVERPASS_API_URL,
    NGO_EMERGENCY_NUMBER
)

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def classify_facility_type(name: str, tags: Dict[str, Any] = {}) -> str:
    n = (name or "").lower()
    amenity = str(tags.get("amenity", "")).lower()
    leisure = str(tags.get("leisure", "")).lower()
    building = str(tags.get("building", "")).lower()
    social = str(tags.get("social_facility", "")).lower()

    if "food bank" in n or social == "food_bank":
        return "food bank"
    if "humanitarian" in n or "aid point" in n:
        return "humanitarian center"
    if "disaster" in n or "relief center" in n:
        return "disaster relief center"
    if "evacuation" in n or amenity == "shelter" or social == "shelter" or "tent" in n:
        return "evacuation center"
    if "ngo" in n or "volunteer" in n:
        return "NGO relief hub"
    if "stadium" in n or leisure == "stadium":
        return "stadium"
    if "sports" in n or leisure == "sports_centre" or "complex" in n or "pavilion" in n:
        return "sports complex"
    if "college" in n or "university" in n or amenity == "college":
        return "college"
    if "school" in n or amenity == "school":
        return "school"
    if "hall" in n or "bhavan" in n or amenity == "community_centre" or "community" in n:
        return "community hall"
    if any(k in n for k in ["temple", "church", "mosque", "gurudwara"]) or amenity == "place_of_worship":
        return "religious/community building"
    if any(k in n for k in ["government", "municipal", "bmc"]) or building in ["public", "civic"]:
        return "government building"
    return "relief center"

def lookup_facility_phone(name: str, facility_type: str = "", existing_phone: Optional[str] = None) -> str:
    if existing_phone and len(existing_phone.strip()) >= 4 and "9869001892" not in existing_phone:
        return existing_phone.strip()
    
    n = (name or "").lower()
    t = (facility_type or "").lower()

    if any(k in n for k in ["bmc", "municipal", "government"]) or "government" in t:
        return "1916 / 022-22694727"
    if any(k in n for k in ["red cross", "civil defense"]):
        return "022-22661524 / 022-22644299"
    if any(k in n for k in ["food bank", "ration", "seva"]) or "food" in t:
        return "1800-209-4357 / 022-24955110"
    if any(k in n for k in ["stadium", "sports"]) or "sports" in t:
        return "022-22812733 / 1916"
    if any(k in n for k in ["school", "college"]) or "school" in t or "college" in t:
        return "022-22694727 / 1916"
    if any(k in n for k in ["ngo", "relief", "humanitarian", "aid", "tent"]) or "ngo" in t:
        return "1800-11-2334 / 022-22694725"
    return "1916 / 112 (Disaster Helpline)"

def is_excluded_facility(name: str, tags: Dict[str, Any] = {}) -> bool:
    n = (name or "").lower()
    amenity = str(tags.get("amenity", "")).lower()
    if amenity in ["hospital", "clinic", "doctors", "pharmacy", "police", "fire_station"]:
        return True
    if any(k in n for k in ["hospital", "clinic", "police station", "fire station", "trauma center", "ambulance"]):
        return True
    return False

def search_tomtom_shelters(latitude: float, longitude: float, radius_km: float = 10.0) -> List[Dict[str, Any]]:
    if not TOMTOM_API_KEY or TOMTOM_API_KEY == "your_key_here" or len(TOMTOM_API_KEY) < 8 or TOMTOM_API_KEY.startswith("tomrouting"):
        return []
    
    radius_m = min(50000, int(radius_km * 1000))
    queries = ["community hall", "school", "stadium", "shelter", "evacuation center"]
    results = []

    for q in queries:
        try:
            url = f"https://api.tomtom.com/search/2/poiSearch/{q}.json?lat={latitude}&lon={longitude}&radius={radius_m}&key={TOMTOM_API_KEY}&limit=6"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("results", []):
                    name = item.get("poi", {}).get("name", "Civic Public Shelter")
                    if is_excluded_facility(name):
                        continue
                    pos = item.get("position", {})
                    addr = item.get("address", {}).get("freeformAddress", "Near Local Road")
                    results.append({
                        "id": f"SHL-TT-{item.get('id', 'poi')}",
                        "name": name,
                        "type": classify_facility_type(name),
                        "shelterType": classify_facility_type(name),
                        "facilityType": classify_facility_type(name),
                        "latitude": pos.get("lat"),
                        "longitude": pos.get("lon"),
                        "lat": pos.get("lat"),
                        "lng": pos.get("lon"),
                        "address": addr,
                        "phone": item.get("poi", {}).get("phone"),
                        "provider": "tomtom",
                        "is_verified": False,
                        "isVerified": False,
                        "capacity": "Discovered Public Space Capacity"
                    })
        except Exception:
            continue
    return results

def search_overpass_shelters(latitude: float, longitude: float, radius_km: float = 10.0) -> List[Dict[str, Any]]:
    radius_m = min(50000, int(radius_km * 1000))
    query = f"""
    [out:json][timeout:8];(
      node["amenity"~"shelter|community_centre|school|college|place_of_worship"](around:{radius_m},{latitude},{longitude});
      node["leisure"~"sports_centre|stadium"](around:{radius_m},{latitude},{longitude});
      node["social_facility"~"shelter|food_bank"](around:{radius_m},{latitude},{longitude});
      node["building"~"public|civic"](around:{radius_m},{latitude},{longitude});
    );out 15;
    """
    try:
        resp = requests.post(OVERPASS_API_URL, data={"data": query}, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            results = []
            for el in data.get("elements", []):
                tags = el.get("tags", {})
                name = tags.get("name") or tags.get("name:en") or tags.get("description") or "Public Relief Facility"
                if is_excluded_facility(name, tags):
                    continue
                addr_parts = [tags.get("addr:street"), tags.get("addr:suburb"), tags.get("addr:city")]
                addr = ", ".join(p for p in addr_parts if p) or f"{tags.get('amenity', 'Civic Ground')} near Area"
                f_type = classify_facility_type(name, tags)
                results.append({
                    "id": f"SHL-OSM-{el.get('id')}",
                    "name": name,
                    "type": f_type,
                    "shelterType": f_type,
                    "facilityType": f_type,
                    "latitude": el.get("lat"),
                    "longitude": el.get("lon"),
                    "lat": el.get("lat"),
                    "lng": el.get("lon"),
                    "address": addr,
                    "phone": tags.get("phone") or tags.get("contact:phone"),
                    "provider": "overpass",
                    "is_verified": False,
                    "isVerified": False,
                    "capacity": f"{tags.get('capacity')} People" if tags.get("capacity") else "Discovered Public Space Capacity"
                })
            return results
    except Exception:
        pass
    return []

def get_nearby_shelters(
    latitude: float,
    longitude: float,
    radius_km: float = 10.0,
    registered_shelters: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    u_lat = float(latitude)
    u_lng = float(longitude)
    r_km = float(radius_km)

    all_shelters = []

    # 1. Registered database shelters
    for sh in (registered_shelters or []):
        s_lat = sh.get("lat") or sh.get("latitude")
        s_lng = sh.get("lng") or sh.get("longitude")
        if s_lat is None or s_lng is None:
            continue
        d_km = haversine_km(u_lat, u_lng, s_lat, s_lng)
        if d_km <= r_km:
            eta = max(2, int(d_km * 3.5 + 2))
            maps_url = f"https://www.google.com/maps/dir/?api=1&origin={u_lat},{u_lng}&destination={s_lat},{s_lng}"
            all_shelters.append({
                "id": sh.get("id", "REG-SHL"),
                "name": sh.get("name", "Verified Evacuation Center"),
                "type": sh.get("type") or "evacuation center",
                "shelterType": sh.get("type") or "evacuation center",
                "facilityType": sh.get("type") or "evacuation center",
                "latitude": s_lat,
                "longitude": s_lng,
                "lat": s_lat,
                "lng": s_lng,
                "address": sh.get("station") or sh.get("address", "Registered Disaster Relief Wing"),
                "phone": lookup_facility_phone(sh.get("name", ""), sh.get("type", ""), sh.get("phone")),
                "distance_km": d_km,
                "distanceKm": d_km,
                "eta_minutes": eta,
                "etaMin": eta,
                "maps_url": maps_url,
                "routeUrl": maps_url,
                "provider": "registered",
                "is_verified": True,
                "isVerified": True,
                "agency": sh.get("agency", "Civil Defense & Registered NGO"),
                "capacity": sh.get("capacity", "500 Beds + 75 Relief Tents"),
                "status": sh.get("status", "Available / Active")
            })

    # 2. Live POI Discovery (TomTom -> Overpass Fallback)
    discovered = search_tomtom_shelters(u_lat, u_lng, r_km)
    if not discovered:
        discovered = search_overpass_shelters(u_lat, u_lng, r_km)

    for poi in discovered:
        s_lat = poi["latitude"]
        s_lng = poi["longitude"]
        d_km = haversine_km(u_lat, u_lng, s_lat, s_lng)
        if d_km <= r_km:
            eta = max(2, int(d_km * 3.5 + 2))
            maps_url = f"https://www.google.com/maps/dir/?api=1&origin={u_lat},{u_lng}&destination={s_lat},{s_lng}"
            poi["phone"] = lookup_facility_phone(poi.get("name", ""), poi.get("type", ""), poi.get("phone"))
            poi["distance_km"] = d_km
            poi["distanceKm"] = d_km
            poi["eta_minutes"] = eta
            poi["etaMin"] = eta
            poi["maps_url"] = maps_url
            poi["routeUrl"] = maps_url
            all_shelters.append(poi)

    # Deduplicate
    seen = set()
    deduped = []
    for s in all_shelters:
        k = f"{s['name'].lower().strip()}_{round(s['lat'], 3)}_{round(s['lng'], 3)}"
        if k not in seen:
            seen.add(k)
            deduped.append(s)

    # Sort: verified first, then ascending by distance
    deduped.sort(key=lambda x: (not x.get("is_verified", False), x.get("distance_km", 999.0)))
    return deduped
