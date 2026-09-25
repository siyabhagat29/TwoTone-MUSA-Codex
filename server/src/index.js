import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import dotenv from "dotenv";
import { store } from "./store.js";
import { uploadMediaToSupabase } from "./supabaseService.js";
import {
  fetchLiveWeather,
  fetchFloodMetrics,
  reverseGeocode,
  forwardGeocode,
  checkAllDataSources,
  calculateRoute,
  fetchLivePublicShelters,
  fetchLiveNearbyEmergencyServices,
  fetchNearbyLiveShelters
} from "./weatherService.js";
import { scoreRisk, classifyCause, encodeGeohash, hashEvidence, getAutoRoutedTeam } from "./engine.js";
import { agentRegistry, coordinateIncident, simulateWhatIf, executeSingleAgent } from "./agents/orchestrator.js";
import { coordinationStore } from "./agents/coordinationStore.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for native binary video and photo multipart uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes("video") ? ".mp4" : ".jpg");
    const uniqueName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(morgan("dev"));

// Initial weather sync on startup and recurring background sync every 60s
store.syncLiveWeatherData().catch((err) => console.warn("[init] Weather sync warning:", err.message));
setInterval(() => {
  store.syncLiveWeatherData().catch((err) => console.warn("[bg-sync] Weather sync warning:", err.message));
}, 60000);

// Multi-agent orchestration APIs
app.get("/api/agents/status", (_, res) => {
  res.json({
    architecture: "sequential-supervisor-multi-agent",
    supervisor: "VarshaRaksha Coordination Supervisor",
    agents: agentRegistry.map((agent) => ({ ...agent, status: "ready" })),
    capabilities: ["evidence verification", "risk scoring", "cause diagnosis", "resource allocation", "safe routing", "notification planning", "audit trail"]
  });
});

app.get("/api/agents/runs", (req, res) => {
  res.json(coordinationStore.list(req.query.limit));
});

app.delete("/api/agents/runs", (_, res) => {
  coordinationStore.clear();
  res.json({ success: true, message: "Agent run history cleared" });
});

app.get("/api/agents/runs/:runId", (req, res) => {
  const run = coordinationStore.get(req.params.runId);
  if (!run) return res.status(404).json({ error: "Run not found" });
  res.json(run);
});

