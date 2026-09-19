# VarshaRaksha API contract

- GET `/api/zones` — current hyperlocal risk zones
- GET `/api/incidents` — citizen reports
- GET `/api/alerts` — active alerts
- GET `/api/dispatches` — response dispatches
- GET `/api/data-sources` — integration health
- POST `/api/risk/score` — `{ rainfall, waterLevel, reports, drainPenalty, blockedDrainSignal }`
- POST `/api/reports` — incident report payload
- POST `/api/alerts/simulate` — demo alert generator
- POST `/api/dispatch` — create cause-specific dispatch
- POST `/api/deduplicate` — GeoHash/similarity-ready report grouping
