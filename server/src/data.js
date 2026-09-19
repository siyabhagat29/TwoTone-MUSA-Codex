export const zones = [
  { id: "Z-01", name: "Station Road", ward: "Ward 72", lat: 19.132, lng: 72.848, risk: 87, cause: "Blocked drain", waterLevel: 42, rainfall: 54, reports: 12, trend: "rising" },
  { id: "Z-02", name: "Market Lane", ward: "Ward 72", lat: 19.129, lng: 72.852, risk: 68, cause: "Rainfall overload", waterLevel: 26, rainfall: 71, reports: 8, trend: "rising" },
  { id: "Z-03", name: "Temple Street", ward: "Ward 73", lat: 19.125, lng: 72.844, risk: 44, cause: "Mixed", waterLevel: 16, rainfall: 48, reports: 5, trend: "stable" },
  { id: "Z-04", name: "Lake View Road", ward: "Ward 73", lat: 19.121, lng: 72.855, risk: 23, cause: "Normal drainage", waterLevel: 8, rainfall: 31, reports: 2, trend: "falling" }
];

export const incidents = [
  { id: "INC-1042", zoneId: "Z-01", reporter: "Aarav Mehta", role: "Vendor", time: "12:16", status: "Escalated", severity: 92, cause: "Blocked drain", waterLevel: 42, photo: true, gps: true, duplicateOf: null },
  { id: "INC-1041", zoneId: "Z-01", reporter: "Neha Shah", role: "Resident", time: "12:12", status: "Verified", severity: 84, cause: "Blocked drain", waterLevel: 38, photo: true, gps: true, duplicateOf: "INC-1042" },
  { id: "INC-1040", zoneId: "Z-02", reporter: "Rohan Patil", role: "Resident", time: "12:08", status: "Dispatched", severity: 72, cause: "Rainfall overload", waterLevel: 26, photo: true, gps: true, duplicateOf: null },
  { id: "INC-1039", zoneId: "Z-03", reporter: "Priya Nair", role: "Resident", time: "11:57", status: "Monitoring", severity: 49, cause: "Mixed", waterLevel: 16, photo: true, gps: true, duplicateOf: null }
];

export const alerts = [
  { id: "ALT-220", zoneId: "Z-01", level: "RED", title: "Severe waterlogging emerging", message: "Station Road shows abnormal waterlogging with blocked-drain indicators.", eta: "12 min", channels: ["App", "SMS", "WhatsApp", "PagerDuty"] },
  { id: "ALT-219", zoneId: "Z-02", level: "ORANGE", title: "Flood risk increasing", message: "Heavy rainfall and rising local reports indicate increasing risk.", eta: "18 min", channels: ["App", "SMS"] },
  { id: "ALT-218", zoneId: "Z-03", level: "YELLOW", title: "Monitor local water level", message: "Moderate risk; continue collecting ground reports.", eta: "—", channels: ["App"] }
];

export const dataSources = [
  { name: "Open-Meteo", kind: "Rainfall / weather", status: "Live", latency: "1.8s" },
  { name: "SACHET / NDMA", kind: "Official alert cross-check", status: "Connected", latency: "3.2s" },
  { name: "Blitzortung", kind: "Lightning signal", status: "Live", latency: "2.4s" },
  { name: "OSRM / OpenStreetMap / GIS", kind: "Routing + drainage context", status: "Connected", latency: "2.1s" },
  { name: "Computer Vision", kind: "Waterlogging verification", status: "Ready", latency: "0.9s" }
];

export const dispatches = [
  { id: "DSP-77", incident: "INC-1042", team: "Municipal Drainage Crew", reason: "Potential blocked drain", channel: "Twilio + PagerDuty", status: "En route", eta: "8 min" },
  { id: "DSP-76", incident: "INC-1040", team: "Pumping / Drainage Team", reason: "Rainfall overload", channel: "Twilio", status: "Assigned", eta: "14 min" }
];
