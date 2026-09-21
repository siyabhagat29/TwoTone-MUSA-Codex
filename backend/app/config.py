import os
from dotenv import load_dotenv

load_dotenv()

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY") or os.getenv("routingTomTomApi", "")
OSRM_ROUTING_URL = os.getenv("OSRM_ROUTING_URL", "https://router.project-osrm.org/route/v1/driving")
NOMINATIM_API_URL = os.getenv("NOMINATIM_API_URL", "https://nominatim.openstreetmap.org/search")
OVERPASS_API_URL = os.getenv("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
NGO_EMERGENCY_NUMBER = "1800-11-2334 / 022-22694725"
FIRE_EMERGENCY_NUMBER = "101 / 022-23076111"
MEDICAL_EMERGENCY_NUMBER = "108 / 022-26207254"

