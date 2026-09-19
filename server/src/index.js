import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { store } from "./store.js";
import { fetchLiveWeather, fetchFloodMetrics, reverseGeocode, checkAllDataSources } from "./weatherService.js";
import { scoreRisk, classifyCause, dedupeReports } from "./engine.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));

// Initial weather sync on startup
store.syncLiveWeatherData().catch((err) => console.warn("[init] Weather sync warning:", err.message));

// Health
app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    service: "VarshaRaksha Live API",
    mode: "Real Data Connected",
    timestamp: new Date().toISOString()
  });
});

// Zones, Incidents, Alerts, Dispatches
app.get("/api/zones", (_, res) => res.json(store.getZones()));
app.get("/api/incidents", (_, res) => res.json(store.getIncidents()));
app.get("/api/alerts", (_, res) => res.json(store.getAlerts()));
app.get("/api/dispatches", (_, res) => res.json(store.getDispatches()));

// Real Data Sources with live latency & health probes
app.get("/api/data-sources", async (_, res) => {
  try {
    const sources = await checkAllDataSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live Weather & Flood query for any coordinates (GPS / Custom Lat-Lng)
app.get("/api/weather/live", async (req, res) => {
  const lat = Number(req.query.lat) || 19.132;
  const lng = Number(req.query.lng) || 72.848;
  try {
    const [weather, flood, geo] = await Promise.all([
      fetchLiveWeather(lat, lng),
      fetchFloodMetrics(lat, lng),
      reverseGeocode(lat, lng)
    ]);
    res.json({
      location: { lat, lng, ...geo },
      weather,
      floodMetrics: flood
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync live weather from Open-Meteo across all zones
app.post("/api/weather/sync", async (_, res) => {
  try {
    const zones = await store.syncLiveWeatherData();
    res.json({ success: true, zones, alerts: store.getAlerts() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real Incident Report from Mobile or Web
app.post("/api/reports", async (req, res) => {
  try {
    let address = req.body.address;
    // If coords given but no address, reverse geocode via OSM
    if (!address && req.body.lat && req.body.lng) {
      const geo = await reverseGeocode(req.body.lat, req.body.lng);
      address = geo.road ? `${geo.road}, ${geo.ward}` : geo.displayName;
    }

    const report = await store.addReport({
      ...req.body,
      address
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify an incident
app.post("/api/incidents/:id/verify", (req, res) => {
  const inc = store.verifyIncident(req.params.id);
  if (!inc) return res.status(404).json({ error: "Incident not found" });
  res.json({ success: true, incident: inc });
});

// Real Dispatch Action
app.post("/api/dispatch", (req, res) => {
  try {
    const dispatch = store.addDispatch(req.body);
    res.status(201).json(dispatch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reverse Geocode helper
app.get("/api/geocode", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng required" });
  const geo = await reverseGeocode(lat, lng);
  res.json(geo);
});

// Risk score calculation utility
app.post("/api/risk/score", (req, res) => {
  const result = scoreRisk(req.body);
  const cause = classifyCause(req.body);
  res.json({ ...result, cause });
});

// Deduplication
app.post("/api/deduplicate", (req, res) => {
  res.json(dedupeReports(req.body.reports || []));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`VarshaRaksha API running on http://0.0.0.0:${PORT} (Real Data Connected)`);
});
