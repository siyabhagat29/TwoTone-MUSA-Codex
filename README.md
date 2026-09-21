# VarshaRaksha — Hyperlocal Flood-Risk Alert System

A hackathon-ready full-stack prototype based on the TwoTone Codex 2026 PPT for **CX0404 — Flood Street, No Warning**.

The system is split into:
- **React web dashboard** for municipal authorities, emergency/response teams and ward administrators.
- **React Native / Expo mobile app** for residents and shopkeepers/vendors.
- **Node/Express API** with a Supabase-ready data layer and demo intelligence endpoints.

## Features implemented in the prototype

### Resident / Vendor mobile app
- Hyperlocal flood-risk score (0–100) with Green / Orange / Red status.
- Real-time alert feed.
- 20-minute early-warning messaging.
- One-tap SOS / incident report.
- Photo + GPS + timestamp report flow.
- AI waterlogging/photo verification simulation.
- Rainfall + local evidence summary.
- Cause-aware result: rainfall overload / blocked drain / mixed / under review.
- Safe-route and nearby-shelter cards.
- Report history and incident status.
- Notification preferences and alert-threshold settings.
- Vendor mode with shop-protection checklist.
- Offline-friendly queued report concept.

### Authority web dashboard
- Live ward overview with risk cards.
- Hyperlocal risk map with road/zone hotspots.
- Live alerts and incident queue.
- Severity / priority score.
- Cause-aware classification.
- Duplicate/similarity grouping.
- Dispatch panel for pumping/drainage/general support/PagerDuty escalation.
- Citizen report review with photo evidence.
- Drainage issue / chronic blockage map.
- Maintenance report generation.
- Analytics for recurring hotspots, causes and response time.
- User management and role filters.
- Data-source health: Open-Meteo, SACHET/NDMA, Blitzortung, OSRM/OSM/GIS.
- Simulation controls for demo day.

## Architecture

```text
React Native (Resident/Vendor)
          |
          | REST
          v
     Node/Express API  <---->  Supabase-ready persistence
          |
          +---- Risk / Cause / Dedup / Dispatch engine
          |
          +---- External adapters (Open-Meteo, SACHET, Blitzortung,
          |     OSRM/OSM/GIS, Twilio, Resend, PagerDuty)
          |
          +---- CV / AI adapter
          |
          v
React Authority Dashboard
```

This repository keeps external services mocked by default so the demo runs without API keys. Adapter boundaries are included for connecting the services named in the PPT.

## Run

### Run Everything (Web + Backend API)
```bash
npm install
npm run dev
```
- **Authority Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Node API Server**: [http://localhost:5001](http://localhost:5001)

To run web, server, and the mobile bundler together:
```bash
npm run dev:all
```

### Individual Services

#### Web Dashboard
```bash
npm run web
```
Runs Vite dev server on `http://localhost:5173`.

#### Backend API
```bash
npm run server
```
Runs Express API on `http://localhost:5001`.

#### Mobile App (Resident / Vendor)
```bash
npm run mobile
# or
cd apps/mobile && npx expo start
```

## Environment

Copy `server/.env.example` to `server/.env`.

Supabase / notification / AI variables are optional in demo mode.

## Notes

The 20-minute value is a **design target from the problem statement**, not a guaranteed prediction. Real deployments need validated rainfall, GIS, CV and operational models, plus municipal authorization and emergency-process integration.