app.post("/api/agents/runs/:runId/action", (req, res) => {
  const { action, teamId, team, reason, user = "Ward Authority Admin" } = req.body || {};
  const run = coordinationStore.get(req.params.runId);
  if (!run) return res.status(404).json({ error: "Run not found" });

  const now = new Date().toISOString();
  let updatedRun;
  let dispatchResult = null;

  if (action === "approve") {
    // Human approval: trigger dispatch if incident exists or if recommended resource is present
    const recTeam = run.decision?.resource?.recommended;
    if (run.incidentId) {
      try {
        dispatchResult = store.addDispatch({
          incidentId: run.incidentId,
          team: recTeam?.name || "Emergency Response Team",
          teamId: recTeam?.id || "TEAM-01",
          reason: `Approved by ${user} via Multi-Agent Supervisor. Risk: ${run.decision?.risk?.score}/100`,
          eta: "10-15 mins",
          isOverride: false
        });
      } catch (err) {
        console.warn("[agent-action] Auto-dispatch failed:", err.message);
      }
    }
    updatedRun = coordinationStore.update(req.params.runId, {
      audit: {
        approvalStatus: "approved",
        approvedAt: now,
        approvedBy: user,
        dispatchId: dispatchResult?.id || null
      }
    });
  } else if (action === "override") {
    const chosenTeam = team || "Specialized Response Unit";
    if (run.incidentId) {
      try {
        dispatchResult = store.overrideDispatch({
          incidentId: run.incidentId,
          team: chosenTeam,
          teamId: teamId || "OVERRIDE-01",
          reason: reason || `Manual override by ${user}`,
          force: true
        });
      } catch (err) {
        console.warn("[agent-action] Override dispatch failed:", err.message);
      }
    }
    updatedRun = coordinationStore.update(req.params.runId, {
      decision: {
        ...run.decision,
        resource: {
          ...run.decision?.resource,
          recommended: { id: teamId || "OVERRIDE-01", name: chosenTeam, status: "Overridden" }
        }
      },
      audit: {
        approvalStatus: "overridden",
        approvedAt: now,
        approvedBy: user,
        overrideReason: reason || "Designated alternate team by authority admin",
        dispatchId: dispatchResult?.id || null
      }
    });
  } else if (action === "false_alarm") {
    if (run.incidentId) {
      store.markFalseAlarm(run.incidentId, reason || `Flagged as false alarm by ${user} via multi-agent console.`);
    }
    updatedRun = coordinationStore.update(req.params.runId, {
      audit: {
        approvalStatus: "false_alarm",
        actedAt: now,
        actedBy: user,
        falseAlarmReason: reason || "Ground check verified no flood risk"
      }
    });
  } else if (action === "acknowledge") {
    updatedRun = coordinationStore.update(req.params.runId, {
      audit: {
        approvalStatus: "acknowledged",
        actedAt: now,
        actedBy: user
      }
    });
  } else {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  res.json({ success: true, run: updatedRun, dispatch: dispatchResult });
});

app.post("/api/agents/:agentId/execute", (req, res) => {
  try {
    const result = executeSingleAgent(req.params.agentId, req.body || {}, { resources: store.getResources() });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/agents/analyze", async (req, res) => {
  try {
    const result = await coordinateIncident(req.body || {}, { resources: store.getResources() });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/incidents/:id/coordinate", async (req, res) => {
  try {
    const incident = store.getIncidents().find((item) => item.id === req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    const result = await coordinateIncident({ ...incident, ...req.body, incidentId: incident.id }, { resources: store.getResources() });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/simulations/what-if", (req, res) => {
  try {
    res.json({ scenarios: simulateWhatIf(req.body || {}, { resources: store.getResources() }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health
app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    service: "VarshaRaksha Live API",
    mode: "Real Data Connected",
    timestamp: new Date().toISOString()
  });
});

// SSE Live Realtime Stream (supports both /api/events and /api/stream)
const handleSseStream = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive"
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, timestamp: new Date().toISOString() })}\n\n`);
  store.subscribe(res);
};

app.get("/api/events", handleSseStream);
app.get("/api/stream", handleSseStream);

// Weather sync endpoint
app.post("/api/sync-weather", async (_, res) => {
  try {
    await store.syncLiveWeatherData();
    res.json({ success: true, zones: store.getZones ? store.getZones() : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Zones, Incidents, Alerts, Dispatches, Resources, Chronic Blockages
app.get("/api/zones", (req, res) => {
  const lat = parseFloat(req.query.lat || req.query.latitude);
  const lng = parseFloat(req.query.lng || req.query.longitude);
  res.json(store.getZones ? store.getZones(lat, lng) : []);
});
app.get("/api/zones/:id", (req, res) => {
  const zones = store.getZones ? store.getZones() : [];
  const targetId = String(req.params.id || "").toLowerCase();
  const zone = zones.find((z) => String(z.id || "").toLowerCase() === targetId || String(z.name || "").toLowerCase() === targetId);
  if (!zone) return res.status(404).json({ error: "Zone not found" });
  res.json(zone);
});
app.get("/api/incidents/active", (_, res) => res.json(store.getActiveIncidents ? store.getActiveIncidents() : []));
app.get("/api/incidents", (req, res) => {
  if (req.query.status === "active") {
    return res.json(store.getActiveIncidents ? store.getActiveIncidents() : []);
  }
  res.json(store.getIncidents());
});
app.get("/api/incidents/:id", (req, res) => {
  const incident = store.getIncidentById ? store.getIncidentById(req.params.id) : store.getIncidents().find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: "Incident not found" });
  res.json(incident);
});
app.get("/api/alerts", (req, res) => {
  const lat = req.query.lat != null ? parseFloat(req.query.lat) : req.query.latitude != null ? parseFloat(req.query.latitude) : null;
  const lng = req.query.lng != null ? parseFloat(req.query.lng) : req.query.longitude != null ? parseFloat(req.query.longitude) : null;
  res.json(store.getAlerts(lat, lng));
});
app.get("/api/dispatches", (_, res) => res.json(store.getDispatches()));
app.get("/api/resources", (req, res) => {
  const lat = parseFloat(req.query.lat || req.query.latitude);
  const lng = parseFloat(req.query.lng || req.query.longitude);
  res.json(store.getResources(lat, lng));
});

// Resource Simulation generation endpoint (Dynamic real-location emergency simulation)
const handleSimulateResources = async (req, res) => {
  try {
    let lat = parseFloat(req.body?.latitude || req.body?.lat || req.query?.lat || req.query?.latitude);
    let lng = parseFloat(req.body?.longitude || req.body?.lng || req.query?.lng || req.query?.longitude);
    const radiusKm = parseFloat(req.body?.radius_km || req.body?.radius || req.query?.radius_km) || 6.0;
    
    // If incidentId provided and lat/lng not provided, resolve from incident
    if ((isNaN(lat) || isNaN(lng)) && req.body?.incidentId) {
      const inc = store.getIncidents().find((i) => i.id === req.body.incidentId);
      if (inc) {
        lat = Number(inc.lat ?? inc.latitude ?? inc.liveLocation?.latitude);
        lng = Number(inc.lng ?? inc.longitude ?? inc.liveLocation?.longitude);
      }
    }

    const result = await store.generateSimulation({ latitude: lat, longitude: lng, radiusKm });
    res.json({
      success: true,
      message: "Simulation generated successfully.",
      ...result
    });
  } catch (err) {
    console.error("[/api/resources/simulate error]:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Unable to discover nearby facilities."
    });
  }
};

app.post("/api/resources/simulate", handleSimulateResources);
app.post("/resources/simulate", handleSimulateResources);

// Clear simulation endpoint
const handleClearResources = (req, res) => {
  try {
    const result = store.clearSimulation();
    res.json({
      success: true,
      message: "Resource simulation cleared successfully.",
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post("/api/resources/clear", handleClearResources);
app.delete("/api/resources/simulate", handleClearResources);
app.delete("/api/resources", handleClearResources);
app.get("/api/chronic-blockages", (_, res) => res.json(store.getChronicBlockages()));

// Dedicated Dynamic Emergency Resources for a Specific Incident
// GET /api/incidents/:id/nearby-resources?radius_km=5&category=all
app.get("/api/incidents/:id/nearby-resources", async (req, res) => {
  try {
    const incidentId = req.params.id;
    const incident = store.getIncidents().find((i) => i.id === incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, error: `Incident ${incidentId} not found`, resources: [] });
    }

    const lat = Number(incident.lat ?? incident.latitude ?? incident.liveLocation?.latitude);
    const lng = Number(incident.lng ?? incident.longitude ?? incident.liveLocation?.longitude);

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return res.status(400).json({
        success: false,
        error: "Incident location unavailable.",
        incident: { id: incident.id, address: incident.address },
        resources: []
      });
    }

    const radiusKm = parseFloat(req.query.radius_km || req.query.radius) || 5;
    const category = req.query.category || "all";

    const resources = await fetchLiveNearbyEmergencyServices(lat, lng, radiusKm, category);

    // Calculate real road distance & ETA for top nearby resources
    const resourcesWithEta = await Promise.all(
      resources.map(async (r, index) => {
        let etaMinutes = r.etaMinutes;
        let routeData = null;
        if (index < 6 && r.lat && r.lng) {
          try {
            const route = await calculateRoute(r.lat, r.lng, lat, lng);
            if (route && route.success) {
              etaMinutes = route.durationMin || Math.max(2, Math.round(route.distanceKm * 2.4 + 2));
              routeData = {
                distanceKm: route.distanceKm,
                durationMin: route.durationMin,
                isOsrm: route.isOsrm,
                coordinates: route.coordinates
              };
            }
          } catch {}
        }
        return {
          ...r,
          distance_km: r.distanceKm,
          etaMinutes,
          eta_minutes: etaMinutes,
          etaText: etaMinutes != null ? `${etaMinutes} min` : "ETA unavailable",
          routeData
        };
      })
    );

    res.json({
      success: true,
      incident: {
        id: incident.id,
        lat,
        lng,
        address: incident.address || incident.location || incident.zoneId || "Incident Site",
        cause: incident.cause,
        causeCode: incident.causeCode,
        status: incident.status,
        severity: incident.severity,
        assignedTeam: incident.assignedTeam,
        dispatchProgress: incident.dispatchProgress,
        isSos: incident.isSos || incident.type === "SOS" || incident.causeCode === "SOS_EMERGENCY"
      },
      radiusKm,
      count: resourcesWithEta.length,
      resources: resourcesWithEta
    });
  } catch (err) {
    console.error("[/api/incidents/:id/nearby-resources error]:", err.message);
    res.status(500).json({ success: false, error: err.message, resources: [] });
  }
});

// Emergency Services (Google Maps Nearby Search + 4 Categories: Hospitals & ICUs, Fire & Rescue, Police, NGOs & Tents)
app.get("/api/emergency-services", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat || req.query.latitude);
    const lng = parseFloat(req.query.lng || req.query.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "lat and lng parameters are required and must be valid numbers" });
    }
    const radius = Number(req.query.radius_km || req.query.radius) || 5;
    const category = req.query.category || "all";
    const services = await fetchLiveNearbyEmergencyServices(lat, lng, radius, category);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Location-Based Live Shelter Discovery Endpoint
// GET /api/shelters/nearby?latitude={lat}&longitude={lng}&radius_km=10
app.get("/api/shelters/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.latitude || req.query.lat);
    const lng = parseFloat(req.query.longitude || req.query.lng);
    const radiusKm = parseFloat(req.query.radius_km || req.query.radius) || 10;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid coordinates provided", latitude: req.query.latitude, longitude: req.query.longitude });
    }

    const registeredShelters = store.getRegisteredShelters ? store.getRegisteredShelters() : [];
    const shelters = await fetchNearbyLiveShelters({
      latitude: lat,
      longitude: lng,
      radiusKm,
      registeredShelters
    });

    console.log(`[API /api/shelters/nearby] Coordinates: (${lat.toFixed(4)}, ${lng.toFixed(4)}) | Radius: ${radiusKm}km | Found: ${shelters.length} shelters`);
    res.json(shelters);
  } catch (err) {
    console.error("[API /api/shelters/nearby] Discovery error:", err.message);
    res.status(500).json({ error: "Failed to discover nearby shelters", message: err.message });
  }
});

app.get("/api/shelters", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat || req.query.latitude) || 19.132;
    const lng = parseFloat(req.query.lng || req.query.longitude) || 72.848;
    const radiusKm = parseFloat(req.query.radius_km || req.query.radius) || 10;
    const registeredShelters = store.getRegisteredShelters ? store.getRegisteredShelters() : [];
    const shelters = await fetchNearbyLiveShelters({
      latitude: lat,
      longitude: lng,
      radiusKm,
      registeredShelters
    });
    res.json(shelters);
  } catch (err) {
    res.json(store.getShelters ? store.getShelters(req.query.lat, req.query.lng) : []);
  }
});

// Forward & Reverse Geocoding Endpoints (Google Maps / OSM)
app.get("/api/geocode/search", async (req, res) => {
  const query = req.query.q || req.query.query;
  if (!query) return res.status(400).json({ success: false, error: "q parameter is required", results: [] });
  const result = await forwardGeocode(query);
  res.json(result);
});

app.get("/api/geocode/reverse", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, error: "lat and lng parameters are required" });
  const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
  res.json(result);
});

// User Location & Profile Sync (Heartbeat & Location Sharing)
app.post(["/api/users/location", "/api/users/heartbeat", "/api/users/profile"], (req, res) => {
  try {
    const user = store.upsertUser(req.body);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Flood Buddy: Dynamic Nearby Logged-In Users Discovery
const handleFloodBuddyNearby = (req, res) => {
  try {
    const lat = req.query.latitude ?? req.query.lat ?? 19.1320;
    const lng = req.query.longitude ?? req.query.lng ?? 72.8480;
    const radius = req.query.radius ?? 5000;
    const currentUserId = req.query.user_id ?? req.query.userId ?? req.headers["x-user-id"] ?? null;
    const maxAgeMinutes = req.query.max_age_minutes ? Number(req.query.max_age_minutes) : 120;

    const buddies = store.getNearbyFloodBuddies({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius: parseInt(radius, 10),
      currentUserId,
      maxAgeMinutes
    });

    res.json({ buddies });
  } catch (err) {
    res.status(500).json({ error: err.message, buddies: [] });
  }
};

app.get("/api/flood-buddies/nearby", handleFloodBuddyNearby);
app.get("/api/flood-buddy/nearby", handleFloodBuddyNearby);

// Flood Buddy: Send Real Warning Notification to Recipient
const handleFloodBuddyNotify = (req, res) => {
  try {
    const recipientId = req.params.recipientId || req.body.recipient_id || req.body.recipientId || req.body.targetShopId;
    const senderId = req.headers["x-user-id"] || req.body.sender_id || req.body.senderId || req.body.userId || "USR-ANON";
    const senderName = req.headers["x-user-name"] || req.body.sender_name || req.body.senderName || req.body.name || "A Flood Buddy";
    const senderRole = req.headers["x-user-role"] || req.body.sender_role || req.body.senderRole || req.body.role || "Shop Owner";
    const alertId = req.body.alert_id || req.body.alertId || null;
    const customMessage = req.body.message || req.body.custom_message || req.body.customMessage || null;

    const result = store.sendFloodBuddyNotification({
      recipientId,
      senderId,
      senderName,
      senderRole,
      alertId,
      customMessage
    });

    if (result.cooldown) {
      return res.status(429).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

app.post("/api/flood-buddies/:recipientId/notify", handleFloodBuddyNotify);
app.post("/api/flood-buddies/notify", handleFloodBuddyNotify);
app.post("/api/flood-buddy/notify", handleFloodBuddyNotify);

// User Notification History & Mark Read
app.get(["/api/users/:userId/notifications", "/api/flood-buddies/notifications"], (req, res) => {
  const userId = req.params.userId || req.query.user_id || req.query.userId || req.headers["x-user-id"];
  const notifications = store.getUserNotifications(userId);
  res.json({ notifications });
});

app.post("/api/users/:userId/notifications/:notifId/read", (req, res) => {
  const result = store.markNotificationRead(req.params.userId, req.params.notifId);
  res.json(result);
});

// Blitzortung Lightning Detection Data
app.get("/api/lightning", (_, res) => {
  res.json(store.getLightningData());
});

// SOS Emergency Rescue Trigger (with backend 500m deduplication)
const handleSosTrigger = async (req, res) => {
  try {
    const result = await store.triggerSos(req.body);
    const statusCode = result.status === "created" ? 201 : 200;
    res.status(statusCode).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/api/sos", handleSosTrigger);
app.post("/sos", handleSosTrigger);
app.get(["/api/sos", "/sos"], (_, res) => res.json(store.getSosAlerts()));
app.delete(["/api/sos", "/sos"], (_, res) => {
  try {
    const result = store.clearAllSosAlerts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alert Feedback for model calibration ("Resolved" / "False Alarm")
app.post("/api/alerts/:id/feedback", (req, res) => {
  try {
    const result = store.recordAlertFeedback(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Reputation & Spam Quarantine Endpoints
app.get("/api/reputations", (_, res) => {
  res.json(store.getAllUserReputations());
});

app.post("/api/reputations/reset", (req, res) => {
  try {
    const identifier = req.body?.identifier || req.body?.userPhone || req.body?.userName;
    if (!identifier) return res.status(400).json({ error: "identifier, userPhone, or userName required" });
    const rep = store.resetUserReputation(identifier);
    res.json({ success: true, message: `Reputation strikes reset for ${identifier}`, reputation: rep });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate official maintenance report for chronic blockages
app.post("/api/chronic-blockages/report", (_, res) => {
  const report = store.generateChronicReport();
  res.json(report);
});

// Real Data Sources with live latency & health probes
app.get("/api/data-sources", async (_, res) => {
  try {
    const sources = await checkAllDataSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live Weather & Flood query for coordinates
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

// Real OSRM Road Routing Endpoint
app.get("/api/route", async (req, res) => {
  const fromLat = parseFloat(req.query.fromLat || req.query.from_lat);
  const fromLng = parseFloat(req.query.fromLng || req.query.from_lng);
  const toLat = parseFloat(req.query.toLat || req.query.to_lat);
  const toLng = parseFloat(req.query.toLng || req.query.to_lng);
  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    return res.status(400).json({ error: "fromLat, fromLng, toLat, and toLng query parameters are required." });
  }
  try {
    const route = await calculateRoute(fromLat, fromLng, toLat, toLng);
    res.json(route);
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

import { spawn } from "child_process";

const FLOOD_AI_URL = process.env.FLOOD_AI_URL || "http://127.0.0.1:5003";
let floodAiProc = null;

function ensureFloodAiProcess() {
  fetch(`${FLOOD_AI_URL}/health`)
    .then((r) => r.json())
    .then((data) => {
      if (data && data.model_loaded) {
        console.log("🌊 [FloodAI] Microservice verified running and model loaded on port 5003.");
      }
    })
    .catch(() => {
      if (!floodAiProc) {
        console.log("🌊 [FloodAI] Starting Python flood detection microservice on port 5003...");
        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        const scriptPath = path.join(__dirname, "flood_detector_service.py");
        floodAiProc = spawn(pythonCmd, [scriptPath], {
          cwd: path.resolve(__dirname, "../../"),
          stdio: "inherit",
          shell: true,
          env: { ...process.env, FLOOD_AI_PORT: "5003", FORCE_COLOR: "1" }
        });
        floodAiProc.on("exit", (code) => {
          floodAiProc = null;
          console.warn(`[FloodAI] Process exited with code ${code}`);
        });
      }
    });
}

// Check & start AI service on server boot and periodically
ensureFloodAiProcess();
setInterval(ensureFloodAiProcess, 30000);

async function checkFloodAiMedia({ filePath, url }) {
  const urls = [FLOOD_AI_URL, "http://127.0.0.1:5003", "http://localhost:5003", "http://127.0.0.1:5002", "http://localhost:5002"];
  const uniqueUrls = [...new Set(urls)];

  for (const baseUrl of uniqueUrls) {
    try {
      const res = await fetch(`${baseUrl}/predict-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, url })
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`[Flood AI HTTP ${res.status}]:`, errJson.detail || "Inference error");
        return { error: errJson.detail || `AI service returned HTTP ${res.status}`, status: res.status };
      }
    } catch (err) {
      // try next URL
    }
  }
  console.warn("[Flood AI notice]: Could not reach Python AI service on port 5002.");
  return null;
}

