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
app.get("/api/incidents", (_, res) => res.json(store.getIncidents()));
app.get("/api/alerts", (_, res) => res.json(store.getAlerts()));
app.get("/api/dispatches", (_, res) => res.json(store.getDispatches()));
app.get("/api/resources", (req, res) => {
  const lat = parseFloat(req.query.lat || req.query.latitude);
  const lng = parseFloat(req.query.lng || req.query.longitude);
  res.json(store.getResources(lat, lng));
});
app.get("/api/chronic-blockages", (_, res) => res.json(store.getChronicBlockages()));

// Emergency Services (Google Maps Nearby Search + 4 Categories: Hospitals & ICUs, Fire & Rescue, Police, NGOs & Tents)
app.get("/api/emergency-services", async (req, res) => {
  try {
    const lat = Number(req.query.lat || req.query.latitude) || 19.132;
    const lng = Number(req.query.lng || req.query.longitude) || 72.848;
    const radius = Number(req.query.radius_km || req.query.radius) || 5;
    const category = req.query.category || "all";
    const services = await fetchLiveNearbyEmergencyServices(lat, lng, radius, category);
    res.json(services);
  } catch (err) {
    res.json(store.getEmergencyServices(req.query.lat, req.query.lng));
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

// Flood Buddy (Nearby Registered Shopkeepers)
app.get("/api/flood-buddy/nearby", (_, res) => res.json(store.getFloodBuddies()));
app.post("/api/flood-buddy/notify", (req, res) => {
  try {
    const result = store.notifyFloodBuddy(req.body.targetShopId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Blitzortung Lightning Detection Data
app.get("/api/lightning", (_, res) => {
  res.json(store.getLightningData());
});

// SOS Emergency Rescue Trigger
app.post("/api/sos", (req, res) => {
  try {
    const result = store.triggerSos(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/sos", (_, res) => res.json(store.getSosAlerts()));

// Alert Feedback for model calibration ("Resolved" / "False Alarm")
app.post("/api/alerts/:id/feedback", (req, res) => {
  try {
    const result = store.recordAlertFeedback(req.params.id, req.body);
    res.json(result);
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
  const fromLat = Number(req.query.fromLat) || 19.132;
  const fromLng = Number(req.query.fromLng) || 72.848;
  const toLat = Number(req.query.toLat) || 19.125;
  const toLng = Number(req.query.toLng) || 72.838;
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

const FLOOD_AI_URL = process.env.FLOOD_AI_URL || "http://127.0.0.1:5002";
let floodAiProc = null;

function ensureFloodAiProcess() {
  fetch(`${FLOOD_AI_URL}/health`)
    .then((r) => r.json())
    .then((data) => {
      if (data && data.model_loaded) {
        console.log("🌊 [FloodAI] Microservice verified running and model loaded.");
      }
    })
    .catch(() => {
      if (!floodAiProc) {
        console.log("🌊 [FloodAI] Starting Python flood detection microservice on port 5002...");
        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        const scriptPath = path.join(__dirname, "flood_detector_service.py");
        floodAiProc = spawn(pythonCmd, [scriptPath], {
          cwd: path.resolve(__dirname, "../../"),
          stdio: "inherit",
          shell: true,
          env: { ...process.env, FORCE_COLOR: "1" }
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
  const urls = [FLOOD_AI_URL, "http://localhost:5002", "http://127.0.0.1:5002"];
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

// Real Incident Report from Mobile or Web (Guarded by AI Flood Detection Model)
app.post("/api/reports", async (req, res) => {
  try {
    let aiVerification = req.body.aiVerification;
    const hasMedia = Boolean(req.body.photoUrl || req.body.videoUrl || req.body.photo || req.body.video);

    // If media was attached but no aiVerification supplied yet, verify it now
    if (hasMedia && !aiVerification) {
      const mediaUrl = req.body.videoUrl || req.body.photoUrl;
      if (mediaUrl) {
        aiVerification = await checkFloodAiMedia({ url: mediaUrl });
      }
    }

    // STRICT VALIDATION: If visual evidence is uploaded and AI flood model confirms NO flooding, block the report
    if (hasMedia && aiVerification && aiVerification.is_flooding === false) {
      console.warn(`⛔ [Report Blocked] AI Flood Model detected NO flooding: ${aiVerification.reason || 'Normal conditions'}`);
      return res.status(422).json({
        success: false,
        error: "NO_FLOOD_DETECTED",
        message: "There is no flooding detected in the uploaded visual evidence. Incident report cannot be filed.",
        aiVerification
      });
    }

    let address = req.body.address;
    if (!address && req.body.lat && req.body.lng) {
      const geo = await reverseGeocode(req.body.lat, req.body.lng);
      address = geo.road ? `${geo.road}, ${geo.ward}` : geo.displayName;
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
  const reason = req.body.reason || "Marked as False Alarm by Authority Admin";
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
