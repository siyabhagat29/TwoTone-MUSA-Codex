from fastapi import FastAPI, Query
from typing import Optional
from .services.osm_service import get_nearby_shelters

app = FastAPI(title="VarshaRaksha Emergency API", version="1.0.0")

@app.get("/api/shelters/nearby")
async def nearby_shelters(
    latitude: float = Query(19.132, description="User GPS latitude"),
    longitude: float = Query(72.848, description="User GPS longitude"),
    radius_km: float = Query(10.0, description="Search radius in km")
):
    return get_nearby_shelters(latitude, longitude, radius_km)
