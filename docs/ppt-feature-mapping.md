# PPT → implementation mapping

| PPT requirement | Implementation |
|---|---|
| Live rainfall + crowd photos + drainage maps | Web Data Sources + mobile report + risk cards |
| AI flood-risk analysis | `/api/risk/score` + cause engine + UI AI verification preview |
| Cause-aware detection | `classifyCause()` + Dispatch rationale |
| Hyperlocal alerts | Live alerts page + mobile alert feed |
| 20-minute early-warning focus | Risk card ETA / alert ETA |
| Risk score 0–100 / Green / Orange / Red | `scoreRisk()` + `RiskBadge` |
| Smart dispatch | Dispatch page + `/api/dispatch` |
| CV waterlogging verification | Incident review evidence + mobile report preview |
| Deduplication | `/api/deduplicate` + duplicate incident display |
| User-specific preferences | Mobile Profile & preferences |
| Recurring drainage problems | Drainage intelligence page |
| Authority ward dashboard | React web dashboard |
| Residents / shopkeepers | React Native role-based mobile experience |
| SACHET/NDMA cross-check | Data Sources UI |
| Blitzortung lightning signal | Data Sources UI |
| OSRM/OSM/GIS | Data Sources UI + map/routing concept |
| Twilio/Resend/PagerDuty | Notification channel chips + dispatch escalation |
| Supabase | Server adapter boundary + data-source status |
| OpenAI / FAISS | AI insight / vector-search architecture boundary |
