# VarshaRaksha Multi-Agent Architecture

VarshaRaksha now includes a deterministic, explainable multi-agent coordination layer behind the existing API.

## Architecture

A supervisor runs specialized agents in a controlled sequence:

1. **Observation Agent** — normalizes rainfall, water level, citizen reports, GPS, drainage signals and location.
2. **Evidence Verification Agent** — calculates evidence confidence, creates a geohash/evidence key and flags possible duplicates.
3. **Risk Scoring Agent** — generates a 0–100 score and GREEN/ORANGE/RED warning band.
4. **Cause Diagnosis Agent** — classifies rainfall overload, suspected blocked drain, mixed runoff or normal drainage.
5. **Resource Allocation Agent** — ranks response resources using availability, cause fit and distance.
6. **Safety Routing Agent** — creates safe-route and evacuation guidance.
7. **Notification Agent** — determines audience, escalation level and communication channels.
8. **Audit & Learning Agent** — produces a trace ID, explainability statements, human-approval guardrails and feedback actions.

## API endpoints

- `GET /api/agents/status` — agent registry and architecture metadata.
- `GET /api/agents/runs?limit=8` — persisted orchestration traces.
- `POST /api/agents/analyze` — run the multi-agent workflow for a new scenario.
- `POST /api/incidents/:id/coordinate` — coordinate an existing incident.
- `POST /api/simulations/what-if` — compare baseline, heavy rain, blocked drain and rapid rise scenarios.

The report ingestion endpoint also attempts to run the orchestrator automatically after an incident is created. If the orchestration layer is unavailable, the original report is still returned and the warning is logged.

## Human-in-the-loop guardrails

- RED risk or low evidence confidence sets `humanApprovalRequired` to `true`.
- The system recommends actions; it does not silently claim that a real-world rescue action has been executed.
- The existing verification, false-alarm and manual-override endpoints remain available to authorities.

## Demo flow

1. Open the web dashboard.
2. Select **Multi-Agent Control** from the sidebar.
3. Run an analysis with a blocked-drain signal and rising water level.
4. Show the eight-agent execution trace, risk score, cause diagnosis, resource recommendation and explainability panel.
5. Run the what-if simulation to demonstrate how changing conditions alter the risk band.
