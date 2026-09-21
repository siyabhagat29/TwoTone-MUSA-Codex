import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scoreRisk, classifyCause, dedupeReports } from "./engine.js";
import { fetchLiveWeather, fetchFloodMetrics, reverseGeocode } from "./weatherService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const initialZones = [
  { id: "Z-01", name: "Station Road", ward: "Ward 72", lat: 19.132, lng: 72.848, risk: 42, cause: "Normal drainage", waterLevel: 0, rainfall: 0, reports: 0, trend: "stable" },
  { id: "Z-02", name: "Market Lane", ward: "Ward 72", lat: 19.129, lng: 72.852, risk: 35, cause: "Normal drainage", waterLevel: 0, rainfall: 0, reports: 0, trend: "stable" },
  { id: "Z-03", name: "Temple Street", ward: "Ward 73", lat: 19.125, lng: 72.844, risk: 28, cause: "Normal drainage", waterLevel: 0, rainfall: 0, reports: 0, trend: "stable" },
  { id: "Z-04", name: "Lake View Road", ward: "Ward 73", lat: 19.121, lng: 72.855, risk: 20, cause: "Normal drainage", waterLevel: 0, rainfall: 0, reports: 0, trend: "stable" }
];

class Store {
  constructor() {
    this.zones = [...initialZones];
    this.incidents = [];
    this.alerts = [];
    this.dispatches = [];
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const data = JSON.parse(raw);
        this.zones = data.zones?.length ? data.zones : this.zones;
        this.incidents = data.incidents || [];
        this.alerts = data.alerts || [];
        this.dispatches = data.dispatches || [];
        console.log(`[store] Loaded ${this.incidents.length} incidents and ${this.zones.length} zones from ${DB_FILE}`);
      } catch (err) {
        console.error("[store] Error loading db.json:", err.message);
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(
          {
            zones: this.zones,
            incidents: this.incidents,
            alerts: this.alerts,
            dispatches: this.dispatches,
            updatedAt: new Date().toISOString()
          },
          null,
          2
        )
      );
    } catch (err) {
      console.error("[store] Error saving to db.json:", err.message);
    }
  }

  getZones() {
    return this.zones;
  }

  getIncidents() {
    return this.incidents;
  }

  getAlerts() {
    return this.alerts;
  }

  getDispatches() {
    return this.dispatches;
  }

  /**
   * Sync real-time weather from Open-Meteo for all monitored zones
   */
  async syncLiveWeatherData() {
    console.log("[store] Syncing real-time weather from Open-Meteo...");
    for (const zone of this.zones) {
      const weather = await fetchLiveWeather(zone.lat, zone.lng);
      if (weather.success) {
        // Use real rainfall from Open-Meteo (current precipitation or today's accumulation)
        const liveRain = weather.currentRainfallMm > 0 ? weather.currentRainfallMm : weather.totalTodayRainMm;
        zone.rainfall = liveRain;
        zone.temperature = weather.temperatureC;
        zone.humidity = weather.relativeHumidity;
      }

      // Count actual citizen reports for this zone
      const zoneReports = this.incidents.filter((i) => i.zoneId === zone.id);
      zone.reports = zoneReports.length;

      // Calculate actual water level from reports (max or average)
      if (zoneReports.length > 0) {
        const avgWater = zoneReports.reduce((sum, r) => sum + (Number(r.waterLevel) || 0), 0) / zoneReports.length;
        zone.waterLevel = Math.round(avgWater);
      }

      // Recalculate risk score and cause with real formula
      const blockedDrainReports = zoneReports.filter((r) => r.cause === "Blocked drain" || (r.note && /drain|clog|blocked/i.test(r.note)));
      const drainPenalty = blockedDrainReports.length * 8;
      const { score } = scoreRisk({
        rainfall: zone.rainfall,
        waterLevel: zone.waterLevel,
        reports: zone.reports,
        drainPenalty
      });

      const previousRisk = zone.risk;
      zone.risk = score;
      zone.trend = score > previousRisk ? "rising" : score < previousRisk ? "falling" : "stable";
      zone.cause = classifyCause({
        rainfall: zone.rainfall,
        waterLevel: zone.waterLevel,
        blockedDrainSignal: blockedDrainReports.length > 0
      });
    }

    this.recomputeAlerts();
    this.save();
    return this.zones;
  }

  /**
   * Automatically generate/update active alerts based on real zone risk scores
   */
  recomputeAlerts() {
    const newAlerts = [];
    for (const zone of this.zones) {
      if (zone.risk >= 45) {
        const isRed = zone.risk >= 75;
        const alertId = `ALT-${zone.id.replace("Z-", "")}${Math.round(zone.risk)}`;
        newAlerts.push({
          id: alertId,
          zoneId: zone.id,
          zoneName: zone.name,
          level: isRed ? "RED" : "ORANGE",
          title: isRed ? `Critical flood risk at ${zone.name}` : `Elevated flood risk at ${zone.name}`,
          message: `${zone.name} is showing risk score ${zone.risk}/100. Likely cause: ${zone.cause}. Live rain: ${zone.rainfall} mm, water level: ${zone.waterLevel} cm.`,
          eta: isRed ? "12 min" : "20 min",
          channels: isRed ? ["App", "SMS", "WhatsApp", "PagerDuty"] : ["App", "SMS"],
          createdAt: new Date().toISOString()
        });
      }
    }
    this.alerts = newAlerts;
  }

  /**
   * Add a real citizen incident report
   */
  async addReport(reportData) {
    const id = `INC-${1000 + this.incidents.length + 1}`;
    let zoneId = reportData.zoneId;

    // If coordinates are provided but no zoneId, match to closest zone or create one
    if (!zoneId && reportData.lat && reportData.lng) {
      const closest = this.findClosestZone(reportData.lat, reportData.lng);
      zoneId = closest ? closest.id : "Z-01";
    }
    if (!zoneId) zoneId = "Z-01";

    // Water level mapping
    let waterCm = 15;
    if (typeof reportData.waterLevel === "number") {
      waterCm = reportData.waterLevel;
    } else if (reportData.waterLevel === "ankle") {
      waterCm = 15;
    } else if (reportData.waterLevel === "knee") {
      waterCm = 45;
    } else if (reportData.waterLevel === "waist") {
      waterCm = 90;
    }

    // Determine cause based on notes
    const isDrain = /drain|clog|blocked|gutter|kachra|pipe/i.test(reportData.note || "");
    const cause = isDrain ? "Blocked drain" : waterCm >= 40 ? "Rainfall overload" : "Mixed";

    // Calculate severity
    const severity = Math.min(100, Math.round(waterCm * 0.8 + 20));

    // Simple heuristic for confidence score (placeholder for CV Model)
    let conf = 70; // Base score
    if (reportData.photo) conf += 15;
    if (reportData.note && /urgent|severe|help|immediately|fast/i.test(reportData.note)) conf += 10;

    const incident = {
      id,
      zoneId,
      reporter: reportData.reporter || (reportData.role === "Vendor" ? "Local Vendor" : "Area Resident"),
      role: reportData.role || "Resident",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Received",
      severity,
      cause,
      waterLevel: waterCm,
      lat: reportData.lat ?? null,
      lng: reportData.lng ?? null,
      address: reportData.address || "",
      note: reportData.note || "",
      photo: Boolean(reportData.photo),
      photoUrl: reportData.photoUrl || (reportData.photo ? "attached" : null),
      gps: Boolean(reportData.lat && reportData.lng),
      duplicateOf: null,
      confidenceScore: Math.min(99, conf),
      createdAt: new Date().toISOString()
    };

    // Check duplicate
    this.incidents.unshift(incident);
    this.incidents = dedupeReports(this.incidents);

    // Update zone stats
    const zone = this.zones.find((z) => z.id === zoneId);
    if (zone) {
      zone.reports += 1;
      zone.waterLevel = Math.max(zone.waterLevel, waterCm);
      const { score } = scoreRisk({
        rainfall: zone.rainfall,
        waterLevel: zone.waterLevel,
        reports: zone.reports,
        drainPenalty: cause === "Blocked drain" ? 15 : 0
      });
      zone.risk = score;
      zone.cause = classifyCause({
        rainfall: zone.rainfall,
        waterLevel: zone.waterLevel,
        blockedDrainSignal: cause === "Blocked drain"
      });
    }

    this.recomputeAlerts();
    this.save();
    return incident;
  }

  /**
   * Verify an incident
   */
  verifyIncident(incidentId) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (inc) {
      inc.status = "Verified";
      this.save();
      return inc;
    }
    return null;
  }

  /**
   * Mark an incident as False Alarm
   */
  markFalseAlarm(incidentId) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (inc) {
      inc.status = "False Alarm";
      // Deduplicate again so it might disconnect from merged groups
      this.incidents = dedupeReports(this.incidents);
      this.save();
      return inc;
    }
    return null;
  }

  /**
   * Add a dispatch action
   */
  addDispatch(dispatchData) {
    const id = `DSP-${70 + this.dispatches.length + 1}`;
    const dispatch = {
      id,
      incident: dispatchData.incidentId,
      team: dispatchData.team || "Municipal Drainage Crew",
      reason: dispatchData.reason || "Severe waterlogging response",
      channel: dispatchData.channel || "Twilio + Operations Board",
      status: "En route",
      eta: dispatchData.eta || "10 min",
      createdAt: new Date().toISOString()
    };
    this.dispatches.unshift(dispatch);

    // Update incident status
    const inc = this.incidents.find((i) => i.id === dispatchData.incidentId);
    if (inc) {
      inc.status = "Dispatched";
    }

    this.save();
    return dispatch;
  }

  findClosestZone(lat, lng) {
    let closest = null;
    let minDistance = Infinity;
    for (const z of this.zones) {
      const d = Math.hypot(z.lat - lat, z.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        closest = z;
      }
    }
    return closest;
  }
}

export const store = new Store();