// Dedicated Media Upload Endpoint for Videos & Photos (Multipart binary streaming + AI Flood Model Verification)
app.post("/api/upload-media", upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No media file uploaded" });
    }
    const filename = req.file.filename;
    const lowerFilename = filename.toLowerCase();
    const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const isVideo = req.file.mimetype.startsWith("video/") || videoExts.some((ext) => lowerFilename.endsWith(ext));

    console.log(`[Upload] Received ${isVideo ? "VIDEO" : "PHOTO"} file: ${req.file.originalname} -> ${filename} (${req.file.size} bytes, ${req.file.mimetype})`);

    // Execute fine-tuned Keras flood detection model on the uploaded media
    let aiVerification = null;
    try {
      aiVerification = await checkFloodAiMedia({ filePath: req.file.path });
      if (aiVerification && !aiVerification.error) {
        console.log(`🤖 [Flood AI] Evaluated ${filename}: ${aiVerification.label} (is_flooding: ${aiVerification.is_flooding}, conf: ${aiVerification.confidence})`);
      }
    } catch (aiErr) {
      console.warn("[upload-media AI check notice]:", aiErr.message);
    }

    if (aiVerification && aiVerification.error) {
      return res.status(400).json({
        success: false,
        error: "DECODE_ERROR",
        message: aiVerification.error
      });
    }

    let publicUrl = null;
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      publicUrl = await uploadMediaToSupabase(fileBuffer, `upload_${Date.now()}`, isVideo);
    } catch (e) {
      console.warn("[upload-media Supabase notice]:", e.message);
    }

    const finalUrl = publicUrl || `/uploads/${filename}`;
    res.status(201).json({
      success: true,
      url: finalUrl,
      filename,
      mediaType: isVideo ? "video" : "photo",
      aiVerification: aiVerification || {
        type: isVideo ? "video" : "image",
        media_type: isVideo ? "video" : "photo",
        is_flooding: false,
        flood_detected: false,
        confidence: 0.50,
        label: "Pending Verification",
        reason: "Flood AI verification in progress"
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated flood verification endpoint for explicit pre-checks
app.post("/api/verify-flood-evidence", async (req, res) => {
  try {
    const { filePath, url } = req.body;
    const aiVerification = await checkFloodAiMedia({ filePath, url });
    if (!aiVerification) {
      return res.status(503).json({ success: false, error: "AI service unavailable" });
    }
    res.json({ success: true, ...aiVerification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real Incident Report from Mobile or Web (AI Flood Detection telemetry recorded for Authorities)
app.post("/api/reports", async (req, res) => {
  try {
    let aiVerification = req.body.aiVerification;
    const hasMedia = Boolean(req.body.photoUrl || req.body.videoUrl || req.body.photo || req.body.video);

    // If media was attached but no aiVerification supplied yet, verify it for authorities
    if (hasMedia && !aiVerification) {
      const mediaUrl = req.body.videoUrl || req.body.photoUrl;
      if (mediaUrl) {
        try {
          aiVerification = await checkFloodAiMedia({ url: mediaUrl });
        } catch (mediaErr) {
          console.warn("[Media AI Verification notice]:", mediaErr.message);
        }
      }
    }

    let address = req.body.address;
    if (!address && req.body.lat && req.body.lng) {
      try {
        const geo = await reverseGeocode(req.body.lat, req.body.lng);
        address = geo.road ? `${geo.road}, ${geo.ward}` : geo.displayName;
      } catch (geoErr) {
        console.warn("[reverseGeocode notice]:", geoErr.message);
      }
    }

    const report = await store.addReport({
      ...req.body,
      address,
      aiVerified: Boolean(aiVerification?.is_flooding),
      aiFloodConfidence: aiVerification?.confidence || null,
      aiVerification
    });

    let agentOrchestration = null;
    try {
      agentOrchestration = await coordinateIncident(report, { resources: store.getResources() });
    } catch (agentErr) {
      console.warn("[multi-agent] Report orchestration warning:", agentErr.message);
    }

    res.status(201).json({ ...report, agentOrchestration });
  } catch (err) {
    console.error("❌ [API /reports Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update Incident Status (generic lifecycle endpoint)
const handleStatusUpdate = (req, res) => {
  const { status, reason, resource, meta } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });
  const inc = store.updateIncidentStatus(req.params.id, status, { reason, resource, ...meta });
  if (!inc) return res.status(404).json({ error: "Incident not found" });
  res.json({ success: true, incident: inc });
};
app.patch("/api/incidents/:id/status", handleStatusUpdate);
app.post("/api/incidents/:id/status", handleStatusUpdate);

// Allocate a dynamically discovered emergency resource to an incident
app.post("/api/incidents/:id/allocate-resource", (req, res) => {
  try {
    const resourceData = req.body || {};
    const result = store.allocateResource(req.params.id, resourceData);
    if (!result) return res.status(404).json({ error: "Incident not found" });
    res.json({ success: true, incident: result.incident, dispatch: result.dispatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-Dispatch Rapid Unit using dynamic nearby Maps API resources
app.post("/api/incidents/:id/auto-dispatch", async (req, res) => {
  try {
    const incidentId = req.params.id;
    const incident = store.getIncidents().find((i) => i.id === incidentId);
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const lat = Number(incident.lat ?? incident.latitude ?? incident.liveLocation?.latitude);
    const lng = Number(incident.lng ?? incident.longitude ?? incident.liveLocation?.longitude);

    let topResource = null;
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      try {
        const dynamicResources = await fetchLiveNearbyEmergencyServices(lat, lng, 5, "all");
        if (dynamicResources && dynamicResources.length > 0) {
          topResource = dynamicResources[0];
        }
      } catch (e) {
        console.warn("[auto-dispatch maps discovery notice]:", e.message);
      }
    }

    if (topResource) {
      const alloc = store.allocateResource(incidentId, topResource);
      store.updateIncidentStatus(incidentId, "EN_ROUTE");
      return res.json({
        success: true,
        incident: alloc.incident,
        dispatch: alloc.dispatch,
        resource: topResource,
        message: `Auto-dispatched ${topResource.name} (${topResource.distanceKm} km away)`
      });
    }

    // Fallback if no nearby GPS POIs
    const dispatch = store.addDispatch({
      incidentId,
      team: req.body?.team || incident.recommendedTeam || "Rapid Emergency Response Squad",
      reason: req.body?.reason || incident.causeDescription || "High priority rapid response dispatch"
    });
    res.json({ success: true, dispatch, incident: store.getIncidentById(incidentId) });
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

// Mark an incident as False Alarm
app.post("/api/incidents/:id/false-alarm", (req, res) => {
  const reason = req.body?.reason || "Marked as False Alarm by Authority Admin";
  const inc = store.markFalseAlarm(req.params.id, reason);
  if (!inc) return res.status(404).json({ error: "Incident not found" });
  res.json({ success: true, incident: inc });
});

// One-click cause-based dispatch per incident
app.post("/api/incidents/:id/dispatch", (req, res) => {
  try {
    const dispatch = store.addDispatch({
      incidentId: req.params.id,
      team: req.body.team,
      teamId: req.body.teamId,
      reason: req.body.reason,
      eta: req.body.eta,
      isOverride: Boolean(req.body.isOverride)
    });
    res.status(201).json(dispatch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark Incident Resolved
app.post("/api/incidents/:id/resolve", (req, res) => {
  try {
    const incident = store.resolveIncident(req.params.id);
    res.json({ success: true, incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Incident Dispatch Lifecycle Progress (e.g. "en_route", "on_scene", "resolved")
app.post("/api/incidents/:id/progress", (req, res) => {
  try {
    const stage = req.body.stage || "on_scene";
    const incident = store.updateIncidentProgress(req.params.id, stage);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    res.json({ success: true, incident, stage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Manual Override
app.post("/api/incidents/:id/override", (req, res) => {
  try {
    const dispatch = store.overrideDispatch({
      incidentId: req.params.id,
      team: req.body.team,
      teamId: req.body.teamId,
      reason: req.body.reason,
      force: true
    });
    res.json({ success: true, dispatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standard Dispatch Action
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

// Deduplication preview
app.post("/api/deduplicate", (req, res) => {
  const geohash = req.body.lat && req.body.lng ? encodeGeohash(req.body.lat, req.body.lng) : null;
  const hash = hashEvidence(req.body.note || "");
  res.json({ geohash, evidenceHash: hash });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`VarshaRaksha API running on http://0.0.0.0:${PORT} (Real Data & SSE Connected)`);
});
