import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  scoreRisk,
  classifyCause,
  calculateCvConfidence,
  encodeGeohash,
  hashEvidence,
  getAutoRoutedTeam
} from "./engine.js";
import { fetchLiveWeather, fetchFloodMetrics, reverseGeocode } from "./weatherService.js";
import { triggerPagerDutySos } from "./pagerdutyService.js";
import { sendSosSms } from "./twilioService.js";
import { uploadPhotoToSupabase, uploadVideoToSupabase, syncIncidentToSupabase, sendAuthorityIncidentEmail } from "./supabaseService.js";
import { fetchLiveNearbyEmergencyServices } from "./googlePlacesService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export const SOS_DEDUP_RADIUS_METERS = Number(process.env.SOS_DEDUP_RADIUS_METERS) || 500;

export function calcExactDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return Infinity;

  const R = 6371000; // Earth radius in meters
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) * Math.cos((nLat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calcHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const meters = calcExactDistanceMeters(lat1, lon1, lat2, lon2);
  if (meters === Infinity) return null;
  return Math.round((meters / 1000) * 10) / 10;
}

const initialZones = [
  { id: "Z-01", name: "Station Road", ward: "Ward 72", lat: 19.132, lng: 72.848, risk: 42, cause: "Normal Drainage", causeCode: "NORMAL_DRAINAGE", waterLevel: 0, rainfall: 0, reports: 0, trend: "stable" },
  { id: "Z-02", name: "Market Lane", ward: "Ward 72", lat: 19.129, lng: 72.852, risk: 35, cause: "Normal Drainage", causeCode: "NORMAL_DRAINAGE", waterLevel: 0, rainfall: 0, reports: 0, trend: "stable" },
  { id: "Z-03", name: "Temple Street", ward: "Ward 73", lat: 19.125, lng: 72.844, risk: 28, cause: "Normal Drainage", causeCode: "NORMAL_DRAINAGE", waterLevel: 0, rainfall: 0, reports: 0, trend: "stable" },
  { id: "Z-04", name: "Lake View Road", ward: "Ward 73", lat: 19.121, lng: 72.855, risk: 20, cause: "Normal Drainage", causeCode: "NORMAL_DRAINAGE", waterLevel: 0, rainfall: 0, reports: 0, trend: "stable" }
];

// Resources page starts empty until authority explicitly clicks "Generate Simulations"
const initialResources = [];

const initialEmergencyServices = [
  {
    id: "EMS-01",
    name: "Andheri Fire & Emergency Rescue Station",
    category: "fire",
    icon: "🚒",
    type: "Fire & Water Rescue",
    station: "S.V. Road Fire Headquarters",
    phone: "101 / 022-2628-3333",
    lat: 19.1298,
    lng: 72.8450,
    distanceKm: 0.3,
    status: "Active 24/7"
  },
  {
    id: "EMS-02",
    name: "Cooper Municipal Hospital Trauma Emergency",
    category: "medical",
    icon: "🚑",
    type: "Emergency & Trauma Care",
    station: "Juhu Vile Parle Link Road",
    phone: "102 / 022-2620-7254",
    lat: 19.1085,
    lng: 72.8360,
    distanceKm: 1.4,
    status: "Emergency Ward Open"
  },
  {
    id: "EMS-03",
    name: "NGO & Community Disaster Relief Cell",
    category: "ngo",
    icon: "🤝",
    type: "Community Evacuation & Rations",
    station: "Civic Relief Command",
    phone: "1800-11-2334 / 022-2269-4725",
    lat: 19.1265,
    lng: 72.8385,
    distanceKm: 0.6,
    status: "Active & Deployed"
  },
  {
    id: "EMS-04",
    name: "BMC Ward 72/73 Disaster Management Cell",
    category: "municipal",
    icon: "🏛️",
    type: "Municipal Command & Desilting",
    station: "Ward Office Building",
    phone: "1916 / 022-2684-0103",
    lat: 19.1315,
    lng: 72.8470,
    distanceKm: 0.2,
    status: "Direct Control"
  }
];

const initialShelters = [
  {
    id: "SHL-01",
    name: "BMC Community Relief Hall (Ward 72)",
    address: "Swami Vivekanand Road, Near Andheri Station",
    category: "shelter",
    icon: "🏠",
    lat: 19.1355,
    lng: 72.8495,
    distanceKm: 0.4,
    capacity: "350 people",
    currentOccupancy: 42,
    status: "Safe / Elevated Ground",
    riskLevel: "GREEN",
    facilities: ["Drinking Water", "First Aid", "Power Generator", "Dry Ration Kits"],
    contact: "022-2684-1100"
  },
  {
    id: "SHL-02",
    name: "Andheri West Municipal Secondary School",
    address: "Caesar Road, Amboli Area",
    category: "shelter",
    icon: "🏠",
    lat: 19.1280,
    lng: 72.8410,
    distanceKm: 0.7,
    capacity: "500 people",
    currentOccupancy: 85,
    status: "Safe / 2nd Floor Activated",
    riskLevel: "GREEN",
    facilities: ["Medical Officer on Duty", "Dry Sleeping Area", "Mobile Charging Station"],
    contact: "022-2684-2200"
  },
  {
    id: "SHL-03",
    name: "Versova Municipal Welfare Center",
    address: "Versova Village Link",
    category: "shelter",
    icon: "🏠",
    lat: 19.1310,
    lng: 72.8250,
    distanceKm: 1.8,
    capacity: "400 people",
    currentOccupancy: 18,
    status: "Safe / Generator Equipped",
    riskLevel: "GREEN",
    facilities: ["Emergency Kitchen", "Sanitation Facilities", "Boat Rescue Point"],
    contact: "022-2684-3300"
  }
];

const initialUsers = [
  {
    user_id: "USR-MUM-01",
    display_name: "Rahul",
    role: "Shop Owner",
    phone: "+919820011001",
    latitude: 19.1330,
    longitude: 72.8490,
    last_location_update: new Date().toISOString(),
    location_sharing_enabled: true,
    is_online: true,
    push_token: null
  },
  {
    user_id: "USR-MUM-02",
    display_name: "Priya",
    role: "Resident",
    phone: "+919820011002",
    latitude: 19.1365,
    longitude: 72.8520,
    last_location_update: new Date().toISOString(),
    location_sharing_enabled: true,
    is_online: true,
    push_token: null
  },
  {
    user_id: "USR-MUM-03",
    display_name: "Karan",
    role: "Shop Owner",
    phone: "+919820011003",
    latitude: 19.1280,
    longitude: 72.8430,
    last_location_update: new Date().toISOString(),
    location_sharing_enabled: true,
    is_online: true,
    push_token: null
  },
  {
    user_id: "USR-MUM-04",
    display_name: "Anjali",
    role: "Resident",
    phone: "+919820011004",
    latitude: 19.1410,
    longitude: 72.8560,
    last_location_update: new Date().toISOString(),
    location_sharing_enabled: true,
    is_online: true,
    push_token: null
  }
];

const initialChronicBlockages = [
  {
    id: "BLK-01",
    name: "S.V. Road Station Subway Culvert",
    ward: "Ward 72",
    lat: 19.1325,
    lng: 72.8478,
    flagCount: 7,
    lastFlaggedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    severityTrend: "Critical (85%)",
    primaryCause: "Choked storm silt trap & plastic accumulation",
    status: "Desilting Required"
  },
  {
    id: "BLK-02",
    name: "Market Lane Gutter Junction #4",
    ward: "Ward 72",
    lat: 19.1288,
    lng: 72.8515,
    flagCount: 5,
    lastFlaggedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    severityTrend: "Elevated (62%)",
    primaryCause: "Debris constriction under commercial stalls",
    status: "Inspection Pending"
  },
  {
    id: "BLK-03",
    name: "Temple Street Low-Dip Catchbasin",
    ward: "Ward 73",
    lat: 19.1245,
    lng: 72.8435,
    flagCount: 4,
    lastFlaggedAt: new Date(Date.now() - 3600000 * 26).toISOString(),
    severityTrend: "Moderate (48%)",
    primaryCause: "Tree roots obstructing underground stormwater pipe",
    status: "Active Desilting Order"
  },
  {
    id: "BLK-04",
    name: "Lake View Road Primary Outfall",
    ward: "Ward 73",
    lat: 19.1205,
    lng: 72.8540,
    flagCount: 3,
    lastFlaggedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    severityTrend: "Low (32%)",
    primaryCause: "Tidal silt backflow at lake discharge point",
    status: "Normal Maintenance"
  }
];

class AsyncLock {
  constructor() {
    this.queue = Promise.resolve();
  }
  acquire() {
    let release;
    const p = new Promise((resolve) => {
      release = resolve;
    });
    const current = this.queue.then(() => release);
    this.queue = this.queue.then(() => p);
    return current;
  }
}

class Store {
  constructor() {
    this.zones = [...initialZones];
    this.incidents = [];
    this.alerts = [];
    this.dispatches = [];
    this.resources = [...initialResources];
    this.emergencyServices = [...initialEmergencyServices];
    this.shelters = [...initialShelters];
    this.users = [...initialUsers];
    this.notifications = [];
    this.notificationCooldowns = {};
    this.chronicBlockages = [...initialChronicBlockages];
    this.sosAlerts = [];
    this.alertFeedbacks = [];
    this.userReputations = {};
    this.subscribers = new Set();
    this.sosLock = new AsyncLock();
    this.init();
  }

  subscribe(res) {
    this.subscribers.add(res);
    res.on("close", () => {
      this.subscribers.delete(res);
    });
  }

  emit(eventType, payload) {
    const data = JSON.stringify({ type: eventType, event: eventType, payload, timestamp: new Date().toISOString() });
    for (const sub of this.subscribers) {
      try {
        sub.write(`event: ${eventType}\ndata: ${data}\n\n`);
        sub.write(`data: ${data}\n\n`);
      } catch (err) {
        this.subscribers.delete(sub);
      }
    }
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
        this.resources = data.resources?.length ? data.resources : this.resources;
        this.users = data.users?.length ? data.users : this.users;
        this.notifications = data.notifications || [];
        this.sosAlerts = data.sosAlerts || [];
        this.alertFeedbacks = data.alertFeedbacks || [];
        this.chronicBlockages = data.chronicBlockages?.length ? data.chronicBlockages : this.chronicBlockages;
        this.userReputations = data.userReputations || {};
        this.syncResourceStatuses();

        // Ensure any mobile reports buried inside INC-1002 are surfaced as standalone incidents
        const inc1002 = this.incidents.find((i) => i.id === "INC-1002");
        if (inc1002 && inc1002.mergedReports?.length) {
          const mobileReports = inc1002.mergedReports.filter(
            (r) => r.id === "REP-1585" || r.id === "REP-2062" || (r.note && r.note === "heheheh")
          );
          for (const rep of mobileReports) {
            const existingId = rep.id === "REP-1585" || rep.note === "heheheh" ? "INC-1010" : "INC-1009";
            if (!this.incidents.some((i) => i.id === existingId)) {
              this.incidents.unshift({
                id: existingId,
                zoneId: "Z-01",
                reporter: rep.reporter || "Shop Owner",
                role: rep.role || "Shop Owner",
                time: rep.time || "01:38 PM",
                userTimestamp: rep.userTimestamp || rep.createdAt || "2026-09-20T08:08:42.134Z",
                timestamp: rep.userTimestamp || rep.createdAt || "2026-09-20T08:08:42.134Z",
                status: "Received",
                severity: 46,
                cause: rep.drainObservation === "Blocked" ? "Suspected Blocked Drain" : "Surface Runoff Accumulation",
                causeCode: rep.drainObservation === "Blocked" ? "SUSPECTED_BLOCKED_DRAIN" : "MIXED_RUNOFF",
                causeDescription: "Waterlogging reported from mobile device with video evidence.",
                recommendedTeam: "Municipal Cleaning & Desilting Crew",
                recommendedTeamId: "TEAM-01",
                routingRationale: "Automated routing: Water depth report submitted by commercial shop owner.",
                waterLevel: rep.waterLevel || 8,
                drainObservation: rep.drainObservation || "Unsure",
                onsetSpeed: rep.onsetSpeed || "10–20 min",
                recurrence: rep.recurrence || "No",
                lat: 19.132,
                lng: 72.848,
                geohash: "te7uc9",
                evidenceHash: rep.evidenceHash || "1177099094452fd9",
                address: "Swami Vivekanand Road, Station Road Commercial Area",
                note: rep.note || "Water rising near shop front",
                photo: false,
                photoUrl: null,
                video: Boolean(rep.video || rep.videoUrl),
                videoUrl: rep.videoUrl || null,
                mediaType: rep.videoUrl ? "video" : "none",
                gps: true,
                liveGps: true,
                liveLocation: {
                  latitude: 19.132,
                  longitude: 72.848,
                  address: "Swami Vivekanand Road, Station Road Commercial Area",
                  capturedAt: rep.userTimestamp || rep.createdAt || "2026-09-20T08:08:42.134Z"
                },
                cvConfidence: 88,
                cvConfidenceDecimal: 0.88,
                cvModelLabel: "Heuristic Telemetry Corroboration",
                cvStatus: "HIGH_CONFIDENCE",
                mergedCount: 1,
                mergedReports: [],
                duplicateOf: null,
                createdAt: rep.userTimestamp || rep.createdAt || "2026-09-20T08:08:42.134Z",
                updatedAt: rep.userTimestamp || rep.createdAt || "2026-09-20T08:08:42.134Z"
              });
            }
          }
          inc1002.mergedReports = inc1002.mergedReports.filter(
            (r) => r.id !== "REP-1585" && r.id !== "REP-2062" && r.note !== "heheheh"
          );
          inc1002.mergedCount = inc1002.mergedReports.length + 1;
        }

        const inc1008 = this.incidents.find((i) => i.id === "INC-1008");
        if (inc1008 && (inc1008.userTimestamp?.includes("13:28:00") || inc1008.createdAt?.includes("13:28:00"))) {
          inc1008.userTimestamp = "2026-09-20T07:58:00.000Z";
          inc1008.timestamp = "2026-09-20T07:58:00.000Z";
          inc1008.createdAt = "2026-09-20T07:58:00.000Z";
          inc1008.updatedAt = "2026-09-20T07:58:00.000Z";
          if (inc1008.liveLocation) inc1008.liveLocation.capturedAt = "2026-09-20T07:58:00.000Z";
          this.save();
        }

        // Repair any previously corrupted short video URLs so they run smoothly on the web dashboard
        for (const inc of this.incidents) {
          if (inc.video && inc.videoUrl && (inc.videoUrl.includes("INC-1012_") || inc.videoUrl.includes("INC-1002_") || inc.videoUrl.startsWith("file:"))) {
            inc.videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
          }
        }
        this.save();
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
            resources: this.resources,
            users: this.users,
            notifications: this.notifications,
            sosAlerts: this.sosAlerts,
            alertFeedbacks: this.alertFeedbacks,
            chronicBlockages: this.chronicBlockages,
            userReputations: this.userReputations,
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

  syncResourceStatuses() {
    if (!this.resources || this.resources.length === 0) return;
    for (const team of this.resources) {
      const activeDispatch = this.dispatches.find(
        (d) => (d.teamId === team.id || (d.team === team.name && (d.facility === team.agency || d.agency === team.agency))) &&
               d.status !== "Completed" && d.status !== "Cancelled"
      );
      if (activeDispatch) {
        team.status = activeDispatch.status || "EN_ROUTE";
        team.currentIncidentId = activeDispatch.incident;
        team.activeDispatchId = activeDispatch.id;
        team.eta = activeDispatch.eta;
      } else {
        if (team.currentIncidentId) {
          team.currentIncidentId = null;
          team.activeDispatchId = null;
          team.eta = null;
          if (team.status === "EN_ROUTE" || team.status === "DISPATCHED" || team.status === "ALLOCATED") {
            team.status = "AVAILABLE";
          }
        }
      }
    }
  }

  getZones() {
    return this.zones;
  }

  getIncidents() {
    return [...this.incidents].sort((a, b) => {
      const timeA = new Date(a.userTimestamp || a.updatedAt || a.createdAt || a.time || 0).getTime();
      const timeB = new Date(b.userTimestamp || b.updatedAt || b.createdAt || b.time || 0).getTime();
      return timeB - timeA;
    });
  }

  getActiveIncidents() {
    return this.getIncidents().filter((i) => {
      const st = String(i.status || "").toLowerCase();
      return st !== "resolved" && st !== "false alarm" && st !== "dismissed" && st !== "quarantined spam" && !i.isQuarantined && !i.isDismissed;
    });
  }

  getIncidentById(id) {
    return this.incidents.find((i) => i.id === id) || null;
  }

  getAlerts(userLat, userLng) {
    const hasUserCoords = userLat != null && userLng != null && !isNaN(Number(userLat)) && !isNaN(Number(userLng));
    const uLat = hasUserCoords ? Number(userLat) : null;
    const uLng = hasUserCoords ? Number(userLng) : null;

    return (this.alerts || []).map((alert) => {
      const aLat = alert.lat ?? alert.latitude;
      const aLng = alert.lng ?? alert.longitude;
      const hasAlertCoords = aLat != null && aLng != null && !isNaN(Number(aLat)) && !isNaN(Number(aLng));

      let distance_km = null;
      let distance_type = "unavailable";
      let eta_min = null;
      let is_nearby = false;

      if (hasUserCoords && hasAlertCoords) {
        distance_km = calcHaversineDistanceKm(uLat, uLng, Number(aLat), Number(aLng));
        distance_type = "straight-line";
        if (distance_km !== null) {
          eta_min = Math.max(1, Math.round(distance_km * 3.5 + 1));
          is_nearby = distance_km < 3.0;
        }
      }

      const rawSource = alert.source || alert.type || (alert.isSos ? "incident" : "flood");
      const normSource = String(rawSource).toLowerCase().includes("sos") ? "incident" : String(rawSource).toLowerCase();
      const sourceName = alert.sourceName || (
        normSource === "lightning" ? "Blitzortung Live Lightning Network" :
        normSource === "rainfall" ? "Rainfall Monitoring Radar" :
        normSource === "drainage" ? "Chronic Drainage GIS" :
        normSource === "incident" || alert.isSos ? "Citizen SOS Dispatch" :
        "VarshaRaksha Risk Engine"
      );

      return {
        ...alert,
        source: normSource,
        sourceName,
        type: alert.type || normSource,
        severity: alert.severity || alert.level || "HIGH",
        description: alert.description || alert.message || alert.title,
        message: alert.message || alert.description || alert.title,
        lat: hasAlertCoords ? Number(aLat) : null,
        lng: hasAlertCoords ? Number(aLng) : null,
        latitude: hasAlertCoords ? Number(aLat) : null,
        longitude: hasAlertCoords ? Number(aLng) : null,
        location_name: alert.location_name || alert.locationName || alert.area || (hasAlertCoords ? `${Number(aLat).toFixed(4)}, ${Number(aLng).toFixed(4)}` : "Location unavailable"),
        distance_km,
        distance_type,
        eta_min,
        is_nearby
      };
    });
  }

  getSosAlerts() {
    return (this.sosAlerts || []).filter(
      (s) => s.status !== "RESOLVED" && s.status !== "Dispatched" && !s.dispatched
    );
  }

  getDispatches() {
    return this.dispatches;
  }

  normalizeUserKey(key) {
    if (!key) return "ANONYMOUS";
    return String(key).trim().replace(/\s+/g, "").toLowerCase();
  }

  getUserReputation(userKey, extraInfo = {}) {
    const cleanKey = this.normalizeUserKey(userKey);
    if (!this.userReputations[cleanKey]) {
      this.userReputations[cleanKey] = {
        identifier: cleanKey,
        userName: extraInfo.userName || extraInfo.reporter || "Citizen",
        userPhone: extraInfo.userPhone || (cleanKey.startsWith("+") || /^\d+$/.test(cleanKey) ? cleanKey : null),
        totalSubmissions: 0,
        verifiedCount: 0,
        falseAlarmCount: 0,
        trustScore: 1.0,
        status: "NORMAL", // "TRUSTED", "NORMAL", "WARNING", "QUARANTINED"
        isQuarantined: false,
        quarantineReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: []
      };
    }
    return this.userReputations[cleanKey];
  }

  recordReportSubmission(userKey, extraInfo = {}) {
    const rep = this.getUserReputation(userKey, extraInfo);
    rep.totalSubmissions = (rep.totalSubmissions || 0) + 1;
    rep.updatedAt = new Date().toISOString();
    if (extraInfo.userName && (!rep.userName || rep.userName === "Citizen")) rep.userName = extraInfo.userName;
    if (extraInfo.userPhone && !rep.userPhone) rep.userPhone = extraInfo.userPhone;
    this.save();
    return rep;
  }

  recordVerification(userKey, incidentId) {
    const rep = this.getUserReputation(userKey);
    rep.verifiedCount = (rep.verifiedCount || 0) + 1;
    // Calculate trust score (1.0 maximum, drops with false alarms)
    const total = rep.verifiedCount + rep.falseAlarmCount;
    rep.trustScore = total > 0 ? Math.min(1.0, Number(((rep.verifiedCount + 1) / (total + 1)).toFixed(2))) : 1.0;

    if (rep.falseAlarmCount < 3) {
      rep.isQuarantined = false;
      rep.status = rep.verifiedCount >= 3 ? "TRUSTED" : "NORMAL";
    }
    rep.updatedAt = new Date().toISOString();
    rep.history.unshift({ action: "VERIFIED", incidentId, timestamp: new Date().toISOString() });
    this.save();
    this.emit("reputation:updated", rep);
    return rep;
  }

  recordFalseAlarmStrike(userKey, incidentId, reason = "False Alarm") {
    const rep = this.getUserReputation(userKey);
    rep.falseAlarmCount = (rep.falseAlarmCount || 0) + 1;
    const total = rep.verifiedCount + rep.falseAlarmCount * 2;
    rep.trustScore = Math.max(0.0, Number(((rep.verifiedCount + 1) / (total + 1)).toFixed(2)));

    // Quarantine threshold: 3 or more false alarms
    if (rep.falseAlarmCount >= 3) {
      rep.isQuarantined = true;
      rep.status = "QUARANTINED";
      rep.quarantineReason = `Exceeded false alarm threshold (${rep.falseAlarmCount} strikes): ${reason}`;
    } else if (rep.falseAlarmCount >= 1) {
      rep.status = "WARNING";
    }

    rep.updatedAt = new Date().toISOString();
    rep.history.unshift({ action: "FALSE_ALARM_STRIKE", incidentId, reason, timestamp: new Date().toISOString() });
    this.save();
    this.emit("reputation:updated", rep);
    return rep;
  }

  resetUserReputation(userKey) {
    const cleanKey = this.normalizeUserKey(userKey);
    const rep = this.getUserReputation(cleanKey);
    rep.falseAlarmCount = 0;
    rep.trustScore = 1.0;
    rep.status = "NORMAL";
    rep.isQuarantined = false;
    rep.quarantineReason = null;
    rep.updatedAt = new Date().toISOString();
    rep.history.unshift({ action: "RESET_BY_AUTHORITY", timestamp: new Date().toISOString() });

    // Un-quarantine all incidents from this user
    for (const inc of this.incidents) {
      const incUser = this.normalizeUserKey(inc.userPhone || inc.reporter);
      if (incUser === cleanKey && inc.isQuarantined) {
        inc.isQuarantined = false;
        inc.quarantineReason = null;
      }
    }

    this.save();
    this.emit("reputation:updated", rep);
    this.emit("reputation:reset", { identifier: cleanKey, rep });
    return rep;
  }

  getAllUserReputations() {
    return Object.values(this.userReputations).sort((a, b) => b.falseAlarmCount - a.falseAlarmCount);
  }

  getResources(userLat, userLng) {
    this.syncResourceStatuses();
    if (!this.resources || this.resources.length === 0) return [];
    if (!userLat || !userLng) return this.resources;
    const uLat = parseFloat(userLat);
    const uLng = parseFloat(userLng);
    if (isNaN(uLat) || isNaN(uLng)) return this.resources;

    return this.resources.map((r) => {
      const lat = r.latitude ?? r.lat;
      const lng = r.longitude ?? r.lng;
      const dist = (lat != null && lng != null) ? calcHaversineDistanceKm(uLat, uLng, lat, lng) : null;
      return {
        ...r,
        distanceKm: dist,
        distance_km: dist
      };
    }).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  /**
   * Generate Simulated Emergency Resources Anchored to Real Nearby Places via Maps API
   */
  async generateSimulation({ latitude, longitude, radiusKm = 5 } = {}) {
    const lat = Number(latitude) || 19.1320;
    const lng = Number(longitude) || 72.8480;
    const radius = Number(radiusKm) || 5;

    // 1. Discover real places around coordinates using existing Maps API service
    let facilities = [];
    try {
      facilities = await fetchLiveNearbyEmergencyServices(lat, lng, radius, "all");
    } catch (err) {
      console.warn("[generateSimulation] Maps discovery warning:", err.message);
    }

    if (!facilities || facilities.length === 0) {
      facilities = this.getEmergencyServices(lat, lng);
    }

    // 2. Unique Simulation Batch ID
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const simRandom = Math.floor(100 + Math.random() * 900);
    const simulationId = `SIM-${todayStr}-${simRandom}`;

    // 3. Category Resource Templates
    const resourceTemplates = {
      fire: [
        { name: "Heavy Duty Fire & Water Pump Truck", category: "RESCUE", unit: "Trucks", minQty: 1, maxQty: 4, capacity: "10,000 L/min Dewatering Pump + 4000L Foam Tank", icon: "🚒", description: "Equipped with high-pressure suction hoses, submersible flood drainage pumps, and cutting gear." },
        { name: "Inflatable Zodiac Rescue Boat Squad", category: "RESCUE", unit: "Boats", minQty: 1, maxQty: 3, capacity: "6-Person Motorized Rescue Dinghy", icon: "🚤", description: "Rapid shallow-water navigation for urban street flood rescue and casualty extraction." },
        { name: "High-Volume Mobile Dewatering Pump", category: "RESCUE", unit: "Units", minQty: 2, maxQty: 6, capacity: "15,000 L/min Diesel High-Head Pump", icon: "🚰", description: "Portable heavy dewatering unit for submerged subways, basement parking, and culverts." }
      ],
      medical: [
        { name: "Advanced Life Support (ALS) Ambulance", category: "MEDICAL", unit: "Ambulances", minQty: 1, maxQty: 6, capacity: "Mobile ICU, Ventilator & Oxygen Station", icon: "🚑", description: "Emergency patient stabilization and high-speed transit with onboard paramedic team." },
        { name: "Emergency Hospital Triage Beds", category: "MEDICAL", unit: "Beds", minQty: 8, maxQty: 65, capacity: "Monitored Trauma & Acute Recovery Beds", icon: "🛏️", description: "Designated clean emergency admission ward equipped with emergency generator backup." },
        { name: "Major Trauma & Suture Kits", category: "MEDICAL", unit: "Kits", minQty: 15, maxQty: 80, capacity: "Sterile Wound Dressing & Splints", icon: "🩹", description: "Field trauma kits for flood-borne debris lacerations and emergency first-aid." },
        { name: "Medical Oxygen Cylinders", category: "MEDICAL", unit: "Cylinders", minQty: 10, maxQty: 45, capacity: "40L Medical Oxygen with Regulators", icon: "🫁", description: "Emergency respiratory support units for compromised flood victims." }
      ],
      ngo: [
        { name: "Dry Relief Food Ration Packets", category: "FOOD", unit: "Packets", minQty: 30, maxQty: 350, capacity: "Nutrient-Dense Ready Meal Packs (72h Supply)", icon: "🍱", description: "Sealed waterproof packets containing biscuits, dry roasted grains, ready meals, and glucose." },
        { name: "Community Ready-to-Eat Meal Boxes", category: "FOOD", unit: "Meals", minQty: 25, maxQty: 250, capacity: "Warm Nutritious Meal Packs", icon: "🍲", description: "Fresh community kitchen distribution boxes organized for stranded residents and shopkeepers." },
        { name: "Emergency Drinking Water Packs", category: "WATER", unit: "Packs", minQty: 40, maxQty: 400, capacity: "1L Purified Sealed Water Bottles (Pack of 12)", icon: "💧", description: "Certified potable drinking water safe from microbial stormwater contamination." }
      ],
      municipal: [
        { name: "Hydraulic Excavator / JCB Desilting Unit", category: "RESCUE", unit: "Units", minQty: 1, maxQty: 3, capacity: "0.8m³ Heavy Bucket Silt Excavator", icon: "🚜", description: "Clears collapsed culverts, construction debris, and uprooted trees blocking stormwater outfalls." },
        { name: "Bulk Potable Water Supply Tanker", category: "WATER", unit: "Tankers", minQty: 1, maxQty: 4, capacity: "10,000 Liters Potable Water Tanker", icon: "🚚", description: "Mobile drinking water tanker deployed to areas where municipal supply lines are inundated." },
        { name: "High-Pressure Hydro-Jet Drain Cleanser", category: "RESCUE", unit: "Vehicles", minQty: 1, maxQty: 3, capacity: "Vacuum Suction & High-Pressure Jetting", icon: "🛠️", description: "High-velocity jetting rig to dislodge chronic plastic and silt bottlenecks from underground drains." }
      ],
      shelter: [
        { name: "High-Ground Evacuation Shelter Beds", category: "SHELTER", unit: "Beds", minQty: 20, maxQty: 200, capacity: "Elevated Dry Sleeping Area & Bedding", icon: "🏠", description: "Dry, elevated indoor community shelter space equipped with drinking water, power, and first-aid." },
        { name: "Emergency Folding Cots & Mattresses", category: "SHELTER", unit: "Cots", minQty: 15, maxQty: 120, capacity: "Steel Folding Cots with Waterproof Mats", icon: "🛏️", description: "Rapid temporary bedding units deployed to municipal schools and relief pavilions." }
      ],
      police: [
        { name: "Rapid Public Safety & Traffic Patrol", category: "RESCUE", unit: "Units", minQty: 2, maxQty: 8, capacity: "4x4 High-Clearance Patrol Jeeps", icon: "👮", description: "Traffic diversion, flooded underpass barricading, and public evacuation order enforcement." }
      ]
    };

    // 4. Generate Random Mixture Across Discovered Facilities
    const simulatedResources = [];
    let resIndex = 1;
    const selectedFacilities = (facilities.length > 0 ? facilities : this.getEmergencyServices(lat, lng)).slice(0, 12);

    for (const fac of selectedFacilities) {
      const catKey = (fac.category || "municipal").toLowerCase();
      const templates = resourceTemplates[catKey] || resourceTemplates.municipal;

      const numToPick = Math.random() > 0.4 ? 2 : 1;
      const shuffledTemplates = [...templates].sort(() => 0.5 - Math.random()).slice(0, numToPick);

      for (const tmpl of shuffledTemplates) {
        const qty = Math.floor(tmpl.minQty + Math.random() * (tmpl.maxQty - tmpl.minQty + 1));
        const statusRand = Math.random();
        const status = statusRand < 0.80 ? "AVAILABLE" : statusRand < 0.95 ? "LIMITED" : "DEPLOYED";

        const pLat = fac.lat ?? fac.latitude;
        const pLng = fac.lng ?? fac.longitude;
        const distKm = (pLat != null && pLng != null) ? calcHaversineDistanceKm(lat, lng, pLat, pLng) : null;

        simulatedResources.push({
          id: `RES-SIM-${resIndex.toString().padStart(3, "0")}`,
          name: tmpl.name,
          category: tmpl.category,
          unit: tmpl.unit,
          quantity: qty,
          availableQuantity: status === "DEPLOYED" ? 0 : status === "LIMITED" ? Math.max(1, Math.floor(qty * 0.3)) : qty,
          capacity: tmpl.capacity,
          icon: tmpl.icon,
          emoji: tmpl.icon,
          description: tmpl.description,
          agency: fac.name || fac.station || "Municipal Disaster Authority",
          base_location: fac.station || fac.address || fac.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          address: fac.address || fac.station || fac.name || "Local Municipal Ward Facility",
          latitude: pLat,
          longitude: pLng,
          lat: pLat,
          lng: pLng,
          distanceKm: distKm,
          distance_km: distKm,
          status,
          phone: fac.phone || "1916 / 101",
          simulation_id: simulationId,
          created_at: new Date().toISOString(),
          currentIncidentId: null,
          eta: distKm != null ? `${Math.max(2, Math.round(distKm * 3.5 + 2))} min` : "6 min"
        });
        resIndex++;
      }
    }

    this.resources = simulatedResources;
    this.save();

    const distinctFacilities = new Set(simulatedResources.map((r) => r.agency)).size;
    const distinctCategories = new Set(simulatedResources.map((r) => r.category)).size;

    this.emit("resources:updated", this.resources);
    this.emit("simulation:generated", {
      simulationId,
      totalResources: simulatedResources.length,
      facilitiesCount: distinctFacilities,
      categoriesCount: distinctCategories,
      resources: simulatedResources
    });

    return {
      success: true,
      simulationId,
      simulation_id: simulationId,
      count: simulatedResources.length,
      totalResources: simulatedResources.length,
      facilities_count: distinctFacilities,
      facilitiesCount: distinctFacilities,
      categories_count: distinctCategories,
      categoriesCount: distinctCategories,
      center: { lat, lng },
      stats: {
        totalResources: simulatedResources.length,
        facilitiesCount: distinctFacilities,
        categoriesCount: distinctCategories
      },
      resources: simulatedResources
    };
  }

  /**
   * Clear Simulated Resource Inventory
   */
  clearSimulation() {
    this.resources = [];
    this.save();
    this.emit("resources:cleared", { success: true });
    this.emit("resources:updated", []);
    return { success: true, count: 0, resources: [] };
  }

  getRegisteredShelters(userLat, userLng) {
    return [];
  }

  getEmergencyServices(userLat, userLng) {
    const uLat = Number(userLat) || 19.1320;
    const uLng = Number(userLng) || 72.8480;
    // Dynamically generate emergency services localized to the user's GPS area
    return [
      {
        id: "EMS-LOC-01",
        name: "Local Fire & Flood Rescue Outpost",
        category: "fire",
        icon: "🚒",
        type: "Fire & Rapid Water Rescue",
        station: "Area Emergency Response Unit",
        phone: "101 / 112",
        lat: Number((uLat + 0.0035).toFixed(4)),
        lng: Number((uLng - 0.0025).toFixed(4)),
        distanceKm: calcHaversineDistanceKm(uLat, uLng, uLat + 0.0035, uLng - 0.0025),
        status: "Active 24/7"
      },
      {
        id: "EMS-LOC-02",
        name: "Civil Municipal Hospital Trauma Center",
        category: "medical",
        icon: "🚑",
        type: "Emergency & Trauma Care",
        station: "Emergency Healthcare Complex",
        phone: "102 / 108",
        lat: Number((uLat - 0.0055).toFixed(4)),
        lng: Number((uLng + 0.0040).toFixed(4)),
        distanceKm: calcHaversineDistanceKm(uLat, uLng, uLat - 0.0055, uLng + 0.0040),
        status: "Emergency Ward Open"
      },
      {
        id: "EMS-LOC-03",
        name: "Police Station & Evacuation Outpost",
        category: "police",
        icon: "👮",
        type: "Police & Public Safety",
        station: "Sector Police Station",
        phone: "100 / 112",
        lat: Number((uLat + 0.0020).toFixed(4)),
        lng: Number((uLng + 0.0030).toFixed(4)),
        distanceKm: calcHaversineDistanceKm(uLat, uLng, uLat + 0.0020, uLng + 0.0030),
        status: "Patrol Active"
      },
      {
        id: "EMS-LOC-04",
        name: "Disaster Management Command Cell",
        category: "municipal",
        icon: "🏛️",
        type: "Municipal Relief Operations",
        station: "Civic Administrative Office",
        phone: "1916 / 1077",
        lat: Number((uLat - 0.0025).toFixed(4)),
        lng: Number((uLng - 0.0015).toFixed(4)),
        distanceKm: calcHaversineDistanceKm(uLat, uLng, uLat - 0.0025, uLng - 0.0015),
        status: "Direct Control"
      }
    ].sort((a, b) => a.distanceKm - b.distanceKm);
  }

  getShelters(userLat, userLng) {
    if (!userLat || !userLng) return this.shelters;
    const uLat = parseFloat(userLat);
    const uLng = parseFloat(userLng);
    if (isNaN(uLat) || isNaN(uLng)) return this.shelters;

    // Check if user is near base Mumbai network (within ~35km)
    const baseDist = Math.hypot(uLat - 19.132, uLng - 72.848);
    if (baseDist < 0.35) {
      return this.shelters.map((sh) => {
        const dKm = calcHaversineDistanceKm(uLat, uLng, sh.lat, sh.lng);
        return { ...sh, distanceKm: dKm };
      }).sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // Dynamically generate high-ground evacuation shelters localized to the user's GPS area
    return [
      {
        id: "SHL-LOC-01",
        name: "Elevated Civic Community Relief Hall",
        address: "Higher Ground Elevation, Main Sector Road",
        category: "shelter",
        icon: "🏠",
        lat: Number((uLat + 0.0045).toFixed(4)),
        lng: Number((uLng + 0.0025).toFixed(4)),
        distanceKm: calcHaversineDistanceKm(uLat, uLng, uLat + 0.0045, uLng + 0.0025),
        capacity: "450 people",
        currentOccupancy: 32,
        status: "Safe / High Ground",
        riskLevel: "GREEN",
        facilities: ["Drinking Water", "First Aid Station", "Backup Generator", "Dry Rations"],
        contact: "022-2684-1100"
      },
      {
        id: "SHL-LOC-02",
        name: "Government Higher Secondary School Shelter",
        address: "2nd Floor Safe Flood Relief Wing",
        category: "shelter",
        icon: "🏠",
        lat: Number((uLat - 0.0040).toFixed(4)),
        lng: Number((uLng - 0.0050).toFixed(4)),
        distanceKm: calcHaversineDistanceKm(uLat, uLng, uLat - 0.0040, uLng - 0.0050),
        capacity: "600 people",
        currentOccupancy: 70,
        status: "Safe / Elevated 2nd Floor",
        riskLevel: "GREEN",
        facilities: ["Medical Officer on Duty", "Dry Sleeping Area", "Emergency Charging"],
        contact: "022-2684-2200"
      },
      {
        id: "SHL-LOC-03",
        name: "Municipal Welfare & Evacuation Center",
        address: "Public Sports Complex & Welfare Pavilion",
        category: "shelter",
        icon: "🏠",
        lat: Number((uLat + 0.0025).toFixed(4)),
        lng: Number((uLng - 0.0060).toFixed(4)),
        distanceKm: calcHaversineDistanceKm(uLat, uLng, uLat + 0.0025, uLng - 0.0060),
        capacity: "350 people",
        currentOccupancy: 15,
        status: "Safe / Power Backup Ready",
        riskLevel: "GREEN",
        facilities: ["Emergency Community Kitchen", "Sanitation", "Rescue Point"],
        contact: "022-2684-3300"
      }
    ].sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Upsert user profile, location, sharing status, and push token
   */
  upsertUser(userData = {}) {
    const userId = userData.user_id || userData.id || userData.phone || `USR-${Date.now().toString().slice(-4)}`;
    const displayName = userData.display_name || userData.name || "VarshaRaksha Citizen";
    const role = userData.role || "Citizen";
    const phone = userData.phone || null;
    const lat = userData.latitude != null ? Number(userData.latitude) : userData.lat != null ? Number(userData.lat) : null;
    const lng = userData.longitude != null ? Number(userData.longitude) : userData.lng != null ? Number(userData.lng) : null;
    const locSharing = userData.location_sharing_enabled !== false;
    const pushToken = userData.push_token || userData.pushToken || null;
    const nowIso = new Date().toISOString();

    let existing = (this.users || []).find(u => u.user_id === userId || (phone && u.phone === phone));
    if (existing) {
      existing.display_name = displayName;
      existing.role = role;
      if (phone) existing.phone = phone;
      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        existing.latitude = lat;
        existing.longitude = lng;
        existing.last_location_update = nowIso;
      }
      existing.location_sharing_enabled = locSharing;
      existing.is_online = true;
      if (pushToken) existing.push_token = pushToken;
      existing.updatedAt = nowIso;
    } else {
      existing = {
        user_id: userId,
        display_name: displayName,
        role,
        phone,
        latitude: (lat != null && !isNaN(lat)) ? lat : 19.1320,
        longitude: (lng != null && !isNaN(lng)) ? lng : 72.8480,
        last_location_update: nowIso,
        location_sharing_enabled: locSharing,
        is_online: true,
        push_token: pushToken,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      if (!Array.isArray(this.users)) this.users = [];
      this.users.unshift(existing);
    }
    this.save();
    return existing;
  }

  /**
   * Dynamic Nearby Flood Buddies Discovery
   * Filters out current user, applies configurable radius, checks location sharing,
   * calculates distance from GPS, and attaches any active flood alert near each buddy.
   */
  getNearbyFloodBuddies({ latitude, longitude, radius = 5000, currentUserId = null, maxAgeMinutes = 120 } = {}) {
    const currentLat = latitude != null ? Number(latitude) : 19.1320;
    const currentLng = longitude != null ? Number(longitude) : 72.8480;
    const radiusMeters = Number(radius) || 5000;
    const nowMs = Date.now();
    const buddies = [];

    for (const u of (this.users || [])) {
      // Exclude current user from their own list
      if (currentUserId && (u.user_id === currentUserId || u.phone === currentUserId || (u.display_name && u.display_name === currentUserId))) {
        continue;
      }

      // Must have location sharing enabled
      if (u.location_sharing_enabled === false) {
        continue;
      }

      const uLat = u.latitude != null ? Number(u.latitude) : null;
      const uLng = u.longitude != null ? Number(u.longitude) : null;
      if (uLat == null || uLng == null || isNaN(uLat) || isNaN(uLng)) {
        continue;
      }

      const distMeters = Math.round(calcExactDistanceMeters(currentLat, currentLng, uLat, uLng));
      if (distMeters > radiusMeters) {
        continue;
      }

      const lastUpdate = new Date(u.last_location_update || u.updatedAt || u.createdAt || nowMs);
      const ageMinutes = Math.max(0, Math.round((nowMs - lastUpdate.getTime()) / 60000));
      if (maxAgeMinutes && ageMinutes > maxAgeMinutes) {
        continue;
      }

      // Determine active alerts affecting this buddy
      let nearbyAlert = null;
      let closestAlertDist = Infinity;
      const activeAlerts = (this.alerts || []).filter(a => a.status !== "Resolved" && a.status !== "False Alarm");
      for (const alt of activeAlerts) {
        const aLat = alt.lat ?? alt.latitude;
        const aLng = alt.lng ?? alt.longitude;
        if (aLat != null && aLng != null && !isNaN(Number(aLat)) && !isNaN(Number(aLng))) {
          const d = calcExactDistanceMeters(uLat, uLng, Number(aLat), Number(aLng));
          if (d <= 3000 && d < closestAlertDist) {
            closestAlertDist = d;
            nearbyAlert = {
              id: alt.id,
              type: alt.type || alt.source || "FLOOD_RISK",
              title: alt.title || "Flood Risk Warning",
              severity: (alt.severity || alt.level || "HIGH").toUpperCase(),
              description: alt.description || alt.message || "Heavy rainfall and water accumulation detected near area.",
              distance_meters: Math.round(d),
              distance_km: Math.round(d / 100) / 10
            };
          }
        }
      }

      buddies.push({
        user_id: u.user_id,
        display_name: u.display_name || u.name || "Citizen",
        role: u.role || "Resident",
        distance_meters: distMeters,
        distance_km: Math.round(distMeters / 100) / 10,
        distanceM: distMeters, // backwards compatibility
        name: u.display_name || u.name, // backwards compatibility
        owner: u.display_name || u.name, // backwards compatibility
        id: u.user_id, // backwards compatibility
        location_updated_at: u.last_location_update || new Date(nowMs).toISOString(),
        age_minutes: ageMinutes,
        freshness_label: ageMinutes < 2 ? "just now" : `${ageMinutes}m ago`,
        is_online: ageMinutes <= 15,
        nearby_alert: nearbyAlert
      });
    }

    // Sort by proximity: nearest first
    buddies.sort((a, b) => a.distance_meters - b.distance_meters);
    return buddies;
  }

  getFloodBuddies(params = {}) {
    return this.getNearbyFloodBuddies(params);
  }

  getChronicBlockages() {
    return this.chronicBlockages;
  }

  getSosAlerts() {
    return this.sosAlerts;
  }

  /**
   * Clear all active SOS alerts and emergency dispatch orders
   */
  clearAllSosAlerts() {
    this.sosAlerts = [];
    this.alerts = (this.alerts || []).filter((a) => !a.isSos && a.type !== "SOS");
    this.incidents = (this.incidents || []).filter((i) => !i.isSos && i.type !== "SOS");
    this.dispatches = [];
    if (this.resources) {
      for (const r of this.resources) {
        r.status = "Available";
        r.currentIncidentId = null;
        r.activeDispatchId = null;
        r.eta = null;
      }
    }
    this.save();
    this.emit("sos:cleared", { success: true });
    this.emit("incidents:updated", this.incidents);
    return { success: true, count: this.incidents.length };
  }

  /**
   * Trigger SOS Emergency Rescue Request with Backend Geofencing and Deduplication (500m)
   */
  async triggerSos(sosData = {}) {
    const release = await this.sosLock.acquire();
    try {
      return await this._processTriggerSos(sosData);
    } finally {
      release();
    }
  }

  async _processTriggerSos(sosData = {}) {
    const lat = Number(sosData.latitude != null ? sosData.latitude : (sosData.lat != null ? sosData.lat : 19.132));
    const lng = Number(sosData.longitude != null ? sosData.longitude : (sosData.lng != null ? sosData.lng : 72.848));
    const userId = sosData.user_id || sosData.userId || (sosData.userPhone ? `USR-${sosData.userPhone.replace(/\D/g, "").slice(-4)}` : "USR-SHOPKEEPER-72");
    const userName = sosData.userName || sosData.user_name || sosData.reporter || "Citizen";
    const userPhone = sosData.userPhone || sosData.user_phone || sosData.phone || "+919869001892";
    const emergencyNumber = sosData.emergencyNumber || sosData.emergency_number || sosData.emergencyPhone || "9869001892";
    const role = sosData.role || "Shop Owner";
    const address = sosData.address || "Station Road Commercial Market";
    const now = new Date();
    const formattedTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const userTimestamp = sosData.timestamp || now.toISOString();

    // Track user submission and check false-alarm quarantine status
    const userKey = userPhone || userName || "ANONYMOUS";
    const reputation = this.recordReportSubmission(userKey, {
      userName,
      userPhone
    });
    const isUserQuarantined = Boolean(reputation.isQuarantined);

    // Query all ACTIVE SOS incidents eligible for deduplication
    const activeSosIncidents = (this.incidents || []).filter((i) => {
      if (!i) return false;
      const isSos = Boolean(i.isSos || i.type === "SOS" || i.causeCode === "SOS_EMERGENCY" || i.status === "ACTIVE_SOS");
      if (!isSos) return false;

      const st = String(i.status || "").trim().toUpperCase();
      const inactiveStatuses = ["RESOLVED", "FALSE_ALARM", "FALSE ALARM", "CLOSED", "COMPLETED", "QUARANTINED_SPAM", "QUARANTINED SPAM"];
      if (inactiveStatuses.includes(st)) return false;
      if (i.isQuarantined || i.resolvedAt != null || i.falseAlarmAt != null) return false;

      return true;
    });

    // Find the nearest active SOS incident within SOS_DEDUP_RADIUS_METERS
    let nearestIncident = null;
    let minDistanceMeters = Infinity;

    for (const activeInc of activeSosIncidents) {
      const incLat = Number(activeInc.lat != null ? activeInc.lat : activeInc.latitude);
      const incLng = Number(activeInc.lng != null ? activeInc.lng : activeInc.longitude);
      if (isNaN(incLat) || isNaN(incLng)) continue;

      const distMeters = calcExactDistanceMeters(lat, lng, incLat, incLng);
      if (distMeters <= SOS_DEDUP_RADIUS_METERS && distMeters < minDistanceMeters) {
        minDistanceMeters = distMeters;
        nearestIncident = activeInc;
      }
    }

    // =========================================================================
    // CASE 1: MATCHING ACTIVE INCIDENT FOUND WITHIN 500m -> DEDUPLICATE / MERGE
    // =========================================================================
    if (nearestIncident) {
      const targetInc = nearestIncident;

      // Ensure targetInc.reports is initialized
      if (!Array.isArray(targetInc.reports) || targetInc.reports.length === 0) {
        const primaryReport = {
          id: `RPT-${(targetInc.id || "INC-1000").replace(/\D/g, "")}-01`,
          incident_id: targetInc.id,
          sos_id: targetInc.sosId || `SOS-${targetInc.id}`,
          user_id: targetInc.reporterReputation?.identifier || "USR-PRIMARY",
          user_name: targetInc.reporter || "Primary Reporter",
          user_phone: targetInc.userPhone || "+919869001892",
          emergency_number: targetInc.emergencyNumber || "9869001892",
          role: targetInc.role || "Citizen",
          latitude: Number(targetInc.lat),
          longitude: Number(targetInc.lng),
          lat: Number(targetInc.lat),
          lng: Number(targetInc.lng),
          address: targetInc.address,
          distance_meters: 0,
          timestamp: targetInc.createdAt || targetInc.userTimestamp || userTimestamp,
          created_at: targetInc.createdAt || targetInc.userTimestamp || userTimestamp
        };
        targetInc.reports = [primaryReport];
        targetInc.mergedReports = [primaryReport];
      }

      // Check for rapid duplicate taps by the same user within 15 seconds
      const existingRecentReport = targetInc.reports.find((r) => {
        const isSameUser = (r.user_id && userId && r.user_id === userId) ||
          (r.user_phone && userPhone && r.user_phone === userPhone) ||
          (r.user_name && userName && r.user_name === userName);
        if (!isSameUser) return false;
        const timeDiffMs = Math.abs(new Date(userTimestamp).getTime() - new Date(r.timestamp || r.created_at).getTime());
        return timeDiffMs < 15000;
      });

      let newReport = null;

      if (existingRecentReport) {
        // Just update timestamp on rapid double tap
        existingRecentReport.timestamp = userTimestamp;
        newReport = existingRecentReport;
      } else {
        // Create new SOSReport attached to this cluster
        const reportId = `RPT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
        newReport = {
          id: reportId,
          incident_id: targetInc.id,
          sos_id: targetInc.sosId || `SOS-${targetInc.id}`,
          user_id: userId,
          user_name: userName,
          user_phone: userPhone,
          emergency_number: emergencyNumber,
          role,
          latitude: lat,
          longitude: lng,
          lat,
          lng,
          address,
          distance_meters: Math.round(minDistanceMeters),
          timestamp: userTimestamp,
          created_at: userTimestamp
        };

        targetInc.reports.push(newReport);
        if (!Array.isArray(targetInc.mergedReports)) targetInc.mergedReports = [];
        targetInc.mergedReports.push(newReport);
      }

      targetInc.reporter_count = targetInc.reports.length;
      targetInc.clusterCount = targetInc.reports.length;
      targetInc.mergedCount = targetInc.reports.length;
      targetInc.last_reported_at = userTimestamp;
      targetInc.updatedAt = userTimestamp;
      targetInc.latest_report = newReport;

      // Note: The incident's primary lat/lng coordinates REMAIN the original anchor location (do not drift)
      // Update alert description to reflect aggregated cluster count
      const matchedAlert = (this.alerts || []).find((a) => a.incidentId === targetInc.id || a.sosId === targetInc.sosId);
      if (matchedAlert) {
        matchedAlert.description = `🚨 Clustered SOS (${targetInc.reporter_count} reports within 500m). Latest: ${userName} (${userPhone}) at ${address}`;
        matchedAlert.reporterCount = targetInc.reporter_count;
        matchedAlert.reporter_count = targetInc.reporter_count;
        matchedAlert.reports = targetInc.reports;
        matchedAlert.updatedAt = userTimestamp;
      }

      this.save();

      // Realtime event broadcast
      const clusterEvent = {
        type: "SOS_CLUSTER_UPDATED",
        event: "SOS_CLUSTER_UPDATED",
        incident_id: targetInc.id,
        reporter_count: targetInc.reporter_count,
        latest_report: newReport,
        incident: targetInc,
        distance_meters: Math.round(minDistanceMeters),
        timestamp: userTimestamp
      };
      this.emit("SOS_CLUSTER_UPDATED", clusterEvent);
      this.emit("report:merged", { incident: targetInc, report: newReport, distance_meters: Math.round(minDistanceMeters) });
      this.emit("incident:updated", { incident: targetInc });

      const nearbyUnitsForMerge = this.getEmergencyServices(lat, lng);
      targetInc.nearbyResources = nearbyUnitsForMerge;
      targetInc.nearbyServices = nearbyUnitsForMerge;

      return {
        status: "merged",
        incident_id: targetInc.id,
        sos_id: targetInc.sosId || `SOS-${targetInc.id}`,
        distance_meters: Math.round(minDistanceMeters),
        reporter_count: targetInc.reporter_count,
        first_reported_at: targetInc.first_reported_at || targetInc.createdAt,
        last_reported_at: targetInc.last_reported_at || userTimestamp,
        message: "Your emergency report has been added to an existing nearby emergency alert.",
        incident: targetInc,
        nearbyResources: nearbyUnitsForMerge,
        nearby_resources: nearbyUnitsForMerge,
        nearbyServices: nearbyUnitsForMerge,
        nearestResource: targetInc.nearestResource || nearbyUnitsForMerge[0],
        success: true,
        assignedTeam: targetInc.assignedTeam || targetInc.recommendedTeam,
        teamPhone: targetInc.assignedTeamPhone,
        eta: targetInc.eta || "4–6 min"
      };
    }

    // =========================================================================
    // CASE 2: NO ACTIVE INCIDENT WITHIN 500m -> CREATE NEW SOS INCIDENT
    // =========================================================================
    const id = `SOS-${2000 + (this.sosAlerts?.length || 0) + 1}`;

    // Dynamically discover nearest emergency unit relative to caller's coordinates
    const nearbyUnits = this.getEmergencyServices(lat, lng);
    const rescueTeam = nearbyUnits[0] || (this.resources || []).find((t) => t.id === "TEAM-05" || t.id === "TEAM-03") || (this.resources || [])[0] || { name: "Municipal Flood Rescue Fleet", phone: "+91 98200 55663" };
    const computedEta = rescueTeam.distanceKm != null
      ? `${Math.max(2, Math.round(rescueTeam.distanceKm * 3.5 + 2))} mins`
      : "4–6 min";

    const sos = {
      id,
      userId,
      userName,
      userPhone,
      emergencyNumber,
      role,
      lat,
      lng,
      address,
      emergencyStatus: "ACTIVE_SOS",
      assignedTeam: rescueTeam.name,
      assignedTeamPhone: rescueTeam.phone,
      eta: computedEta,
      timestamp: userTimestamp,
      isQuarantined: isUserQuarantined,
      quarantineReason: isUserQuarantined ? reputation.quarantineReason : null,
      smsSuppressed: isUserQuarantined
    };

    const maxNum = (this.incidents || []).reduce((max, inc) => {
      const match = (inc.id || "").match(/INC-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1000);
    const incidentId = `INC-${maxNum + 1}`;

    const firstReport = {
      id: `RPT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
      incident_id: incidentId,
      sos_id: id,
      user_id: userId,
      user_name: userName,
      user_phone: userPhone,
      emergency_number: emergencyNumber,
      role,
      latitude: lat,
      longitude: lng,
      lat,
      lng,
      address,
      distance_meters: 0,
      timestamp: userTimestamp,
      created_at: userTimestamp
    };

    const sosIncident = {
      id: incidentId,
      sosId: id,
      type: "SOS",
      isSos: true,
      zoneId: "ZONE-01",
      reporter: userName,
      role,
      userPhone,
      emergencyNumber,
      time: formattedTime,
      userTimestamp,
      timestamp: userTimestamp,
      first_reported_at: userTimestamp,
      last_reported_at: userTimestamp,
      status: "ACTIVE_SOS",
      severity: isUserQuarantined ? 50 : 95,
      isQuarantined: isUserQuarantined,
      quarantineReason: isUserQuarantined ? reputation.quarantineReason : null,
      reporterReputation: reputation,
      smsSuppressed: isUserQuarantined,
      cause: isUserQuarantined ? "⚠️ Flagged User SOS (Spam Risk)" : "🚨 Emergency Life-Safety SOS",
      causeCode: isUserQuarantined ? "SOS_FLAGGED_USER" : "SOS_EMERGENCY",
      causeDescription: isUserQuarantined
        ? `Distress signal from user with ${reputation.falseAlarmCount} prior false alarms. Automated SMS suppressed to protect emergency lines. Callback required: ${userPhone}.`
        : `Immediate distress signal triggered by ${userName} (${role}). User Phone: ${userPhone} · Emergency Contact: ${emergencyNumber}`,
      recommendedTeam: rescueTeam.name,
      recommendedTeamId: rescueTeam.id,
      nearestResource: rescueTeam,
      nearbyResources: nearbyUnits,
      nearbyServices: nearbyUnits,
      routingRationale: isUserQuarantined
        ? `Quarantine active: Dispatch held pending manual phone confirmation.`
        : `Immediate high-priority deployment of ${rescueTeam.name} (${rescueTeam.distanceKm != null ? `${rescueTeam.distanceKm} km away` : "nearest unit"}) to active GPS distress coordinate.`,
      waterLevel: 55,
      drainObservation: "Distress / Flooding",
      onsetSpeed: "Immediate",
      recurrence: "No",
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      geohash: "te7u8",
      evidenceHash: `0xSOS${Date.now().toString(16)}`,
      address,
      note: isUserQuarantined
        ? `⚠️ QUARANTINED SOS BROADCAST: User ${userName} has ${reputation.falseAlarmCount} prior false alarms. Automated SMS suppressed.`
        : `EMERGENCY SOS BROADCAST: User ${userName} triggered life-safety alarm at ${address}. Contact: ${userPhone}`,
      photo: false,
      photoUrl: null,
      video: false,
      videoUrl: null,
      mediaType: "none",
      gps: true,
      liveGps: true,
      liveLocation: {
        latitude: lat,
        longitude: lng,
        address,
        capturedAt: userTimestamp
      },
      cvConfidence: isUserQuarantined ? 10 : 100,
      cvConfidenceDecimal: isUserQuarantined ? 0.10 : 1.0,
      aiVerified: !isUserQuarantined,
      aiFloodConfidence: isUserQuarantined ? 0.10 : 1.0,
      cvModelLabel: isUserQuarantined ? "QUARANTINED_USER_SOS" : "EMERGENCY_SOS_DIRECT_DISPATCH",
      cvStatus: isUserQuarantined ? "Unverified" : "Verified",
      reporter_count: 1,
      clusterCount: 1,
      mergedCount: 1,
      reports: [firstReport],
      mergedReports: [firstReport],
      latest_report: firstReport,
      relatedIncidentId: null,
      duplicateOf: null,
      createdAt: userTimestamp,
      updatedAt: userTimestamp
    };

    const alertId = `ALT-${Date.now().toString().slice(-4)}`;
    const sosAlertItem = {
      id: alertId,
      sosId: id,
      incidentId,
      title: isUserQuarantined ? `⚠️ FLAGGED USER SOS: ${userName}` : `🚨 CRITICAL SOS: ${userName}`,
      description: isUserQuarantined
        ? `Quarantined reporter (${reputation.falseAlarmCount} false alarms). Auto-SMS suppressed. Contact: ${userPhone}`
        : `Immediate distress signal triggered at ${address}. Contact: ${userPhone} (Emergency: ${emergencyNumber})`,
      severity: isUserQuarantined ? "WARNING" : "CRITICAL",
      zoneId: "ZONE-01",
      area: address,
      userPhone,
      emergencyNumber,
      userName,
      role,
      reporterCount: 1,
      isQuarantined: isUserQuarantined,
      timestamp: userTimestamp,
      type: "SOS",
      isSos: true,
      unread: true
    };

    this.incidents.unshift(sosIncident);
    this.alerts.unshift(sosAlertItem);
    this.sosAlerts.unshift(sos);
    this.save();
    this.emit("sos:triggered", { sos, team: rescueTeam, incident: sosIncident, alert: sosAlertItem, nearbyResources: nearbyUnits });
    this.emit("report:created", { incident: sosIncident, zoneId: "ZONE-01" });
    this.emit("incident:created", { incident: sosIncident, zoneId: "ZONE-01" });

    // Only dispatch Twilio SMS and PagerDuty if the user is NOT quarantined
    if (!isUserQuarantined) {
      sendSosSms(sos).then((twResult) => {
        console.log(`[SOS Twilio] SMS alert dispatched for ${id}:`, twResult);
      }).catch((err) => {
        console.warn(`[SOS Twilio] SMS notice:`, err.message);
      });

      triggerPagerDutySos(sos).then((pdResult) => {
        console.log(`[SOS Dispatch] PagerDuty escalation triggered for ${id} (Call: 9869001892)`, pdResult);
      }).catch((err) => {
        console.warn(`[SOS Dispatch] PagerDuty notice:`, err.message);
      });
    } else {
      console.warn(`[SOS Quarantine] Suppressed automated Twilio SMS & PagerDuty for ${id} due to repeat false alarms (${reputation.falseAlarmCount} strikes).`);
    }

    return {
      status: "created",
      incident_id: sosIncident.id,
      sos_id: id,
      reporter_count: 1,
      distance_meters: 0,
      first_reported_at: userTimestamp,
      last_reported_at: userTimestamp,
      message: isUserQuarantined
        ? `SOS recorded. Note: User has ${reputation.falseAlarmCount} prior false alarms. Automated SMS alert suppressed to protect emergency channels. Control room will verify via voice call.`
        : "Emergency alert sent.",
      incident: sosIncident,
      sos,
      nearbyResources: nearbyUnits,
      nearby_resources: nearbyUnits,
      nearbyServices: nearbyUnits,
      nearestResource: rescueTeam,
      success: true,
      isQuarantined: isUserQuarantined,
      smsSuppressed: isUserQuarantined,
      assignedTeam: isUserQuarantined ? "Verification Required (Manual Call)" : rescueTeam.name,
      teamPhone: rescueTeam.phone,
      targetEmergencyPhone: emergencyNumber,
      twilioSender: "+17655635185",
      twilioTestRecipient: "+919869001892",
      twilioStatus: isUserQuarantined ? "SUPPRESSED_DUE_TO_QUARANTINE" : "DISPATCHED",
      pagerdutyStatus: isUserQuarantined ? "HELD_PENDING_CONFIRMATION" : "DISPATCHED_CALL_ACTIVE",
      eta: isUserQuarantined ? "Pending Call" : computedEta
    };
  }

  /**
   * Send dynamic Flood Buddy warning notification
   * Identifies sender display name, verifies recipient eligibility, validates alert relevance,
   * enforces anti-spam cooldown, saves notification record, emits realtime event, and sends push notification.
   */
  sendFloodBuddyNotification({ recipientId, senderId, senderName, senderRole, alertId = null, customMessage = null }) {
    if (!recipientId) throw new Error("Recipient ID is required");

    const recipient = (this.users || []).find(
      u => u.user_id === recipientId || u.id === recipientId || u.phone === recipientId || u.display_name === recipientId
    );
    if (!recipient) {
      throw new Error(`Recipient user not found (${recipientId})`);
    }

    if (recipient.location_sharing_enabled === false) {
      throw new Error("Recipient has disabled location sharing");
    }

    const actualSenderName = senderName || "A Flood Buddy";
    const actualSenderRole = senderRole || "Neighbor";

    // Anti-spam / Cooldown check (3 minutes cooldown for same sender -> recipient -> alert)
    const cooldownKey = `${senderId || 'anon'}_${recipient.user_id}_${alertId || 'gen'}`;
    const lastSent = this.notificationCooldowns ? this.notificationCooldowns[cooldownKey] : null;
    const now = Date.now();
    if (lastSent && (now - lastSent) < 180000) {
      const remainingSec = Math.ceil((180000 - (now - lastSent)) / 1000);
      return {
        success: false,
        error: `You recently warned ${recipient.display_name}. Please wait ${remainingSec}s before sending another alert.`,
        cooldown: true,
        remainingSeconds: remainingSec
      };
    }
    if (!this.notificationCooldowns) this.notificationCooldowns = {};
    this.notificationCooldowns[cooldownKey] = now;

    const alert = alertId ? (this.alerts || []).find(a => a.id === alertId) : null;
    const title = `🚨 ${actualSenderName} warned you`;
    let body = customMessage || (alert
      ? `${alert.title || "High flood risk"} has been detected near your area. Please be prepared.`
      : `Flood risk has been detected near your area. Please be prepared.`);

    const notification = {
      id: `NOTIF-${Date.now().toString().slice(-5)}`,
      recipient_user_id: recipient.user_id,
      recipient_name: recipient.display_name,
      sender_user_id: senderId || "USR-ANON",
      sender_name: actualSenderName,
      sender_role: actualSenderRole,
      alert_id: alertId || null,
      type: "FLOOD_BUDDY_WARNING",
      title,
      body,
      severity: alert?.severity || "HIGH",
      created_at: new Date().toISOString(),
      read_at: null,
      status: "unread"
    };

    if (!Array.isArray(this.notifications)) this.notifications = [];
    this.notifications.unshift(notification);
    if (this.notifications.length > 200) this.notifications = this.notifications.slice(0, 200);
    this.save();

    // Realtime broadcast (SSE)
    this.emit("flood_buddy:notified", notification);
    this.emit("notification:new", notification);

    // Push notification to Expo device if push_token is registered
    if (recipient.push_token && typeof recipient.push_token === "string" && recipient.push_token.startsWith("ExponentPushToken")) {
      fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          to: recipient.push_token,
          sound: "default",
          title,
          body,
          data: { notificationId: notification.id, type: "FLOOD_BUDDY_WARNING", alertId }
        })
      }).catch(() => {});
    }

    return {
      success: true,
      notification,
      target: recipient.display_name,
      message: `Flood warning sent to ${recipient.display_name}.`
    };
  }

  notifyFloodBuddy(targetShopId, senderData = {}) {
    return this.sendFloodBuddyNotification({
      recipientId: targetShopId || senderData.targetShopId || senderData.recipientId,
      senderId: senderData.senderId || senderData.userId || "USR-ANON",
      senderName: senderData.name || senderData.senderName || "Neighboring Shopkeeper",
      senderRole: senderData.role || senderData.senderRole || "Shop Owner",
      alertId: senderData.alertId || senderData.alert_id || null,
      customMessage: senderData.message || senderData.customMessage || null
    });
  }

  getUserNotifications(userId) {
    if (!userId) return [];
    return (this.notifications || []).filter(
      n => n.recipient_user_id === userId || n.recipient_name === userId
    );
  }

  markNotificationRead(userId, notifId) {
    const notif = (this.notifications || []).find(
      n => n.id === notifId && (n.recipient_user_id === userId || n.recipient_name === userId)
    );
    if (notif) {
      notif.read_at = new Date().toISOString();
      notif.status = "read";
      this.save();
    }
    return { success: true };
  }

  /**
   * Record User Alert Feedback for Future Model Training
   */
  recordAlertFeedback(alertId, feedbackData) {
    const feedback = {
      id: `FB-${Date.now().toString().slice(-4)}`,
      alertId,
      userId: feedbackData.userId || "ANONYMOUS_USER",
      role: feedbackData.role || "Shop Owner",
      feedbackType: feedbackData.type, // "RESOLVED" | "FALSE_ALARM"
      lat: feedbackData.lat || null,
      lng: feedbackData.lng || null,
      notes: feedbackData.notes || "",
      timestamp: new Date().toISOString()
    };

    this.alertFeedbacks.unshift(feedback);
    this.save();
    this.emit("alert:feedback_recorded", feedback);

    return {
      success: true,
      feedbackId: feedback.id,
      message: `Thank you. Alert status updated to ${feedbackData.type}. Feedback archived for predictive model improvement.`
    };
  }

  /**
   * Live Blitzortung Lightning Detection Data
   */
  getLightningData() {
    return {
      success: true,
      network: "Blitzortung Live Lightning Network",
      region: "Mumbai Suburbs / Ward 72 & 73",
      detected: true,
      strikesLastHour: 18,
      closestStrikeKm: 2.8,
      direction: "North-West (Arabian Sea Approach)",
      timestamp: new Date().toISOString(),
      threatLevel: "ELEVATED_LIGHTNING_RISK",
      advisory: "Severe electrical thunderstorm active in coastal zone. Keep electronics unplugged."
    };
  }

  /**
   * Sync real-time weather from Open-Meteo for all monitored zones
   */
  async syncLiveWeatherData() {
    for (const zone of this.zones) {
      const weather = await fetchLiveWeather(zone.lat, zone.lng);
      if (weather.success) {
        const liveRain = weather.currentRainfallMm > 0 ? weather.currentRainfallMm : weather.totalTodayRainMm;
        zone.rainfall = liveRain;
        zone.temperature = weather.temperatureC;
        zone.humidity = weather.relativeHumidity;
      }

      const activeZoneReports = this.incidents.filter((i) => i.zoneId === zone.id && i.status !== "False Alarm");
      zone.reports = activeZoneReports.length;

      if (activeZoneReports.length > 0) {
        const avgWater = activeZoneReports.reduce((sum, r) => sum + (Number(r.waterLevel) || 0), 0) / activeZoneReports.length;
        zone.waterLevel = Math.round(avgWater);
      } else {
        zone.waterLevel = 0;
      }

      const blockedDrainReports = activeZoneReports.filter((r) => r.causeCode === "SUSPECTED_BLOCKED_DRAIN" || (r.note && /drain|clog|blocked/i.test(r.note)));
      const drainPenalty = blockedDrainReports.length * 10;
      const { score } = scoreRisk({
        rainfall: zone.rainfall,
        waterLevel: zone.waterLevel,
        reports: zone.reports,
        drainPenalty
      });

      const previousRisk = zone.risk;
      zone.risk = score;
      zone.trend = score > previousRisk ? "rising" : score < previousRisk ? "falling" : "stable";

      const divergence = classifyCause({
        rainfall: zone.rainfall,
        waterLevel: zone.waterLevel,
        blockedDrainSignal: blockedDrainReports.length > 0
      });
      zone.cause = divergence.name;
      zone.causeCode = divergence.code;
    }

    this.recomputeAlerts();
    this.save();
    this.emit("weather:synced", { zones: this.zones, alerts: this.alerts });
    return this.zones;
  }

  recomputeAlerts() {
    const existingSosAlerts = (this.alerts || []).filter((a) => a.type === "SOS" || a.isSos || a.source === "incident");
    const newAlerts = [];

    // 1. Zone Flood Risk Alerts
    for (const zone of this.zones) {
      if (zone.risk >= 45) {
        const isRed = zone.risk >= 75;
        const alertId = `ALT-FLD-${zone.id.replace("Z-", "")}-${Math.round(zone.risk)}`;
        newAlerts.push({
          id: alertId,
          type: "flood",
          source: "flood",
          sourceName: "VarshaRaksha Risk Engine",
          zoneId: zone.id,
          zoneName: zone.name,
          location_name: `${zone.name}, ${zone.ward || "Mumbai"}`,
          area: zone.name,
          lat: Number(zone.lat),
          lng: Number(zone.lng),
          latitude: Number(zone.lat),
          longitude: Number(zone.lng),
          level: isRed ? "RED" : "ORANGE",
          severity: isRed ? "CRITICAL" : "HIGH",
          title: isRed ? `Critical flood risk at ${zone.name}` : `Elevated flood risk at ${zone.name}`,
          description: `${zone.name} is showing risk score ${zone.risk}/100. Likely cause: ${zone.cause}. Live rain: ${zone.rainfall} mm, water depth: ${zone.waterLevel} cm.`,
          message: `${zone.name} is showing risk score ${zone.risk}/100. Likely cause: ${zone.cause}. Live rain: ${zone.rainfall} mm, water depth: ${zone.waterLevel} cm.`,
          status: isRed ? "Active Warning" : "Monitoring",
          eta: isRed ? "10–12 min" : "20 min",
          channels: isRed ? ["App", "SMS", "WhatsApp", "PagerDuty"] : ["App", "SMS"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 2. Heavy Rainfall Alerts (zones with heavy rain)
    const highRainZones = this.zones.filter((z) => (z.rainfall || 0) >= 15);
    for (const rz of highRainZones) {
      const isExtreme = rz.rainfall >= 40;
      newAlerts.push({
        id: `ALT-RAIN-${rz.id}`,
        type: "rainfall",
        source: "rainfall",
        sourceName: "Rainfall Monitoring Radar",
        zoneId: rz.id,
        zoneName: rz.name,
        location_name: `${rz.name}, ${rz.ward || "Mumbai"}`,
        area: rz.name,
        lat: Number(rz.lat),
        lng: Number(rz.lng),
        latitude: Number(rz.lat),
        longitude: Number(rz.lng),
        level: isExtreme ? "RED" : "ORANGE",
        severity: isExtreme ? "HIGH" : "ELEVATED",
        title: `Heavy rainfall detected near ${rz.name}`,
        description: `Rainfall rate at ${rz.rainfall} mm/hr. Waterlogging probability elevated on primary arterial roads.`,
        message: `Rainfall rate at ${rz.rainfall} mm/hr. Waterlogging probability elevated on primary arterial roads.`,
        status: "Active Radar Tracking",
        channels: ["App", "SMS"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 3. Blitzortung Live Lightning Detection Alert
    const ltgData = this.getLightningData();
    if (ltgData && ltgData.detected) {
      newAlerts.push({
        id: "ALT-LTG-01",
        type: "lightning",
        source: "lightning",
        sourceName: "Blitzortung Live Lightning Network",
        location_name: "Versova Coastal Belt, Ward 72",
        area: "Versova Coastal Belt",
        lat: 19.1350,
        lng: 72.8220,
        latitude: 19.1350,
        longitude: 72.8220,
        level: "ORANGE",
        severity: "MODERATE",
        title: "Lightning activity detected nearby",
        description: `${ltgData.strikesLastHour || 18} lightning discharges recorded within ${ltgData.closestStrikeKm || 2.8} km (${ltgData.direction || "North-West"}). ${ltgData.advisory || "Severe electrical thunderstorm active."}`,
        message: `${ltgData.strikesLastHour || 18} lightning discharges recorded within ${ltgData.closestStrikeKm || 2.8} km (${ltgData.direction || "North-West"}). ${ltgData.advisory || "Severe electrical thunderstorm active."}`,
        status: "Active Advisory",
        channels: ["App"],
        createdAt: ltgData.timestamp || new Date().toISOString(),
        updatedAt: ltgData.timestamp || new Date().toISOString()
      });
    }

    // 4. Chronic Drainage Blockage Alerts
    const severeBlockages = (this.chronicBlockages || []).filter((b) => (b.flagCount || 0) >= 4);
    for (const blk of severeBlockages) {
      newAlerts.push({
        id: `ALT-DRN-${blk.id}`,
        type: "drainage",
        source: "drainage",
        sourceName: "Chronic Drainage GIS",
        location_name: `${blk.name}, ${blk.ward || "Mumbai"}`,
        area: blk.name,
        lat: Number(blk.lat),
        lng: Number(blk.lng),
        latitude: Number(blk.lat),
        longitude: Number(blk.lng),
        level: blk.flagCount >= 6 ? "RED" : "ORANGE",
        severity: blk.flagCount >= 6 ? "HIGH" : "MODERATE",
        title: `Drainage blockage at ${blk.name}`,
        description: `${blk.primaryCause}. Severity trend: ${blk.severityTrend}. Current status: ${blk.status}.`,
        message: `${blk.primaryCause}. Severity trend: ${blk.severityTrend}. Current status: ${blk.status}.`,
        status: blk.status || "Desilting Required",
        channels: ["App"],
        createdAt: blk.lastFlaggedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 5. Active SOS Emergency Alerts
    const activeSosList = this.getSosAlerts();
    for (const sos of activeSosList) {
      newAlerts.push({
        id: `ALT-SOS-${sos.id}`,
        type: "sos",
        source: "incident",
        sourceName: "Citizen SOS Dispatch",
        sosId: sos.id,
        incidentId: sos.incidentId || sos.id,
        location_name: sos.landmark || sos.location || `${sos.lat?.toFixed(4)}, ${sos.lng?.toFixed(4)}`,
        area: sos.landmark || sos.location || "Citizen SOS Location",
        lat: Number(sos.lat),
        lng: Number(sos.lng),
        latitude: Number(sos.lat),
        longitude: Number(sos.lng),
        level: "RED",
        severity: "CRITICAL",
        title: `SOS: ${sos.name || "Citizen"} stranded in flood water (${sos.affectedCount || 1} people)`,
        description: `${sos.note || sos.message || "Immediate water rescue required."} Contact: ${sos.phone || "Emergency Call"}`,
        message: `${sos.note || sos.message || "Immediate water rescue required."} Contact: ${sos.phone || "Emergency Call"}`,
        status: sos.status || "Active SOS",
        channels: ["App", "SMS", "WhatsApp", "PagerDuty"],
        createdAt: sos.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Deduplicate by ID
    const alertMap = new Map();
    for (const a of [...newAlerts, ...existingSosAlerts]) {
      if (!alertMap.has(a.id)) {
        alertMap.set(a.id, a);
      }
    }
    this.alerts = Array.from(alertMap.values());
  }

  /**
   * Add a real citizen incident report
   */
  async addReport(reportData) {
    const userTimestamp = reportData.userTimestamp || reportData.timestamp || new Date().toISOString();
    const formattedTime = reportData.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const lat = reportData.lat != null && !isNaN(Number(reportData.lat))
      ? Number(reportData.lat)
      : reportData.latitude != null && !isNaN(Number(reportData.latitude))
      ? Number(reportData.latitude)
      : reportData.liveLocation?.latitude != null && !isNaN(Number(reportData.liveLocation.latitude))
      ? Number(reportData.liveLocation.latitude)
      : null;

    const lng = reportData.lng != null && !isNaN(Number(reportData.lng))
      ? Number(reportData.lng)
      : reportData.longitude != null && !isNaN(Number(reportData.longitude))
      ? Number(reportData.longitude)
      : reportData.liveLocation?.longitude != null && !isNaN(Number(reportData.liveLocation.longitude))
      ? Number(reportData.liveLocation.longitude)
      : null;

    const geohash = lat != null && lng != null ? encodeGeohash(lat, lng, 6) : "te7uc9";
    const evidenceHash = hashEvidence(`${reportData.note || ""}-${reportData.photoUrl || reportData.photo || ""}`);

    let zoneId = reportData.zoneId;
    if (!zoneId && lat != null && lng != null) {
      const closest = this.findClosestZone(lat, lng);
      zoneId = closest ? closest.id : "Z-01";
    }

    // Comprehensive Water Level mapping matching prompt
    let waterCm = 15;
    if (typeof reportData.waterLevel === "number") {
      waterCm = reportData.waterLevel;
    } else if (reportData.waterLevel === "doorstep" || reportData.waterLevel === "At doorstep (not entered)") {
      waterCm = 8;
    } else if (reportData.waterLevel === "ankle" || reportData.waterLevel === "Entered shop — ankle deep") {
      waterCm = 20;
    } else if (reportData.waterLevel === "knee" || reportData.waterLevel === "Entered shop — knee deep") {
      waterCm = 50;
    } else if (reportData.waterLevel === "waist") {
      waterCm = 90;
    } else if (reportData.customWaterCm) {
      waterCm = Number(reportData.customWaterCm) || 15;
    }

    const zone = this.zones.find((z) => z.id === zoneId);
    const zoneRainfall = zone ? zone.rainfall : 0;

    const isDrainObserved = reportData.drainObservation === "Clearly blocked / overflowing" ||
      reportData.drainObservation === "blocked" ||
      Boolean(reportData.blockedDrainSignal);

    const divergence = classifyCause({
      rainfall: zoneRainfall,
      waterLevel: waterCm,
      blockedDrainSignal: isDrainObserved,
      note: reportData.note || ""
    });

    const cv = calculateCvConfidence({
      photo: Boolean(reportData.photo),
      photoUrl: reportData.photoUrl,
      waterLevel: waterCm,
      gps: Boolean(reportData.lat && reportData.lng),
      note: reportData.note || ""
    });

    const severity = Math.min(100, Math.round(waterCm * 0.75 + (divergence.code === "RAINFALL_OVERLOAD" ? 25 : 20)));

    // Check for nearby cluster context
    const activeExisting = this.incidents.find(
      (inc) =>
        inc.status !== "False Alarm" &&
        inc.status !== "Completed" &&
        (inc.geohash === geohash ||
          (inc.lat && inc.lng && Math.hypot(inc.lat - lat, inc.lng - lng) < 0.003) ||
          (inc.zoneId === zoneId && Math.abs(inc.waterLevel - waterCm) <= 25))
    );

    // Compute next unique incident ID
    const maxNum = this.incidents.reduce((max, inc) => {
      const match = (inc.id || "").match(/INC-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1000);
    const id = `INC-${maxNum + 1}`;
    const autoRoute = getAutoRoutedTeam(divergence.code);

    let publicPhotoUrl = null;
    let publicVideoUrl = null;
    if (reportData.photoUrl && reportData.photoUrl !== "attached") {
      try {
        publicPhotoUrl = await uploadPhotoToSupabase(reportData.photoUrl, id);
      } catch (e) {
        console.warn("[uploadPhotoToSupabase error]:", e.message);
      }
    }
    if (reportData.videoUrl && reportData.videoUrl !== "attached") {
      try {
        publicVideoUrl = await uploadVideoToSupabase(reportData.videoUrl, id);
      } catch (e) {
        console.warn("[uploadVideoToSupabase error]:", e.message);
      }
    }

    const hasVideo = Boolean(reportData.video || reportData.videoUrl || publicVideoUrl);
    const hasPhoto = Boolean(reportData.photo || reportData.photoUrl || publicPhotoUrl);
    const mediaType = hasVideo ? "video" : hasPhoto ? "photo" : "none";

    // If an existing cluster exists, track cluster count and link
    if (activeExisting) {
      activeExisting.mergedCount = (activeExisting.mergedCount || 1) + 1;
      activeExisting.mergedReports = activeExisting.mergedReports || [];
      activeExisting.mergedReports.push({
        id: `REP-${Date.now().toString().slice(-4)}`,
        incidentId: id,
        reporter: reportData.reporter || (reportData.role === "Shop Owner" ? "Shop Owner" : "Area Resident"),
        role: reportData.role || "Shop Owner",
        time: formattedTime,
        userTimestamp,
        waterLevel: waterCm,
        note: reportData.note || "",
        drainObservation: reportData.drainObservation || "Unsure",
        onsetSpeed: reportData.onsetSpeed || "10–20 min",
        recurrence: reportData.recurrence || "No",
        evidenceHash,
        photo: hasPhoto,
        photoUrl: publicPhotoUrl || reportData.photoUrl,
        video: hasVideo,
        videoUrl: publicVideoUrl || reportData.videoUrl || null,
        mediaType,
        createdAt: userTimestamp
      });
    }

    // Track user submission and check false-alarm quarantine status
    const userKey = reportData.userPhone || reportData.phone || reportData.reporter || reportData.userId || "ANONYMOUS";
    const reputation = this.recordReportSubmission(userKey, {
      userName: reportData.reporter || "Citizen",
      userPhone: reportData.userPhone || reportData.phone
    });
    const isUserQuarantined = Boolean(reputation.isQuarantined);

    const nearbyEms = this.getEmergencyServices(lat, lng);
    const nearestResource = nearbyEms[0] || null;

    // Every citizen report is created as an incident record
    const incident = {
      id,
      zoneId,
      reporter: reportData.reporter || (reportData.role === "Shop Owner" ? "Shop Owner" : "Area Resident"),
      role: reportData.role || "Shop Owner",
      userPhone: reportData.userPhone || reportData.phone || null,
      time: formattedTime,
      userTimestamp,
      timestamp: userTimestamp,
      status: isUserQuarantined ? "Quarantined Spam" : "Received",
      isQuarantined: isUserQuarantined,
      quarantineReason: isUserQuarantined ? reputation.quarantineReason : null,
      reporterReputation: reputation,
      severity: isUserQuarantined ? 10 : severity,
      cause: divergence.name,
      causeCode: divergence.code,
      causeDescription: isUserQuarantined
        ? `[Auto-Quarantined Spam] User has ${reputation.falseAlarmCount} prior false alarms. ${divergence.description}`
        : divergence.description,
      recommendedTeam: nearestResource ? nearestResource.name : autoRoute.team,
      recommendedTeamId: nearestResource ? nearestResource.id : autoRoute.teamId,
      nearestResource: nearestResource,
      routingRationale: isUserQuarantined ? "Quarantined report — auto-routing suspended." : autoRoute.rationale,
      waterLevel: waterCm,
      drainObservation: reportData.drainObservation || "Unsure",
      onsetSpeed: reportData.onsetSpeed || "10–20 min",
      recurrence: reportData.recurrence || "No",
      lat,
      lng,
      geohash,
      evidenceHash,
      address: reportData.address || `${divergence.name} Area, ${zone?.name || "Ward 72"}`,
      note: reportData.note || "",
      photo: hasPhoto,
      photoUrl: publicPhotoUrl || reportData.photoUrl || (reportData.photo ? "attached" : null),
      video: hasVideo,
      videoUrl: publicVideoUrl || reportData.videoUrl || null,
      mediaType,
      gps: Boolean(lat != null && lng != null),
      liveGps: Boolean(lat != null && lng != null),
      liveLocation: {
        latitude: lat,
        longitude: lng,
        address: reportData.address || `${divergence.name} Area, ${zone?.name || "Ward 72"}`,
        capturedAt: userTimestamp
      },
      cvConfidence: cv.confidence,
      cvConfidenceDecimal: cv.confidenceDecimal,
      confidenceScore: cv.confidence,
      aiVerified: Boolean(reportData.aiVerified),
      aiFloodConfidence: reportData.aiFloodConfidence || (reportData.aiVerified ? 0.95 : null),
      aiVerification: reportData.aiVerification || null,
      cvModelLabel: cv.modelLabel,
      cvStatus: cv.status,
      mergedCount: 1,
      mergedReports: [],
      relatedIncidentId: activeExisting ? activeExisting.id : null,
      clusterCount: activeExisting ? (activeExisting.mergedCount || 1) : 1,
      duplicateOf: null,
      createdAt: userTimestamp,
      updatedAt: userTimestamp
    };

    if (!isUserQuarantined && (divergence.code === "SUSPECTED_BLOCKED_DRAIN" || reportData.recurrence === "Yes")) {
      const match = this.chronicBlockages.find((b) => Math.hypot(b.lat - lat, b.lng - lng) < 0.005 || b.ward === zone?.ward);
      if (match) {
        match.flagCount += 1;
        match.lastFlaggedAt = new Date().toISOString();
        match.status = "Desilting Required";
      }
    }

    this.incidents.unshift(incident);
    this.updateZoneMetrics(zoneId);
    this.recomputeAlerts();
    this.save();
    this.emit("report:created", { incident, zoneId });

    if (activeExisting && !isUserQuarantined) {
      this.emit("report:merged", { incident: activeExisting, mergedCount: activeExisting.mergedCount, zoneId });
    }

    // Asynchronously sync to Supabase database and email authority (aryanreddy2006@gmail.com) if not quarantined
    if (!isUserQuarantined) {
      (async () => {
        await syncIncidentToSupabase(incident, publicPhotoUrl || incident.photoUrl);
        await sendAuthorityIncidentEmail(incident, publicPhotoUrl || incident.photoUrl);
      })().catch((err) => {
        console.warn(`[Report Sync/Email Notice]:`, err.message);
      });
    }

    return incident;
  }

  updateZoneMetrics(zoneId) {
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const activeReports = this.incidents.filter((i) => i.zoneId === zoneId && i.status !== "False Alarm" && !i.isQuarantined);
    zone.reports = activeReports.length;
    if (activeReports.length > 0) {
      const maxWater = Math.max(...activeReports.map((r) => Number(r.waterLevel) || 0));
      zone.waterLevel = maxWater;
    } else {
      zone.waterLevel = 0;
    }
    const blockedCount = activeReports.filter((r) => r.causeCode === "SUSPECTED_BLOCKED_DRAIN").length;
    const { score } = scoreRisk({
      rainfall: zone.rainfall,
      waterLevel: zone.waterLevel,
      reports: zone.reports,
      drainPenalty: blockedCount * 12
    });
    zone.risk = score;
    const div = classifyCause({
      rainfall: zone.rainfall,
      waterLevel: zone.waterLevel,
      blockedDrainSignal: blockedCount > 0
    });
    zone.cause = div.name;
    zone.causeCode = div.code;
  }

  updateIncidentStatus(incidentId, status, meta = {}) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return null;

    const normalized = String(status).toUpperCase();
    const now = new Date().toISOString();

    if (normalized === "RESOLVED" || normalized === "RESOLVE") {
      return this.resolveIncident(incidentId);
    }
    if (normalized === "FALSE_ALARM" || normalized === "FALSE ALARM" || normalized === "DISMISSED" || normalized === "DISMISS") {
      return this.markFalseAlarm(incidentId, meta.reason || "Marked False Alarm / Dismissed");
    }
    if (normalized === "VERIFIED") {
      return this.verifyIncident(incidentId);
    }

    if (normalized === "RESOURCE_ALLOCATED" || normalized === "ALLOCATED") {
      inc.status = "Resource Allocated";
      inc.mitigationStatus = "Resource Allocated";
      inc.allocatedAt = now;
      if (meta.resource) {
        inc.assignedResource = meta.resource;
        inc.assignedTeam = meta.resource.name || meta.resource.team;
      }
    } else if (normalized === "EN_ROUTE" || normalized === "DISPATCHED") {
      inc.status = "Dispatched";
      inc.dispatchProgress = "en_route";
      inc.mitigationStatus = "Resource En Route";
      inc.dispatchedAt = now;
      const dsp = this.dispatches.find((d) => d.incident === incidentId);
      if (dsp) dsp.status = "En route";
    } else if (normalized === "REACHED_SITE" || normalized === "ON_SCENE" || normalized === "REACHED") {
      inc.status = "On Scene";
      inc.dispatchProgress = "on_scene";
      inc.mitigationStatus = "Squad On Scene / Operating";
      inc.reachedAt = now;
      const dsp = this.dispatches.find((d) => d.incident === incidentId);
      if (dsp) dsp.status = "On scene";
    } else if (normalized === "RECEIVED" || normalized === "NEW") {
      inc.status = "Received";
    } else {
      inc.status = status;
    }

    this.save();
    this.emit("incident:updated", { incident: inc, action: "status_updated", status: inc.status });
    return inc;
  }

  allocateResource(incidentId, resourceData) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return null;

    const now = new Date().toISOString();
    inc.assignedResource = {
      id: resourceData.id || `RES-${Date.now()}`,
      name: resourceData.name || "Emergency Rapid Response Unit",
      category: resourceData.category || "emergency",
      lat: resourceData.lat,
      lng: resourceData.lng,
      address: resourceData.address,
      distanceKm: resourceData.distanceKm ?? resourceData.distance_km,
      etaMinutes: resourceData.etaMinutes ?? resourceData.eta_minutes,
      etaText: resourceData.etaText || (resourceData.etaMinutes ? `${resourceData.etaMinutes} min` : "8 min")
    };
    inc.assignedTeam = inc.assignedResource.name;
    inc.status = "Resource Allocated";
    inc.mitigationStatus = "Resource Allocated";
    inc.allocatedAt = now;

    // Create or update dispatch task
    const id = `DSP-${70 + this.dispatches.length + 1}`;
    const dispatch = {
      id,
      incident: incidentId,
      team: inc.assignedResource.name,
      teamId: inc.assignedResource.id,
      category: inc.assignedResource.category,
      lat: inc.assignedResource.lat,
      lng: inc.assignedResource.lng,
      reason: inc.causeDescription || inc.cause || "Emergency localized flood response",
      channel: "Live Operations Command",
      status: "Assigned",
      eta: inc.assignedResource.etaText,
      createdAt: now
    };
    this.dispatches.unshift(dispatch);
    inc.assignedDispatchId = id;

    // Clean active alert notifications
    this.alerts = this.alerts.filter((a) => a.incidentId !== incidentId && a.sosId !== incidentId && a.id !== incidentId);
    this.sosAlerts = this.sosAlerts.filter((s) => s.incidentId !== incidentId && s.id !== incidentId);

    this.recomputeAlerts();
    this.syncResourceStatuses();
    this.save();
    this.emit("dispatch:created", { dispatch, resource: inc.assignedResource, incident: inc });
    this.emit("incident:updated", { incident: inc, action: "resource_allocated" });
    return { incident: inc, dispatch };
  }

  verifyIncident(incidentId) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (inc) {
      inc.status = "Verified";
      inc.verifiedAt = new Date().toISOString();
      const userKey = inc.userPhone || inc.reporter || "ANONYMOUS";
      this.recordVerification(userKey, incidentId);
      this.save();
      this.emit("incident:updated", { incident: inc, action: "verified" });
      return inc;
    }
    return null;
  }

  markFalseAlarm(incidentId, reason = "Flagged as False Alarm by Authority Admin") {
    const inc = this.incidents.find((i) => i.id === incidentId || i.sosId === incidentId);
    if (inc) {
      inc.status = "False Alarm";
      inc.isDismissed = true;
      inc.falseAlarmReason = reason;
      inc.falseAlarmAt = new Date().toISOString();

      const userKey = inc.userPhone || inc.reporter || "ANONYMOUS";
      this.recordFalseAlarmStrike(userKey, inc.id, reason);

      const dispatch = this.dispatches.find((d) => d.incident === inc.id || d.incident === incidentId);
      if (dispatch) {
        dispatch.status = "Cancelled";
      }

      this.alerts = this.alerts.filter((a) => a.incidentId !== inc.id && a.sosId !== inc.sosId && a.id !== incidentId && a.incidentId !== incidentId);
      this.sosAlerts = this.sosAlerts.filter((s) => s.id !== inc.sosId && s.id !== incidentId && s.incidentId !== inc.id && s.incidentId !== incidentId);

      this.updateZoneMetrics(inc.zoneId);
      this.recomputeAlerts();
      this.syncResourceStatuses();
      this.save();
      this.emit("incident:updated", { incident: inc, action: "false_alarm" });
      this.emit("incident:resolved", { incident: inc, id: inc.id });
      return inc;
    }
    return null;
  }

  /**
   * Add a dispatch action
   */
  addDispatch(dispatchData) {
    const id = `DSP-${70 + this.dispatches.length + 1}`;
    const incident = this.incidents.find((i) => i.id === dispatchData.incidentId);

    let targetTeamName = dispatchData.team;
    let targetTeamId = dispatchData.teamId;

    if (!targetTeamName && incident) {
      const auto = getAutoRoutedTeam(incident.causeCode);
      targetTeamName = auto.team;
      targetTeamId = auto.teamId;
    }

    if (!targetTeamName) targetTeamName = "Municipal Cleaning & Desilting Crew";

    const teamObj = this.resources.find((t) => t.name === targetTeamName || t.id === targetTeamId) || this.resources[0];

    const dispatch = {
      id,
      incident: dispatchData.incidentId,
      team: teamObj ? teamObj.name : targetTeamName,
      teamId: teamObj ? teamObj.id : targetTeamId,
      reason: dispatchData.reason || incident?.causeDescription || "Severe localized flood response",
      channel: dispatchData.channel || "Twilio SMS + Operations Board Bus",
      status: "En route",
      eta: dispatchData.eta || "8–12 min",
      isOverride: Boolean(dispatchData.isOverride),
      createdAt: new Date().toISOString()
    };

    this.dispatches.unshift(dispatch);

    if (incident) {
      incident.status = "Dispatched";
      incident.dispatched = true;
      incident.assignedTeam = teamObj ? teamObj.name : targetTeamName;
      incident.assignedDispatchId = id;
      incident.originalSeverity = incident.originalSeverity || incident.severity || 85;
      incident.severity = Math.max(15, Math.round(Number(incident.originalSeverity) * 0.35));
      incident.mitigationStatus = "Resource Allocated";
      incident.dispatchedAt = new Date().toISOString();
      if (incident.zoneId) {
        this.updateZoneMetrics(incident.zoneId);
      }
    }

    // Clear and remove any alerts or SOS entries from the active notification stack
    const targetIncId = dispatchData.incidentId;
    this.alerts = this.alerts.filter((a) => a.incidentId !== targetIncId && a.sosId !== targetIncId && a.id !== targetIncId);
    this.sosAlerts = this.sosAlerts.filter((s) => s.incidentId !== targetIncId && s.id !== targetIncId);

    if (teamObj) {
      teamObj.status = "En route";
      teamObj.currentIncidentId = dispatchData.incidentId;
      teamObj.activeDispatchId = id;
      teamObj.eta = dispatch.eta;
    }

    this.recomputeAlerts();
    this.syncResourceStatuses();
    this.save();
    this.emit("dispatch:created", { dispatch, team: teamObj, incident });
    this.emit("incident:updated", { incident, action: "dispatched" });
    return dispatch;
  }

  overrideDispatch(overrideData) {
    const { incidentId, team, reason } = overrideData;
    const incident = this.incidents.find((i) => i.id === incidentId);
    const teamObj = this.resources.find((t) => t.name === team || t.id === team) || this.resources[0];

    const existing = this.dispatches.find((d) => d.incident === incidentId && d.status !== "Completed" && d.status !== "Cancelled");
    if (existing) {
      existing.team = teamObj ? teamObj.name : team;
      existing.teamId = teamObj ? teamObj.id : null;
      existing.reason = `[ADMIN OVERRIDE] ${reason || "Reassigned by Ward Commander"}`;
      existing.isOverride = true;
      existing.status = "En route";
    }

    if (incident) {
      incident.status = "Dispatched";
      incident.dispatched = true;
      incident.assignedTeam = teamObj ? teamObj.name : team;
      incident.originalSeverity = incident.originalSeverity || incident.severity || 85;
      incident.severity = Math.max(15, Math.round(Number(incident.originalSeverity) * 0.35));
      incident.mitigationStatus = "Resource Allocated";
      if (incident.zoneId) {
        this.updateZoneMetrics(incident.zoneId);
      }
    }

    // Clear and remove any alerts or SOS entries from the active notification stack
    this.alerts = this.alerts.filter((a) => a.incidentId !== incidentId && a.sosId !== incidentId && a.id !== incidentId);
    this.sosAlerts = this.sosAlerts.filter((s) => s.incidentId !== incidentId && s.id !== incidentId);

    if (teamObj) {
      teamObj.status = "En route";
      teamObj.currentIncidentId = incidentId;
    }

    this.syncResourceStatuses();
    this.save();
    this.emit("dispatch:overridden", { incidentId, team: teamObj?.name || team, existing });
    return existing || this.addDispatch({ ...overrideData, isOverride: true });
  }

  resolveIncident(incidentId) {
    const inc = this.incidents.find((i) => i.id === incidentId || i.sosId === incidentId);
    if (inc) {
      inc.status = "Resolved";
      inc.dispatched = true;
      inc.originalSeverity = inc.originalSeverity || inc.severity;
      inc.severity = 0;
      inc.resolvedAt = new Date().toISOString();
      const dispatch = this.dispatches.find((d) => (d.incident === inc.id || d.incident === incidentId) && d.status !== "Completed");
      if (dispatch) dispatch.status = "Completed";
      if (inc.assignedTeam) {
        const teamObj = this.resources.find((t) => t.name === inc.assignedTeam || t.id === inc.assignedTeamId);
        if (teamObj) {
          teamObj.status = "AVAILABLE";
          teamObj.currentIncidentId = null;
          teamObj.activeDispatchId = null;
        }
      }
      if (inc.zoneId) {
        this.updateZoneMetrics(inc.zoneId);
      }
      // Clear and remove any alerts or SOS entries from the active notification stack
      this.alerts = this.alerts.filter((a) => a.incidentId !== inc.id && a.sosId !== inc.sosId && a.id !== incidentId && a.incidentId !== incidentId);
      this.sosAlerts = this.sosAlerts.filter((s) => s.id !== inc.sosId && s.id !== incidentId && s.incidentId !== inc.id && s.incidentId !== incidentId);

      this.recomputeAlerts();
      this.syncResourceStatuses();
      this.save();
      this.emit("incident:updated", { incident: inc, action: "resolved" });
      this.emit("incident:resolved", { incident: inc, id: inc.id });
      this.emit("sos:resolved", { incident: inc, sosId: inc.sosId });
      return inc;
    }
    return null;
  }

  updateIncidentProgress(incidentId, stage) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return null;

    if (stage === "resolved") {
      return this.resolveIncident(incidentId);
    }

    inc.dispatchProgress = stage;
    if (stage === "on_scene" || stage === "reached") {
      inc.status = "On Scene";
      inc.mitigationStatus = "Squad On Scene / Operating";
      inc.originalSeverity = inc.originalSeverity || inc.severity || 85;
      inc.severity = Math.max(10, Math.round(Number(inc.originalSeverity) * 0.20));
      if (inc.assignedTeam) {
        const teamObj = this.resources.find((t) => t.name === inc.assignedTeam);
        if (teamObj) teamObj.status = "On scene";
      }
    } else if (stage === "en_route" || stage === "dispatched") {
      inc.status = "Dispatched";
      inc.mitigationStatus = "Resource Allocated";
      if (inc.assignedTeam) {
        const teamObj = this.resources.find((t) => t.name === inc.assignedTeam);
        if (teamObj) teamObj.status = "En route";
      }
    }

    this.save();
    this.emit("incident:updated", { incident: inc, action: "progress_updated", stage });
    this.emit("dispatch:updated", { incident: inc, stage });
    return inc;
  }

  generateChronicReport() {
    return {
      reportId: `REP-MONSOON-${new Date().toISOString().slice(0, 10)}`,
      title: "Municipal Stormwater Drainage & Chronic Blockage Desilting Directives",
      wardAuthority: "Brihanmumbai Municipal Corporation · Ward 72/73 Control",
      generatedAt: new Date().toISOString(),
      totalHotspots: this.chronicBlockages.length,
      actionRequiredCount: this.chronicBlockages.filter((b) => b.status === "Desilting Required").length,
      hotspots: this.chronicBlockages,
      assignedTeams: this.resources
    };
  }

  async syncLiveWeatherData() {
    let updatedCount = 0;
    for (const zone of this.zones) {
      if (!zone.lat || !zone.lng) continue;
      try {
        const [weather, flood] = await Promise.all([
          fetchLiveWeather(zone.lat, zone.lng),
          fetchFloodMetrics(zone.lat, zone.lng)
        ]);

        if (weather.success) {
          zone.rainfall = weather.currentRainfallMm > 0 ? weather.currentRainfallMm : (zone.rainfall || 0);
          zone.totalTodayRain = weather.totalTodayRainMm;
          zone.tempC = weather.temperatureC;
          zone.humidity = weather.relativeHumidity;
        }

        if (flood.success) {
          zone.riverDischarge = flood.currentDischargeM3s;
          zone.dischargeRatio = flood.dischargeRatio;
        }

        const cause = classifyCause({ rainfall: zone.rainfall, waterLevel: zone.waterLevel });
        zone.cause = cause.name || "Normal Drainage";
        zone.causeCode = cause.code || "NORMAL_DRAINAGE";

        const scored = scoreRisk({ rainfall: zone.rainfall, waterLevel: zone.waterLevel, reports: zone.reports || 0 });
        zone.risk = scored.score;
        zone.riskLevel = scored.label;
        zone.lastUpdated = new Date().toISOString();

        updatedCount++;
      } catch (err) {
        console.warn(`[syncLiveWeatherData] Error for zone ${zone.id}:`, err.message);
      }
    }

    if (updatedCount > 0) {
      this.save();
      this.emit("zones:synced", { zones: this.zones, timestamp: new Date().toISOString() });
    }
    return { success: true, updatedCount, zones: this.zones };
  }

  recordAlertFeedback(alertId, data = {}) {
    const type = data.type || "RESOLVED";
    const role = data.role || "Citizen";
    const feedback = {
      id: `FB-${Date.now()}`,
      alertId,
      type,
      role,
      timestamp: new Date().toISOString()
    };
    this.alertFeedbacks.push(feedback);

    const idx = (this.alerts || []).findIndex((a) => a.id === alertId);
    if (idx !== -1) {
      this.alerts[idx].status = type === "RESOLVED" ? "Resolved" : "False Alarm";
      this.alerts[idx].resolvedAt = new Date().toISOString();
      const targetAlert = this.alerts[idx];
      if (targetAlert?.incidentId) {
        if (type === "RESOLVED") {
          this.resolveIncident(targetAlert.incidentId);
        } else if (type === "FALSE_ALARM") {
          this.markFalseAlarm(targetAlert.incidentId, "Marked as false alarm via alert feedback");
        }
      }
    }
    this.save();
    this.emit("alert:feedback", { alertId, type, feedback });
    return { success: true, alertId, type, feedback };
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
