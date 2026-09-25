import React, { useEffect, useState, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Activity, AlertTriangle, Bell, BrainCircuit, ChevronRight, CloudRain,
  Database, FileText, Gauge, Home, Layers3, Map as MapIcon, Menu, Radio, Route as RouteIcon,
  Settings, ShieldCheck, Siren, Users, Wrench, X, Zap, Send, RefreshCw, CheckCircle2,
  Droplets, ShieldAlert, Sparkles, Truck, Sliders, ChevronDown, ChevronUp, Download, Eye, AlertCircle,
  Search, MapPin, Compass, Loader2, WifiOff, Navigation, AlertOctagon, Video,
  Play, Check, Copy, RotateCcw, Info, ArrowLeft, Clock, Award, Shield,
  Trash2, ExternalLink, Filter, Building2, Flame, HeartPulse, Utensils, Droplet, Tent
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { getAuthorityResourceCategory, getAuthorityResourceIcon } from "./resourceIconUtils.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

async function apiFetch(path, options = {}) {
  const r = await fetch(`${API}${path}`, options);
  if (!r.ok) {
    const errBody = await r.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${r.status}`);
  }
  return await r.json();
}

// Haversine Distance Calculation (in kilometers) between two coordinates
export function calcDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) * Math.cos((nLat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyA5U1kvO3XeQxEGkQfuNyiMBvcik27VvKQ";

const MAP_LAYERS = {
  "google-roadmap": {
    name: "Google Maps (Roadmap)",
    url: `https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`,
    options: { subdomains: ["0", "1", "2", "3"], maxZoom: 20, attribution: '&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>' }
  },
  "google-hybrid": {
    name: "Google Satellite / Hybrid",
    url: `https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`,
    options: { subdomains: ["0", "1", "2", "3"], maxZoom: 20, attribution: '&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>' }
  },
  "google-terrain": {
    name: "Google Terrain",
    url: `https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`,
    options: { subdomains: ["0", "1", "2", "3"], maxZoom: 20, attribution: '&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>' }
  },
  "google-traffic": {
    name: "Google Live Traffic",
    url: `https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`,
    options: { subdomains: ["0", "1", "2", "3"], maxZoom: 20, attribution: '&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>' }
  },
  "osm": {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors' }
  }
};

// Web Audio synthesizer for immediate emergency SOS chime alert (cross-browser, zero external files)
function playSosEmergencyChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now + 0.12);
    osc.frequency.setValueAtTime(880, now + 0.24);
    osc.frequency.setValueAtTime(1174.66, now + 0.36);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);
  } catch (_) {}
}

// Module-level icon cache to avoid recreating DOM elements and L.divIcon instances
const LEAFLET_ICON_CACHE = new Map();

function getCachedDivIcon(key, options) {
  if (LEAFLET_ICON_CACHE.has(key)) {
    return LEAFLET_ICON_CACHE.get(key);
  }
  const icon = L.divIcon(options);
  LEAFLET_ICON_CACHE.set(key, icon);
  return icon;
}



function getIncidentPopupHtml(inc) {
  const statusUpper = String(inc.status || "").toUpperCase();
  const isResolved = statusUpper === "RESOLVED" || inc.status === "Resolved";
  const isFalseAlarm = statusUpper === "FALSE_ALARM" || inc.status === "False Alarm";
  const isReached = statusUpper === "ON SCENE" || statusUpper === "ON_SCENE" || statusUpper === "REACHED_SITE" || inc.dispatchProgress === "on_scene";
  const isEnRoute = statusUpper === "DISPATCHED" || statusUpper === "EN_ROUTE" || inc.dispatchProgress === "en_route";
  const isAllocated = statusUpper === "RESOURCE ALLOCATED" || statusUpper === "RESOURCE_ALLOCATED" || statusUpper === "ALLOCATED" || Boolean(inc.assignedResource);
  const isVerified = statusUpper === "VERIFIED";
  const isSos = Boolean(inc.isSos || inc.type === "SOS" || inc.causeCode === "SOS_EMERGENCY");

  const statusBadgeClass = isResolved
    ? "background:#dcfce7;color:#166534;border:1px solid #86efac;"
    : isFalseAlarm
    ? "background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;"
    : isReached
    ? "background:#ecfdf5;color:#047857;border:1px solid #6ee7b7;"
    : isEnRoute
    ? "background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd;"
    : isAllocated
    ? "background:#f0f9ff;color:#0369a1;border:1px solid #7dd3fc;"
    : isVerified
    ? "background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;"
    : "background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5;";

  const repCount = inc.reporter_count || (inc.reports && inc.reports.length) || 1;

  return `
    <div style="min-width: 220px; font-family: sans-serif;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <b style="font-size:13px; color:#0f172a;">${inc.id}</b>
        <span style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; ${statusBadgeClass}">
          ${inc.status || (isSos ? "ACTIVE SOS" : "RECEIVED")}
        </span>
      </div>
      ${isSos ? `<div style="background:#ef4444;color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:800;margin-bottom:6px;display:inline-block;">🚨 ACTIVE SOS · ${repCount} ${repCount === 1 ? 'Person Reported' : 'Reports within 500m'}</div>` : ''}
      <div style="font-size:12px; font-weight:700; color:#1e293b; margin-bottom:2px;">
        ${inc.reporter || "Citizen"} <span style="font-size:10px; font-weight:normal; color:#64748b;">(${inc.role || "Citizen"})</span>
      </div>
      <div style="font-size:11px; color:#475569; margin:2px 0;">📍 ${inc.address || "Live Area"}</div>
      <div style="font-size:10px; color:#64748b; margin-bottom:4px;">
        Cause: <b>${inc.cause || "Severe Flooding"}</b> · Severity: <b>${inc.severity || (isSos ? 95 : 50)}/100</b>
      </div>
      ${isSos && inc.nearestResource ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:4px 6px;margin:4px 0 6px 0;font-size:10px;color:#1e40af;"><b>⚡ Nearest Unit:</b> ${inc.nearestResource.name} (${inc.nearestResource.distanceKm != null ? `${inc.nearestResource.distanceKm} km` : "nearby"})</div>` : inc.assignedTeam ? `<div style="font-size:10px; color:#0284c7; font-weight:700; margin-bottom:6px;">🚒 Assigned: ${inc.assignedTeam}</div>` : ''}
      <div style="display:flex; flex-direction:column; gap:5px; margin-top:8px;">
        <button
          onclick="window.__openIncidentDetail('${inc.id}')"
          style="background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:11px; font-weight:700; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 2px 6px rgba(37,99,235,0.35);"
        >
          ⚡ Manage Incident & Allocate Resources &rarr;
        </button>
        <div style="display:flex; gap:4px;">
          <button
            onclick="window.__resolveIncident('${inc.id}')"
            style="background:#16a34a; color:#fff; border:none; border-radius:6px; padding:5px 8px; font-size:10px; font-weight:700; cursor:pointer; flex:1; display:flex; align-items:center; justify-content:center; gap:3px; box-shadow:0 2px 4px rgba(22,163,74,0.25);"
            title="Mark incident as resolved and remove from active map"
          >
            ✓ Mark Resolved
          </button>
          <button
            onclick="window.__falseAlarmIncident('${inc.id}')"
            style="background:#475569; color:#fff; border:none; border-radius:6px; padding:5px 8px; font-size:10px; font-weight:700; cursor:pointer; flex:1; display:flex; align-items:center; justify-content:center; gap:3px;"
            title="Mark as false alarm and dismiss"
          >
            ✕ False Alarm
          </button>
        </div>
        <a
          href="https://www.google.com/maps/dir/?api=1&destination=${inc.lat},${inc.lng}&travelmode=driving"
          target="_blank"
          rel="noreferrer"
          style="background:#f8fafc; color:#334155; border:1px solid #cbd5e1; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600; text-decoration:none; text-align:center;"
        >
          Track on Google Maps ↗
        </a>
      </div>
    </div>
  `;
}

function getShelterPopupHtml(sh, isSelected, isVerified) {
  return `
    <div style="min-width:220px;">
      <span style="background:${isVerified ? "#dcfce7" : "#e0f2fe"};color:${isVerified ? "#15803d" : "#0369a1"};font-size:9px;font-weight:bold;padding:2px 6px;border-radius:4px;display:inline-block;margin-bottom:4px;">
        ${isVerified ? "✓ VERIFIED SHELTER" : `DISCOVERED (${sh.provider?.toUpperCase() || "OSM"})`}
      </span>
      <div style="font-weight:bold;font-size:13px;color:#0f172a;">${sh.name}</div>
      <div style="font-size:10px;color:#64748b;margin:2px 0;">🏷️ ${sh.type || sh.shelterType || "Relief Center"}</div>
      ${sh.agency ? `<div style="font-size:10px;color:#2563eb;font-weight:600;">🤝 ${sh.agency}</div>` : ""}
      <div style="font-size:10px;color:#475569;margin:3px 0;">📍 ${sh.address || ""}</div>
      <div style="font-size:10px;background:#f8fafc;padding:4px 6px;border-radius:4px;margin:4px 0;">
        <b>${sh.distance_km ?? sh.distanceKm ?? 1.2} km</b> away · <b>${sh.eta_minutes ?? sh.etaMin ?? 5} min ETA</b>
      </div>
      ${sh.capacity ? `<div style="font-size:10px;color:#16a34a;font-weight:600;">Capacity: ${sh.capacity}</div>` : ""}
      ${sh.phone ? `<div style="font-size:10px;color:#334155;margin-top:2px;">📞 ${sh.phone}</div>` : ""}
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
        <button
          onclick="window.__selectShelterRoute('${sh.id}')"
          style="background:linear-gradient(135deg, #2563eb, #1d4ed8);color:#fff;border:none;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;box-shadow:0 2px 6px rgba(37,99,235,0.3);"
        >
          🗺️ Show Safest Evacuation Route
        </button>
        ${sh.maps_url || (sh.lat && sh.lng) ? `
          <a
            href="${sh.maps_url || `https://www.google.com/maps/dir/?api=1&destination=${sh.lat},${sh.lng}&travelmode=driving`}"
            target="_blank"
            rel="noreferrer"
            style="font-size:10px;color:#2563eb;text-align:center;text-decoration:none;margin-top:4px;font-weight:600;"
          >
            External Google Maps &rarr;
          </a>
        ` : ""}
      </div>
    </div>
  `;
}

function getTeamPopupHtml(team, isEnRoute, isOnScene, catUpper) {
  const catInfo = getAuthorityResourceCategory(team);
  return `
    <div style="min-width: 220px; font-family: sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">
        <span class="map-badge ${isEnRoute ? "orange" : isOnScene ? "blue" : "green"}">${(team.status || "AVAILABLE").toUpperCase()}</span>
        ${team.eta ? `<span style="font-size:10px;font-weight:700;color:#f59e0b;">⏱️ ${team.eta}</span>` : ""}
      </div>
      <div style="font-size:13px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="font-size:16px;">${catInfo.icon}</span> <span>${team.name}</span>
      </div>
      <div style="font-size:11px;color:#64748b;margin:2px 0;">📍 ${team.base_location || team.address || team.station || "Facility"}</div>
      <div style="font-size:11px;margin:3px 0;color:#334155;">
        Category: <b style="color:${catInfo.color};">${catInfo.label}</b>
        ${team.quantity ? ` · Qty: <b>${team.quantity} ${team.unit || ""}</b>` : team.capacity ? ` · Cap: <b>${team.capacity}</b>` : ""}
      </div>
      ${team.agency ? `<div style="font-size:10px;color:#2563eb;font-weight:600;margin-top:2px;">🏛️ ${team.agency}</div>` : ""}
      ${team.currentIncidentId ? `<div style="font-size:10px;color:#2563eb;font-weight:700;margin-top:4px;">🎯 Assigned: ${team.currentIncidentId}</div>` : ""}
    </div>
  `;
}

function getZonePopupHtml(z, level, zoneIncidentsCount = 0) {
  const riskLevelText = z.risk >= 75 ? "🔴 CRITICAL RISK" : z.risk >= 45 ? "🟠 ELEVATED RISK" : "🟢 NORMAL";
  const riskColor = z.risk >= 75 ? "#dc2626" : z.risk >= 45 ? "#ea580c" : "#16a34a";
  return `
    <div style="min-width: 220px; font-family: sans-serif; padding: 2px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span class="map-badge ${level}">RISK SCORE: ${z.risk}/100</span>
        <span style="font-size:10px;font-weight:700;color:${riskColor};">${riskLevelText}</span>
      </div>
      <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:2px;">${z.name}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">📍 ${z.ward || "Civic Zone"} · ID: <b>${z.id || "Z-01"}</b></div>
      <div style="background:#f8fafc;padding:6px 8px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:8px;">
        <div style="font-size:11px;color:#334155;margin:2px 0;">🌧️ Rainfall: <b>${z.rainfall || 0} mm/hr</b></div>
        <div style="font-size:11px;color:#334155;margin:2px 0;">🌊 Water Depth: <b>${z.waterLevel ? `${z.waterLevel} cm` : "Normal"}</b></div>
        <div style="font-size:11px;color:#334155;margin:2px 0;">⚠️ Diagnosis: <b>${z.cause || "Normal Drainage"}</b></div>
        <div style="font-size:11px;color:#334155;margin:2px 0;">🚨 Active Incidents: <b style="color:${zoneIncidentsCount > 0 ? "#dc2626" : "#16a34a"};">${zoneIncidentsCount}</b></div>
      </div>
      <button
        onclick="window.__openZoneDetails('${z.id || z.name}')"
        style="width:100%;background:linear-gradient(135deg, #2563eb, #1d4ed8);color:#fff;border:none;padding:7px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 6px rgba(37,99,235,0.3);transition:all 0.2s ease;"
      >
        🗺️ Open Zone Details &rarr;
      </button>
    </div>
  `;
}

// Leaflet Map Component with Google Maps API tiles, Rainfall Radar Overlay, Drainage GIS Layer, Live Team Pins, and Safest Route Highlighting
function LeafletMap({
  zones = [],
  incidents = [],
  resources = [],
  shelters = [],
  selectedShelter = null,
  selectedZoneId = null,
  activeRoute = null,
  center = [19.132, 72.848],
  userLocation = [19.132, 72.848],
  userLocationName = "Andheri West Station Road Market",
  zoom = 14,
  height = "380px",
  onSelectShelter,
  onSelectZone,
  onNavigateZone,
  onClearRoute,
  onVerify,
  onResolve,
  onFalseAlarm,
  onNavigateIncident,
  showHistoricalIncidents = false
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const layersRef = useRef({
    zones: null,
    incidents: null,
    rainfall: null,
    drainage: null,
    teams: null,
    shelters: null,
    route: null,
    user: null
  });

  // Dedicated refs to maintain persistent objects and avoid recreating DOM elements/markers on state churn
  const userMarkerRef = useRef(null);
  const incidentMarkersRef = useRef(new Map()); // id -> { marker, hash }
  const teamMarkersRef = useRef(new Map()); // id -> { marker, line, hash }
  const shelterMarkersRef = useRef(new Map()); // id -> { marker, hash }
  const zoneMarkersRef = useRef(new Map()); // id -> { marker, hash }
  const rainCirclesRef = useRef(new Map()); // id -> { circle, hash }
  const drainPolylinesRef = useRef([]);
  const routeLinesRef = useRef({ casing: null, core: null, hash: null });

  const [mapStyle, setMapStyle] = useState("google-roadmap");
  const [showRainfall, setShowRainfall] = useState(true);
  const [showDrainage, setShowDrainage] = useState(true);
  const [showTeams, setShowTeams] = useState(true);
  const [showShelters, setShowShelters] = useState(true);

  // Global window hooks for popup interactive actions & navigation
  useEffect(() => {
    window.__selectShelterRoute = (shId) => {
      const sh = shelters.find((s) => s.id === shId);
      if (sh && onSelectShelter) {
        onSelectShelter(sh);
      }
    };
    window.__openIncidentDetail = (incId) => {
      if (onNavigateIncident) {
        onNavigateIncident(incId);
      }
    };
    window.__openZoneDetails = (zoneId) => {
      if (onNavigateZone) {
        onNavigateZone(zoneId);
      } else if (onSelectZone) {
        const target = String(zoneId).toLowerCase();
        const found = zones.find((z) => String(z.id || "").toLowerCase() === target || String(z.name || "").toLowerCase() === target);
        if (found) onSelectZone(found);
      }
    };
    window.__resolveIncident = async (incId) => {
      if (mapInstance.current) {
        mapInstance.current.closePopup();
      }
      if (typeof onResolve === "function") {
        onResolve(incId);
      } else {
        try {
          await apiFetch(`/incidents/${incId}/resolve`, { method: "POST" });
        } catch (err) {
          console.error("Resolve error:", err);
        }
      }
    };
    window.__falseAlarmIncident = async (incId) => {
      if (mapInstance.current) {
        mapInstance.current.closePopup();
      }
      if (typeof onFalseAlarm === "function") {
        onFalseAlarm(incId);
      } else {
        try {
          await apiFetch(`/incidents/${incId}/false-alarm`, { method: "POST" });
        } catch (err) {
          console.error("False alarm error:", err);
        }
      }
    };
    return () => {
      delete window.__selectShelterRoute;
      delete window.__openIncidentDetail;
      delete window.__resolveIncident;
      delete window.__falseAlarmIncident;
    };
  }, [shelters, onSelectShelter, onNavigateIncident, onResolve, onFalseAlarm]);

  // 1. Initialize Leaflet Map (Mounted once, persists across updates)
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: true
      });

      const initialCfg = MAP_LAYERS["google-roadmap"];
      tileLayerRef.current = L.tileLayer(initialCfg.url, initialCfg.options).addTo(map);

      layersRef.current.rainfall = L.layerGroup().addTo(map);
      layersRef.current.drainage = L.layerGroup().addTo(map);
      layersRef.current.zones = L.layerGroup().addTo(map);
      layersRef.current.incidents = L.layerGroup().addTo(map);
      layersRef.current.teams = L.layerGroup().addTo(map);
      layersRef.current.shelters = L.layerGroup().addTo(map);
      layersRef.current.route = L.layerGroup().addTo(map);
      layersRef.current.user = L.layerGroup().addTo(map);

      mapInstance.current = map;
    }

    return () => {
      // Clean up map instance only when component actually unmounts
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // 2. Update Base Tile Layer when mapStyle changes
  useEffect(() => {
    if (!mapInstance.current) return;
    const cfg = MAP_LAYERS[mapStyle] || MAP_LAYERS["google-roadmap"];
    if (tileLayerRef.current) {
      mapInstance.current.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(cfg.url, cfg.options).addTo(mapInstance.current);
    tileLayerRef.current.bringToBack();
  }, [mapStyle]);

  // 3. Auto-resize Leaflet canvas on container width changes
  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstance.current?.invalidateSize();
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  const prevCenterRef = useRef(null);
  const prevRouteRef = useRef(null);

  // 4. Animate pan/zoom ONLY when center coordinates meaningfully change (preserves user view during background sync)
  useEffect(() => {
    if (!mapInstance.current || !center || center.length !== 2 || center[0] == null || center[1] == null || activeRoute) return;
    const prev = prevCenterRef.current;
    if (!prev || Math.abs(prev[0] - center[0]) > 0.0001 || Math.abs(prev[1] - center[1]) > 0.0001) {
      prevCenterRef.current = [center[0], center[1]];
      const currentZoom = mapInstance.current.getZoom();
      mapInstance.current.setView(center, currentZoom || zoom, { animate: true });
    }
  }, [center?.[0], center?.[1], activeRoute, zoom]);

  // 5. USER / SHOP LOCATION PIN LAYER (In-place update: does not destroy marker on GPS updates)
  useEffect(() => {
    const userLayer = layersRef.current.user;
    if (!userLayer) return;

    if (userLocation && userLocation.length === 2 && userLocation[0] && userLocation[1]) {
      const userIcon = getCachedDivIcon("user-location-marker", {
        className: "custom-user-marker",
        html: `<div style="background:#2563eb;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,0.3), 0 3px 10px rgba(0,0,0,0.4);" title="${userLocationName || "Your Active Location"}">🏪</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const popupHtml = `<b>🏪 Your Active Location</b><br/>${userLocationName || "Active Location"}<br/><small style="color:#64748b;">Coordinates: ${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}</small>`;

      if (!userMarkerRef.current) {
        const marker = L.marker(userLocation, { icon: userIcon, zIndexOffset: 900 });
        marker.bindPopup(popupHtml);
        marker.addTo(userLayer);
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setLatLng(userLocation);
        userMarkerRef.current.setPopupContent(popupHtml);
      }
    } else if (userMarkerRef.current) {
      userLayer.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, [userLocation?.[0], userLocation?.[1], userLocationName]);

  // 6. RAINFALL RADAR OVERLAY LAYER (In-place updates)
  useEffect(() => {
    const rainLayer = layersRef.current.rainfall;
    if (!rainLayer) return;

    if (!showRainfall) {
      rainLayer.clearLayers();
      rainCirclesRef.current.clear();
      return;
    }

    const currentZoneIds = new Set();
    zones.forEach((z) => {
      if (!z.lat || !z.lng) return;
      const zoneId = z.id || z.name;
      currentZoneIds.add(zoneId);

      const rainMm = z.rainfall || 0;
      const radius = Math.max(250, Math.min(650, 200 + rainMm * 20));
      const color = rainMm > 15 ? "#1d4ed8" : rainMm > 5 ? "#3b82f6" : "#60a5fa";
      const fillOpacity = Math.min(0.45, Math.max(0.15, rainMm * 0.04));
      const hash = `${z.lat}_${z.lng}_${rainMm}`;

      const existing = rainCirclesRef.current.get(zoneId);
      if (existing) {
        if (existing.hash !== hash) {
          existing.circle.setLatLng([z.lat, z.lng]);
          existing.circle.setRadius(radius);
          existing.circle.setStyle({ color, fillColor: color, fillOpacity });
          existing.circle.setTooltipContent(`🌧️ <b>${z.name} Rain Radar</b><br/>Live precipitation: <b>${rainMm} mm</b>`);
          existing.hash = hash;
        }
      } else {
        const circle = L.circle([z.lat, z.lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity,
          weight: 1.5,
          dashArray: "4, 6"
        });
        circle.bindTooltip(`🌧️ <b>${z.name} Rain Radar</b><br/>Live precipitation: <b>${rainMm} mm</b>`, { sticky: true });
        circle.addTo(rainLayer);
        rainCirclesRef.current.set(zoneId, { circle, hash });
      }
    });

    // Remove deleted zones
    for (const [id, item] of rainCirclesRef.current.entries()) {
      if (!currentZoneIds.has(id)) {
        rainLayer.removeLayer(item.circle);
        rainCirclesRef.current.delete(id);
      }
    }
  }, [zones, showRainfall]);

  // 7. DRAINAGE NETWORK GIS LAYER (Static / low-frequency update)
  useEffect(() => {
    const drainLayer = layersRef.current.drainage;
    if (!drainLayer) return;

    drainLayer.clearLayers();
    drainPolylinesRef.current = [];

    if (showDrainage) {
      const uL = userLocation && userLocation[0] ? userLocation : [19.132, 72.848];
      const drainageChannels = [
        [[uL[0] + 0.003, uL[1] - 0.006], [uL[0], uL[1]], [uL[0] - 0.003, uL[1] + 0.004]],
        [[uL[0] - 0.006, uL[1] - 0.007], [uL[0] - 0.007, uL[1] - 0.004], [uL[0] - 0.01, uL[1] + 0.003]]
      ];

      drainageChannels.forEach((coords) => {
        const line = L.polyline(coords, {
          color: "#0284c7",
          weight: 4,
          opacity: 0.8,
          dashArray: "8, 6"
        });
        line.bindTooltip("🌊 <b>Arterial Stormwater Channel</b><br/>Gravity flow outfall corridor", { sticky: true });
        line.addTo(drainLayer);
        drainPolylinesRef.current.push(line);
      });
    }
  }, [showDrainage, userLocation?.[0], userLocation?.[1]]);

  // 8. WARD RISK ZONE PINS & INTERACTIVE BOUNDARY POLYGONS LAYER
  useEffect(() => {
    const zoneLayer = layersRef.current.zones;
    if (!zoneLayer) return;

    const currentZoneIds = new Set();
    zones.forEach((z) => {
      if (!z.lat || !z.lng) return;
      const zoneId = z.id || z.name;
      currentZoneIds.add(zoneId);

      const level = z.risk >= 75 ? "red" : z.risk >= 45 ? "orange" : "green";
      const isSelected = selectedZoneId === zoneId || selectedZoneId === z.id;
      const hash = `${z.lat}_${z.lng}_${z.risk}_${level}_${z.rainfall || 0}_${z.cause || ""}_${isSelected ? "sel" : "norm"}`;

      const zoneIncidentsCount = incidents.filter((inc) => inc.zoneId === z.id || inc.zoneId === z.name).length;

      const existing = zoneMarkersRef.current.get(zoneId);
      if (existing) {
        if (existing.hash !== hash) {
          existing.marker.setLatLng([z.lat, z.lng]);
          const icon = getCachedDivIcon(`zone-${level}-${z.risk}-${isSelected ? "sel" : "norm"}`, {
            className: `custom-zone-marker-container ${isSelected ? "selected-zone" : ""}`,
            html: `
              <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                ${isSelected ? '<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(37,99,235,0.4);animation:pulse-ring 2s infinite ease-in-out;"></div>' : ""}
                <div class="custom-zone-marker ${level}" style="width:${isSelected ? "44px" : "38px"};height:${isSelected ? "44px" : "38px"};border:${isSelected ? "3px solid #2563eb" : "2px solid #fff"};box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-weight:900;">
                  ${z.risk}
                </div>
              </div>
            `,
            iconSize: [isSelected ? 44 : 38, isSelected ? 44 : 38],
            iconAnchor: [isSelected ? 22 : 19, isSelected ? 22 : 19]
          });
          existing.marker.setIcon(icon);
          existing.marker.setPopupContent(getZonePopupHtml(z, level, zoneIncidentsCount));
          
          if (existing.polygon) {
            existing.polygon.setLatLng([z.lat, z.lng]);
            existing.polygon.setStyle({
              color: isSelected ? "#2563eb" : (level === "red" ? "#ef4444" : level === "orange" ? "#f59e0b" : "#10b981"),
              fillColor: level === "red" ? "#ef4444" : level === "orange" ? "#f59e0b" : "#10b981",
              weight: isSelected ? 4 : 2,
              fillOpacity: isSelected ? 0.35 : 0.18
            });
          }
          existing.hash = hash;
        }
      } else {
        const icon = getCachedDivIcon(`zone-${level}-${z.risk}-${isSelected ? "sel" : "norm"}`, {
          className: `custom-zone-marker-container ${isSelected ? "selected-zone" : ""}`,
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              ${isSelected ? '<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(37,99,235,0.4);animation:pulse-ring 2s infinite ease-in-out;"></div>' : ""}
              <div class="custom-zone-marker ${level}" style="width:${isSelected ? "44px" : "38px"};height:${isSelected ? "44px" : "38px"};border:${isSelected ? "3px solid #2563eb" : "2px solid #fff"};box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-weight:900;">
                ${z.risk}
              </div>
            </div>
          `,
          iconSize: [isSelected ? 44 : 38, isSelected ? 44 : 38],
          iconAnchor: [isSelected ? 22 : 19, isSelected ? 22 : 19]
        });

        // 1. Interactive Zone Marker Pin
        const marker = L.marker([z.lat, z.lng], { icon, zIndexOffset: isSelected ? 800 : 200 });
        marker.bindPopup(getZonePopupHtml(z, level, zoneIncidentsCount));
        marker.on("click", () => {
          if (onSelectZone) onSelectZone(z);
        });
        marker.addTo(zoneLayer);

        // 2. Interactive Zone Perimeter Polygon / Circle
        const polyColor = level === "red" ? "#ef4444" : level === "orange" ? "#f59e0b" : "#10b981";
        const polygon = L.circle([z.lat, z.lng], {
          radius: 450,
          color: isSelected ? "#2563eb" : polyColor,
          fillColor: polyColor,
          fillOpacity: isSelected ? 0.35 : 0.18,
          weight: isSelected ? 4 : 2,
          dashArray: isSelected ? undefined : "6, 4",
          interactive: true
        });

        polygon.bindTooltip(`📍 <b>${z.name}</b> (${z.ward || "Zone"})<br/>Risk Score: <b>${z.risk}/100</b> · Click to view details`, { sticky: true });

        polygon.on("mouseover", () => {
          polygon.setStyle({ weight: 3.5, fillOpacity: 0.3 });
        });
        polygon.on("mouseout", () => {
          polygon.setStyle({
            weight: isSelected ? 4 : 2,
            fillOpacity: isSelected ? 0.35 : 0.18,
            color: isSelected ? "#2563eb" : polyColor
          });
        });
        polygon.on("click", () => {
          if (onSelectZone) onSelectZone(z);
          marker.openPopup();
        });
        polygon.addTo(zoneLayer);

        zoneMarkersRef.current.set(zoneId, { marker, polygon, hash });
      }
    });

    for (const [id, item] of zoneMarkersRef.current.entries()) {
      if (!currentZoneIds.has(id)) {
        zoneLayer.removeLayer(item.marker);
        if (item.polygon) zoneLayer.removeLayer(item.polygon);
        zoneMarkersRef.current.delete(id);
      }
    }
  }, [zones, selectedZoneId, incidents]);

  // 9. CITIZEN INCIDENT REPORTS & CRITICAL SOS EMERGENCY PINS (High Performance In-Place Diffing)
  useEffect(() => {
    const incLayer = layersRef.current.incidents;
    if (!incLayer) return;

    const currentActiveIds = new Set();

    incidents.forEach((inc) => {
      if (!inc.lat || !inc.lng) return;

      const statusUpper = String(inc.status || "").toUpperCase();
      const isResolved = statusUpper === "RESOLVED" || inc.status === "Resolved";
      const isFalseAlarm = statusUpper === "FALSE_ALARM" || inc.status === "False Alarm";
      const isQuarantined = inc.isQuarantined || inc.status === "Quarantined Spam";

      // Filter out resolved / false alarms from active map unless historical view is requested
      if ((isResolved || isFalseAlarm || isQuarantined) && !showHistoricalIncidents) {
        return;
      }

      currentActiveIds.add(inc.id);

      const isReached = statusUpper === "ON SCENE" || statusUpper === "ON_SCENE" || statusUpper === "REACHED_SITE" || inc.dispatchProgress === "on_scene";
      const isEnRoute = statusUpper === "DISPATCHED" || statusUpper === "EN_ROUTE" || inc.dispatchProgress === "en_route";
      const isAllocated = statusUpper === "RESOURCE ALLOCATED" || statusUpper === "RESOURCE_ALLOCATED" || statusUpper === "ALLOCATED" || Boolean(inc.assignedResource);
      const isVerified = statusUpper === "VERIFIED";
      const isSos = Boolean(inc.isSos || inc.type === "SOS" || inc.causeCode === "SOS_EMERGENCY");
      const isCritical = inc.waterLevel >= 40 || inc.severity >= 70;
      const repCount = inc.reporter_count || (inc.reports && inc.reports.length) || 1;

      // Icon determination with cache key
      let icon;
      let iconKey;
      if (isResolved) {
        iconKey = "inc-resolved";
        icon = getCachedDivIcon(iconKey, {
          className: "custom-resolved-marker",
          html: `<div style="background:#16a34a;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);" title="RESOLVED: ${inc.id}">✓</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      } else if (isFalseAlarm) {
        iconKey = "inc-falsealarm";
        icon = getCachedDivIcon(iconKey, {
          className: "custom-falsealarm-marker",
          html: `<div style="background:#64748b;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff;" title="FALSE ALARM: ${inc.id}">✕</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
      } else if (isReached) {
        iconKey = "inc-reached";
        icon = getCachedDivIcon(iconKey, {
          className: "custom-reached-marker",
          html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(16,185,129,0.4);animation:pulse-ring 2s infinite ease-in-out;"></div><div style="background:#10b981;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2.5px solid #fff;box-shadow:0 4px 12px rgba(16,185,129,0.4);" title="ON SCENE">📍</div></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
      } else if (isEnRoute) {
        iconKey = "inc-enroute";
        icon = getCachedDivIcon(iconKey, {
          className: "custom-enroute-marker",
          html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(59,130,246,0.4);animation:pulse-ring 1.8s infinite ease-in-out;"></div><div style="background:#2563eb;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2.5px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,0.4);" title="EN ROUTE">🚑</div></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
      } else if (isAllocated) {
        iconKey = "inc-allocated";
        icon = getCachedDivIcon(iconKey, {
          className: "custom-allocated-marker",
          html: `<div style="background:#0284c7;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 3px 10px rgba(2,132,199,0.4);" title="RESOURCE ALLOCATED">🔵</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
      } else if (isVerified) {
        iconKey = "inc-verified";
        icon = getCachedDivIcon(iconKey, {
          className: "custom-verified-marker",
          html: `<div style="background:#ea580c;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 3px 10px rgba(234,88,12,0.4);" title="VERIFIED">✓</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
      } else if (isSos) {
        iconKey = `inc-sos-${repCount}`;
        const countBadge = repCount > 1
          ? `<div style="position:absolute;top:-6px;right:-10px;background:#b91c1c;color:#fff;border-radius:12px;padding:2px 7px;font-size:10px;font-weight:900;border:1.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);white-space:nowrap;letter-spacing:0.3px;">${repCount} Reports</div>`
          : "";
        icon = getCachedDivIcon(iconKey, {
          className: "custom-sos-marker-container",
          html: `<div class="custom-sos-marker-wrapper" style="position:relative;"><div class="custom-sos-marker-pulse"></div><div class="custom-sos-marker" title="🚨 ACTIVE SOS DISTRESS (${repCount} reports)">🚨</div>${countBadge}</div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
      } else {
        const markerColor = isCritical ? "#ef4444" : "#f97316";
        iconKey = `inc-std-${isCritical ? "crit" : "warn"}`;
        icon = getCachedDivIcon(iconKey, {
          className: "custom-incident-marker-container",
          html: `<div class="custom-incident-marker" style="background:${markerColor};" title="Citizen Report">⚠️</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      }

      const zIndex = isSos ? 1000 : isEnRoute || isReached ? 800 : 200;
      const hash = `${inc.lat}_${inc.lng}_${iconKey}_${inc.status}_${repCount}_${inc.assignedTeam || ""}_${inc.nearestResource?.id || ""}`;

      const existing = incidentMarkersRef.current.get(inc.id);
      if (existing) {
        if (existing.hash !== hash) {
          existing.marker.setLatLng([inc.lat, inc.lng]);
          existing.marker.setIcon(icon);
          existing.marker.setZIndexOffset(zIndex);
          existing.marker.setPopupContent(getIncidentPopupHtml(inc));
          existing.hash = hash;
        }
      } else {
        const marker = L.marker([inc.lat, inc.lng], { icon, zIndexOffset: zIndex });
        marker.bindPopup(getIncidentPopupHtml(inc));
        marker.addTo(incLayer);
        incidentMarkersRef.current.set(inc.id, { marker, hash });
      }
    });

    // Remove resolved/cancelled/deleted incident markers immediately
    for (const [id, item] of incidentMarkersRef.current.entries()) {
      if (!currentActiveIds.has(id)) {
        incLayer.removeLayer(item.marker);
        incidentMarkersRef.current.delete(id);
      }
    }
  }, [incidents, showHistoricalIncidents]);

  // 10. LIVE RESOURCE TEAM PINS & ACTIVE DISPATCH TRACKING (In-Place Diffing)
  useEffect(() => {
    const teamLayer = layersRef.current.teams;
    if (!teamLayer) return;

    if (!showTeams) {
      teamLayer.clearLayers();
      teamMarkersRef.current.clear();
      return;
    }

    const currentTeamIds = new Set();

    resources.forEach((team) => {
      const tLat = team.latitude ?? team.lat;
      const tLng = team.longitude ?? team.lng;
      if (!tLat || !tLng) return;

      const teamId = team.id || team._id || team.name;
      currentTeamIds.add(teamId);

      const statusUpper = (team.status || "AVAILABLE").toUpperCase();
      const isEnRoute = statusUpper === "EN_ROUTE" || statusUpper === "EN ROUTE" || statusUpper === "DISPATCHED";
      const isOnScene = statusUpper === "ON SCENE" || statusUpper === "REACHED" || statusUpper === "DEPLOYED";
      const catInfo = getAuthorityResourceCategory(team);
      const emoji = team.emoji || team.icon || catInfo.icon;
      const catUpper = catInfo.category;

      const iconKey = `team-${isEnRoute ? "enroute" : isOnScene ? "onscene" : "avail"}-${emoji}`;
      const icon = getCachedDivIcon(iconKey, {
        className: "custom-team-marker-container",
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            ${isEnRoute ? '<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(245,158,11,0.4);animation:pulse-ring 2s infinite ease-in-out;"></div>' : isOnScene ? '<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(16,185,129,0.4);animation:pulse-ring 2s infinite ease-in-out;"></div>' : ''}
            <div class="custom-team-marker" style="background:${isEnRoute ? "#f59e0b" : isOnScene ? "#2563eb" : "#0f172a"};box-shadow:0 3px 10px rgba(0,0,0,0.35);font-size:16px;display:flex;align-items:center;justify-content:center;border:2px solid ${catInfo.color};" title="${team.name} (${catInfo.label})">
              ${emoji}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const hash = `${tLat}_${tLng}_${statusUpper}_${team.currentIncidentId || ""}_${team.eta || ""}`;
      const existing = teamMarkersRef.current.get(teamId);

      // Connecting dispatch polyline calculation
      let targetInc = null;
      if (team.currentIncidentId && isEnRoute) {
        targetInc = incidents.find((i) => i.id === team.currentIncidentId);
      }

      if (existing) {
        if (existing.hash !== hash) {
          existing.marker.setLatLng([tLat, tLng]);
          existing.marker.setIcon(icon);
          existing.marker.setPopupContent(getTeamPopupHtml(team, isEnRoute, isOnScene, catUpper));
          existing.hash = hash;
        }

        // Manage dispatch line
        if (targetInc && targetInc.lat && targetInc.lng) {
          const dist = calcDistanceKm(tLat, tLng, targetInc.lat, targetInc.lng);
          if (dist != null && dist < 12) {
            if (existing.line) {
              existing.line.setLatLngs([[tLat, tLng], [targetInc.lat, targetInc.lng]]);
              existing.line.setStyle({ color: isOnScene ? "#10b981" : "#f59e0b", dashArray: isOnScene ? undefined : "6, 6" });
            } else {
              const line = L.polyline([[tLat, tLng], [targetInc.lat, targetInc.lng]], {
                color: isOnScene ? "#10b981" : "#f59e0b",
                weight: 3,
                opacity: 0.85,
                dashArray: isOnScene ? undefined : "6, 6"
              });
              line.bindTooltip(`🚒 <b>${team.name}</b> &rarr; <b>${targetInc.id}</b> (${isOnScene ? "Reached Site" : `En Route · ETA ~${team.eta || "5 min"}`})`, { sticky: true });
              line.addTo(teamLayer);
              existing.line = line;
            }
          } else if (existing.line) {
            teamLayer.removeLayer(existing.line);
            existing.line = null;
          }
        } else if (existing.line) {
          teamLayer.removeLayer(existing.line);
          existing.line = null;
        }
      } else {
        const marker = L.marker([tLat, tLng], { icon });
        marker.bindPopup(getTeamPopupHtml(team, isEnRoute, isOnScene, catUpper));
        marker.addTo(teamLayer);

        let line = null;
        if (targetInc && targetInc.lat && targetInc.lng) {
          const dist = calcDistanceKm(tLat, tLng, targetInc.lat, targetInc.lng);
          if (dist != null && dist < 12) {
            line = L.polyline([[tLat, tLng], [targetInc.lat, targetInc.lng]], {
              color: isOnScene ? "#10b981" : "#f59e0b",
              weight: 3,
              opacity: 0.85,
              dashArray: isOnScene ? undefined : "6, 6"
            });
            line.bindTooltip(`🚒 <b>${team.name}</b> &rarr; <b>${targetInc.id}</b>`, { sticky: true });
            line.addTo(teamLayer);
          }
        }

        teamMarkersRef.current.set(teamId, { marker, line, hash });
      }
    });

    for (const [id, item] of teamMarkersRef.current.entries()) {
      if (!currentTeamIds.has(id)) {
        teamLayer.removeLayer(item.marker);
        if (item.line) teamLayer.removeLayer(item.line);
        teamMarkersRef.current.delete(id);
      }
    }
  }, [resources, showTeams, incidents]);

  // 11. LIVE EVACUATION SHELTER PINS (In-Place Diffing)
  useEffect(() => {
    const shelterLayer = layersRef.current.shelters;
    if (!shelterLayer) return;

    if (!showShelters) {
      shelterLayer.clearLayers();
      shelterMarkersRef.current.clear();
      return;
    }

    const currentShelterIds = new Set();

    shelters.forEach((sh) => {
      const sLat = sh.latitude ?? sh.lat;
      const sLng = sh.longitude ?? sh.lng;
      if (!sLat || !sLng) return;

      const shelterId = sh.id || sh.name;
      currentShelterIds.add(shelterId);

      const isSelected = selectedShelter && selectedShelter.id === sh.id;
      const isVerified = Boolean(sh.is_verified || sh.isVerified);
      const iconKey = `shelter-${isSelected ? "sel" : isVerified ? "ver" : "disc"}`;

      const shelterIcon = getCachedDivIcon(iconKey, {
        className: "custom-shelter-marker-container",
        html: `<div style="background:${isSelected ? "#e11d48" : isVerified ? "#16a34a" : "#0284c7"};color:#fff;border-radius:50%;width:${isSelected ? "36px" : "30px"};height:${isSelected ? "36px" : "30px"};display:flex;align-items:center;justify-content:center;font-size:${isSelected ? "18px" : "15px"};border:${isSelected ? "3px solid #ffe4e6" : "2px solid #fff"};box-shadow:0 3px 12px ${isSelected ? "rgba(225,29,72,0.6)" : "rgba(0,0,0,0.35)"};" title="${sh.name}">🏕️</div>`,
        iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
        iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15]
      });

      const hash = `${sLat}_${sLng}_${isSelected}_${isVerified}_${sh.distance_km ?? sh.distanceKm}`;
      const existing = shelterMarkersRef.current.get(shelterId);

      if (existing) {
        if (existing.hash !== hash) {
          existing.marker.setLatLng([sLat, sLng]);
          existing.marker.setIcon(shelterIcon);
          existing.marker.setPopupContent(getShelterPopupHtml(sh, isSelected, isVerified));
          existing.hash = hash;
        }
      } else {
        const marker = L.marker([sLat, sLng], { icon: shelterIcon });
        marker.bindPopup(getShelterPopupHtml(sh, isSelected, isVerified));
        marker.addTo(shelterLayer);
        shelterMarkersRef.current.set(shelterId, { marker, hash });
      }
    });

    for (const [id, item] of shelterMarkersRef.current.entries()) {
      if (!currentShelterIds.has(id)) {
        shelterLayer.removeLayer(item.marker);
        shelterMarkersRef.current.delete(id);
      }
    }
  }, [shelters, showShelters, selectedShelter?.id]);

  // 12. SAFEST OSRM EVACUATION ROUTE POLYLINE (In-place update)
  useEffect(() => {
    const routeLayer = layersRef.current.route;
    if (!routeLayer) return;

    if (activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0) {
      const latLngs = activeRoute.coordinates.map((c) => [c.lat, c.lng]);
      const routeHash = `${activeRoute.distanceKm}_${activeRoute.durationMin}_${latLngs.length}_${latLngs[0]?.[0]}`;

      if (routeLinesRef.current.casing && routeLinesRef.current.core) {
        if (routeLinesRef.current.hash !== routeHash) {
          routeLinesRef.current.casing.setLatLngs(latLngs);
          routeLinesRef.current.core.setLatLngs(latLngs);
          routeLinesRef.current.core.setTooltipContent(`🛣️ <b>Safest Evacuation Route</b><br/>Distance: <b>${activeRoute.distanceKm} km</b> · Safe ETA: <b>~${activeRoute.durationMin} min</b>`);
          routeLinesRef.current.hash = routeHash;
        }
      } else {
        routeLayer.clearLayers();

        // Glowing Casing Polyline
        const casingLine = L.polyline(latLngs, {
          color: "#1e3a8a",
          weight: 8,
          opacity: 0.85
        });
        casingLine.addTo(routeLayer);

        // Core Vibrant Polyline
        const coreLine = L.polyline(latLngs, {
          color: "#38bdf8",
          weight: 5,
          opacity: 1,
          dashArray: "10, 6"
        });
        coreLine.bindTooltip(`🛣️ <b>Safest Evacuation Route</b><br/>Distance: <b>${activeRoute.distanceKm} km</b> · Safe ETA: <b>~${activeRoute.durationMin} min</b>`, { sticky: true });
        coreLine.addTo(routeLayer);

        routeLinesRef.current = { casing: casingLine, core: coreLine, hash: routeHash };
      }

      // Smoothly fit bounds only once when a new route is activated
      if (prevRouteRef.current !== activeRoute) {
        prevRouteRef.current = activeRoute;
        try {
          if (routeLinesRef.current.core) {
            const bounds = routeLinesRef.current.core.getBounds();
            if (bounds.isValid()) {
              mapInstance.current.fitBounds(bounds, { padding: [50, 50], animate: true });
            }
          }
        } catch {
          // bounds fit notice
        }
      }
    } else {
      routeLayer.clearLayers();
      routeLinesRef.current = { casing: null, core: null, hash: null };
      prevRouteRef.current = null;
    }
  }, [activeRoute]);

  return (
    <div className="map-container-relative" style={{ height, position: "relative" }}>
      {/* Floating Active Evacuation Route Advisory Banner */}
      {activeRoute && selectedShelter && (
        <div style={{
          position: "absolute",
          top: "12px",
          left: "60px",
          right: "12px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          border: "2px solid #38bdf8",
          borderRadius: "10px",
          padding: "10px 14px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          zIndex: 1000,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#2563eb", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
              🛡️
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#38bdf8" }}>
                SAFEST EVACUATION ROUTE → {selectedShelter.name}
              </div>
              <div style={{ fontSize: "10px", color: "#cbd5e1", marginTop: "1px" }}>
                Distance: <b style={{ color: "#fff" }}>{activeRoute.distanceKm} km</b> · Safe ETA: <b style={{ color: "#4ade80" }}>~{activeRoute.durationMin} min</b> · High-Ground Corridor (avoids flooded subways)
              </div>
            </div>
          </div>
          {onClearRoute && (
            <button
              onClick={onClearRoute}
              style={{
                background: "#334155",
                color: "#fff",
                border: "none",
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ✕ Clear Route
            </button>
          )}
        </div>
      )}

      {/* Floating Interactive Layer Controls */}
      <div className="map-layer-controls">
        <div className="map-style-segmented">
          <button
            className={`map-style-tab ${mapStyle === "google-roadmap" ? "active" : ""}`}
            onClick={() => setMapStyle("google-roadmap")}
            title="Google Maps Roadmap"
          >
            🗺️ Map
          </button>
          <button
            className={`map-style-tab ${mapStyle === "google-hybrid" ? "active" : ""}`}
            onClick={() => setMapStyle("google-hybrid")}
            title="Google Satellite / Hybrid"
          >
            🛰️ Satellite
          </button>
          <button
            className={`map-style-tab ${mapStyle === "google-terrain" ? "active" : ""}`}
            onClick={() => setMapStyle("google-terrain")}
            title="Google Topographic Terrain"
          >
            ⛰️ Terrain
          </button>
          <button
            className={`map-style-tab ${mapStyle === "google-traffic" ? "active" : ""}`}
            onClick={() => setMapStyle("google-traffic")}
            title="Google Live Traffic"
          >
            🚦 Traffic
          </button>
        </div>

        <div className="map-overlay-toggles">
          <button
            className={`layer-toggle-chip ${showRainfall ? "active" : ""}`}
            onClick={() => setShowRainfall(!showRainfall)}
            title="Toggle Open-Meteo Rainfall Radar Layer"
          >
            <CloudRain size={12} />
            <span>Rainfall</span>
            <span className={`toggle-status-dot ${showRainfall ? "on" : "off"}`} />
          </button>
          <button
            className={`layer-toggle-chip ${showDrainage ? "active" : ""}`}
            onClick={() => setShowDrainage(!showDrainage)}
            title="Toggle Drainage Culvert Network"
          >
            <Wrench size={12} />
            <span>Drainage</span>
            <span className={`toggle-status-dot ${showDrainage ? "on" : "off"}`} />
          </button>
          <button
            className={`layer-toggle-chip ${showTeams ? "active" : ""}`}
            onClick={() => setShowTeams(!showTeams)}
            title="Toggle Municipal Resources & Response Squads"
          >
            <Truck size={12} />
            <span>Resources</span>
            <span className={`toggle-status-dot ${showTeams ? "on" : "off"}`} />
          </button>
          <button
            className={`layer-toggle-chip ${showShelters ? "active" : ""}`}
            onClick={() => setShowShelters(!showShelters)}
            title="Toggle Evacuation Shelters"
          >
            <span>🏕️ Shelters ({shelters.length})</span>
            <span className={`toggle-status-dot ${showShelters ? "on" : "off"}`} />
          </button>
        </div>
      </div>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export const MUMBAI_MARKET_HUBS = [
  { id: "MKT-01", name: "Andheri West Station Road Market", ward: "K-West Ward", lat: 19.1320, lng: 72.8480, area: "Station Road & S.V. Road" },
  { id: "MKT-02", name: "Dadar TT Circle & Flower Market", ward: "G-North Ward", lat: 19.0180, lng: 72.8430, area: "Dadar Market & Station" },
  { id: "MKT-03", name: "Bandra Linking Road & Hill Road", ward: "H-West Ward", lat: 19.0600, lng: 72.8360, area: "Linking Road Commercial" },
  { id: "MKT-04", name: "Kurla West LBS Marg & Station", ward: "L Ward", lat: 19.0680, lng: 72.8800, area: "LBS Marg Market Hub" },
  { id: "MKT-05", name: "Malad West SV Road Market", ward: "P-North Ward", lat: 19.1860, lng: 72.8480, area: "SV Road Bazaar" },
  { id: "MKT-06", name: "Ghatkopar East MG Road Bazaar", ward: "N Ward", lat: 19.0860, lng: 72.9080, area: "MG Road Commercial" },
  { id: "MKT-07", name: "Borivali West Station Bazaar", ward: "R-Central Ward", lat: 19.2290, lng: 72.8570, area: "Borivali Station Road" },
  { id: "MKT-08", name: "Mulund West Station Road Bazaar", ward: "T Ward", lat: 19.1721, lng: 72.9567, area: "Mulund Station Commercial" },
  { id: "MKT-09", name: "Colaba Causeway & Fort Commercial", ward: "A Ward", lat: 18.9180, lng: 72.8280, area: "Colaba & Fort Area" },
  { id: "MKT-10", name: "Thane Station & Gokhale Road Bazaar", ward: "Thane Central", lat: 19.1860, lng: 72.9750, area: "Station Road Commercial" }
];

export function LocationSearchBar({
  userLat,
  userLng,
  userLocationName,
  locationMode = "gps", // 'gps' | 'search' | 'preset' | 'fallback'
  locationStatus = "idle", // 'idle' | 'detecting_gps' | 'gps_denied' | 'invalid_location' | 'offline'
  shelterLoading = false,
  shelterCount = 0,
  emergencyCount = 0,
  onDetectGps,
  onSelectLocation,
  onManualSearch,
  onSelectPresetHub
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef(null);

  // Debounced search query for autocomplete suggestions (350ms)
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch(`/geocode/search?q=${encodeURIComponent(val.trim())}`);
        if (res.success && res.results && res.results.length > 0) {
          setSuggestions(res.results);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (item) => {
    setQuery("");
    setShowDropdown(false);
    if (onSelectLocation) {
      onSelectLocation(item.latitude, item.longitude, `${item.name}, ${item.ward || item.city}`, "search");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query || !query.trim()) return;
    setShowDropdown(false);
    if (onManualSearch) {
      onManualSearch(query.trim());
    }
  };

  const modeBadge = {
    gps: { label: "🎯 LIVE GPS", bg: "#10b981", color: "#fff", sub: "Live Device Location" },
    search: { label: "🔍 SEARCHED", bg: "#8b5cf6", color: "#fff", sub: "Forward Geocoded via OSM" },
    preset: { label: "🏪 PRESET HUB", bg: "#3b82f6", color: "#fff", sub: "Mumbai Commercial Center" },
    fallback: { label: "⚠️ FALLBACK MODE", bg: "#f59e0b", color: "#000", sub: "Temporary Fallback Location" }
  }[locationMode] || { label: "📍 ACTIVE", bg: "#64748b", color: "#fff", sub: "Current Location" };

  return (
    <div style={{
      background: "#ffffff",
      color: "#0f172a",
      padding: "16px 18px",
      borderRadius: "10px",
      marginBottom: "18px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      border: "1px solid #e2e8f0"
    }}>
      {/* Top Row: Location Info & Quick Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: locationMode === "gps" ? "#f0fdf4" : "#eff6ff",
            color: locationMode === "gps" ? "#16a34a" : "#2563eb",
            display: "grid",
            placeItems: "center",
            fontSize: "17px",
            flexShrink: 0
          }}>
            <MapPin size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                background: "#f1f5f9",
                color: "#475569",
                fontSize: "10px",
                fontWeight: "800",
                padding: "2px 6px",
                borderRadius: "4px",
                letterSpacing: "0.5px"
              }}>
                {locationMode === "gps" ? "LIVE GPS" : "ACTIVE LOCATION"}
              </span>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                {userLat != null ? `${Number(userLat).toFixed(4)}, ${Number(userLng).toFixed(4)}` : ""}
              </span>
            </div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
              {userLocationName || "Detecting Location..."}
            </div>
          </div>
        </div>

        {/* Quick GPS & Preset Dropdown */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={onDetectGps}
            disabled={locationStatus === "detecting_gps"}
            style={{
              background: "#0b1b3a",
              color: "#fff",
              border: "none",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {locationStatus === "detecting_gps" ? (
              <>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Compass size={13} />
                <span>Detect GPS</span>
              </>
            )}
          </button>

          <select
            value={MUMBAI_MARKET_HUBS.some((h) => Math.abs(h.lat - userLat) < 0.001 && Math.abs(h.lng - userLng) < 0.001) ? `${userLat},${userLng}` : ""}
            onChange={(e) => {
              if (!e.target.value) return;
              const [latStr, lngStr] = e.target.value.split(",");
              const lat = parseFloat(latStr);
              const lng = parseFloat(lngStr);
              const hub = MUMBAI_MARKET_HUBS.find((h) => Math.abs(h.lat - lat) < 0.001 && Math.abs(h.lng - lng) < 0.001);
              if (hub && onSelectPresetHub) onSelectPresetHub(hub);
            }}
            style={{
              background: "#f8fafc",
              color: "#334155",
              border: "1px solid #cbd5e1",
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <option value="" disabled>Select Market Hub...</option>
            {MUMBAI_MARKET_HUBS.map((hub) => (
              <option key={hub.id} value={`${hub.lat},${hub.lng}`}>
                {hub.name} ({hub.ward})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{ marginTop: "12px", position: "relative" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
              placeholder="Search location (e.g. Mulund, Kurla, Andheri, Bandra, Dadar)..."
              style={{
                width: "100%",
                background: "#f8fafc",
                color: "#0f172a",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "8px 36px 8px 36px",
                fontSize: "13px",
                outline: "none"
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setSuggestions([]); setShowDropdown(false); }}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {searching ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={13} />}
            Search
          </button>
        </form>

        {/* Suggestions Autocomplete Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#1e293b",
            border: "1px solid #475569",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 1000,
            maxHeight: "220px",
            overflowY: "auto"
          }}>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  padding: "10px 14px",
                  borderBottom: idx === suggestions.length - 1 ? "none" : "1px solid #334155",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#334155"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <MapPin size={15} color="#8b5cf6" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", color: "#f8fafc" }}>{item.name}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>{item.displayName}</div>
                </div>
                <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "600" }}>
                  {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* State Feedback Banners */}
      {locationStatus === "invalid_location" && (
        <div style={{ marginTop: "10px", background: "#fef2f2", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "8px", border: "1px solid #fecaca" }}>
          <AlertTriangle size={14} color="#dc2626" />
          <span><b>Location Not Found:</b> Could not find geographic coordinates on OpenStreetMap. Please check spelling or search a nearby landmark.</span>
        </div>
      )}

      {locationStatus === "gps_denied" && locationMode === "fallback" && (
        <div style={{ marginTop: "10px", background: "#fffbeb", color: "#92400e", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "8px", border: "1px solid #fde68a" }}>
          <AlertCircle size={14} color="#d97706" />
          <span><b>Fallback Mode Active:</b> GPS permission was not granted. Showing temporary reference coordinates. Enter your location in the search bar above or choose a market hub.</span>
        </div>
      )}

      {locationStatus === "offline" && (
        <div style={{ marginTop: "10px", background: "#f1f5f9", color: "#334155", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "8px", border: "1px solid #cbd5e1" }}>
          <WifiOff size={14} color="#64748b" />
          <span><b>Network Offline:</b> You are currently disconnected. Discovered shelters are loaded from cache.</span>
        </div>
      )}
    </div>
  );
}


const nav = [
  ["Overview", "/", Home],
  ["Live Alerts", "/alerts", Bell],
  ["Risk Map", "/map", MapIcon],
  ["Incidents", "/incidents", Siren],
  ["Team Tracker", "/resources", Truck],
  ["Dispatch", "/dispatch", Send],
  ["Blockages", "/drainage", Wrench],
  ["AI Agents", "/multi-agent", BrainCircuit]
];

function Sidebar({ open }) {
  return (
    <aside className={`sidebar ${open ? "" : "collapsed"}`}>
      <div className="brand">
        <div className="brand-mark">
          <CloudRain size={20} />
        </div>
        {open && (
          <div>
            <strong>
              Varsha<span>Raksha</span>
            </strong>
            <small>Disaster Command</small>
          </div>
        )}
      </div>
      <div className="nav-label">{open ? "OPERATIONS" : "•"}</div>
      <nav>
        {nav.map(([label, to, Icon]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")} title={label}>
            <Icon size={18} />
            {open && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings">
          <Settings size={18} />
          {open && <span>Settings</span>}
        </NavLink>
        {open && (
          <div className="operator">
            <div className="avatar">WA</div>
            <div>
              <b>Ward Admin</b>
              <span>Active</span>
            </div>
            <span className="dot"></span>
          </div>
        )}
      </div>
    </aside>
  );
}

function Topbar({ onMenu, alertCount, onRefresh, onToggleNotifications, hasActiveSos }) {
  const loc = useLocation();
  const title = loc.pathname === "/" ? "Overview" : nav.find((x) => x[1] === loc.pathname)?.[0] || "Operations";
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onMenu}>
        <Menu size={18} />
      </button>
      <div className="crumb">
        <span>VarshaRaksha</span>
        <ChevronRight size={14} />
        <b>{title}</b>
      </div>
      <div className="top-actions">
        <div className="live-pill">
          <i></i> Live System Active
        </div>
        <button className="icon-btn" title="Refresh Live Data" onClick={onRefresh}>
          <RefreshCw size={17} />
        </button>
        <button
          className={`icon-btn badge-btn ${hasActiveSos ? "sos-ringing" : ""}`}
          title="Active Emergency Alerts"
          onClick={onToggleNotifications}
        >
          <Bell size={18} color={hasActiveSos ? "#dc2626" : "currentColor"} />
          <em>{alertCount}</em>
        </button>
        <div className="top-avatar">WA</div>
      </div>
    </header>
  );
}

// Slide-down interactive Notifications Drawer / Modal with live SOS emergencies
function NotificationsDrawer({ isOpen, onClose, alerts = [], incidents = [], onAutoDispatch, onClearAlerts, userLat, userLng }) {
  if (!isOpen) return null;
  const navigate = useNavigate();

  // Active unmitigated SOS alerts (removed from queue once resources are dispatched or incident is resolved)
  const sosAlerts = incidents.filter(
    (i) => (i.isSos || i.type === "SOS" || i.status === "ACTIVE_SOS" || i.causeCode === "SOS_EMERGENCY") &&
           i.status !== "Dispatched" && i.status !== "Resolved" && i.status !== "RESOLVED" && !i.dispatched && !i.assignedTeam
  );

  const dispatchedIncidentIds = new Set(
    incidents
      .filter((i) => i.status === "Dispatched" || i.status === "Resolved" || i.status === "RESOLVED" || i.dispatched || i.assignedTeam)
      .map((i) => i.id)
  );

  const regularAlerts = alerts.filter(
    (a) => !a.isSos && a.type !== "SOS" && !a.dispatched && !dispatchedIncidentIds.has(a.incidentId) && !dispatchedIncidentIds.has(a.sosId)
  );
  const totalCount = sosAlerts.length + regularAlerts.length;
  const hasUserLocation = userLat != null && userLng != null && !isNaN(Number(userLat)) && !isNaN(Number(userLng));

  return (
    <>
      <div className="notifications-overlay" onClick={onClose} />
      <div className="notifications-dropdown">
        <div className="notifications-head">
          <h3>
            <Bell size={17} color={sosAlerts.length > 0 ? "#ef4444" : "#2563eb"} />
            Emergency & System Notifications
            {totalCount > 0 && <span className="badge-count">{totalCount}</span>}
          </h3>
          <div className="notifications-head-actions">
            <button
              onClick={() => {
                onClose();
                navigate("/alerts");
              }}
              style={{ background: "#f1f5f9", color: "#0f172a", fontWeight: "700" }}
            >
              All Alerts →
            </button>
            {alerts.length > 0 && (
              <button onClick={onClearAlerts}>Clear All</button>
            )}
            <button onClick={onClose} title="Close Notifications" style={{ padding: "4px" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="notifications-body">
          {totalCount === 0 ? (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>✅</div>
              <b>No Active Emergencies</b>
              <p style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>
                All ward drainage, citizen distress channels, and weather corridors are operational.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Critical SOS Alerts with high urgency layout */}
              {sosAlerts.map((sos) => {
                const sLat = sos.lat ?? sos.latitude;
                const sLng = sos.lng ?? sos.longitude;
                const distKm = hasUserLocation && sLat && sLng ? calcDistanceKm(userLat, userLng, sLat, sLng) : null;
                const repCount = sos.reporter_count || (Array.isArray(sos.reports) ? sos.reports.length : (sos.reports_length || 1));

                return (
                  <div key={sos.id} className="sos-alert-card">
                    <div className="sos-card-header">
                      <span className="sos-card-badge" style={repCount > 1 ? { background: "#dc2626" } : undefined}>
                        <span className="pulsing-red-dot" />
                        🚨 CRITICAL SOS {repCount > 1 ? `(${repCount} REPORTS IN 500m ZONE)` : "TRIGGERED"}
                      </span>
                      <span style={{ fontSize: "10px", color: "#991b1b", fontWeight: "700" }}>
                        ⏱️ {sos.time || "Immediate"}
                      </span>
                    </div>

                    {repCount > 1 && (
                      <div style={{
                        background: "#fee2e2",
                        border: "1px solid #fca5a5",
                        borderRadius: "6px",
                        padding: "5px 9px",
                        margin: "4px 0",
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#991b1b",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <span>👥</span>
                        <span><b>{repCount} Distress Signals</b> generated from this 500m sector</span>
                      </div>
                    )}

                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#991b1b", margin: "4px 0 2px" }}>
                      {sos.reporter || "Citizen"}
                      {sos.role && <span style={{ fontSize: "10px", fontWeight: "normal", color: "#b91c1c" }}> ({sos.role})</span>}
                    </div>

                    <div style={{ fontSize: "11px", color: "#7f1d1d", display: "flex", flexDirection: "column", gap: "2px", margin: "4px 0 8px" }}>
                      <div>📍 <b>Location:</b> {sos.address}</div>
                      {distKm != null && <div>📏 <b>Distance:</b> {distKm} km from you</div>}
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button
                        className="primary"
                        onClick={() => {
                          if (onAutoDispatch) onAutoDispatch(sos);
                          onClose();
                        }}
                        style={{
                          background: "#dc2626",
                          borderColor: "#b91c1c",
                          fontSize: "11px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          flex: 1
                        }}
                      >
                        <Send size={12} /> Dispatch Rescue Squad
                      </button>
                      {sos.lat && sos.lng && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${sos.lat},${sos.lng}&travelmode=driving`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            border: "1px solid #fca5a5",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Navigation size={12} /> Maps ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 2. Standard Alerts & Flood Advisories */}
              {regularAlerts.map((alt) => {
                const aLat = alt.lat ?? alt.latitude;
                const aLng = alt.lng ?? alt.longitude;
                const distKm = alt.distance_km != null ? alt.distance_km : (hasUserLocation && aLat && aLng ? calcDistanceKm(userLat, userLng, aLat, aLng) : null);
                const isCritical = alt.severity === "CRITICAL" || alt.severity === "High" || alt.level === "RED";

                return (
                  <div
                    key={alt.id}
                    className={`regular-alert-card ${isCritical ? "critical" : "warning"}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      onClose();
                      navigate("/alerts");
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ fontSize: "12px", color: "#0f172a" }}>{alt.title || alt.headline || "Flood Advisory"}</b>
                      <span style={{ fontSize: "9px", color: isCritical ? "#dc2626" : "#64748b", fontWeight: "800" }}>{alt.severity || alt.level || "Warning"}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#475569", margin: "2px 0" }}>{alt.description || alt.message}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                      <span>📍 {alt.location_name || alt.area || "Area"}</span>
                      {distKm != null && <span style={{ fontWeight: "700", color: "#2563eb" }}>📏 {distKm} km from you</span>}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PageHeader({ eyebrow, title, sub, children }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="header-actions">{children}</div>
    </div>
  );
}

function StatCard({ label, value, delta, icon: Icon, tone = "blue" }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={20} />
      </div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={delta?.startsWith("-") ? "down" : ""}>{delta}</small>
      </div>
    </div>
  );
}

function RiskBadge({ score }) {
  const label = score >= 75 ? "RED" : score >= 45 ? "ORANGE" : "GREEN";
  return (
    <span className={`risk-badge ${label.toLowerCase()}`}>
      <i></i>
      {label} · {score}
    </span>
  );
}

// Realtime Alerts Page with Dynamic Location, Haversine/Road Distances, and Multi-Source Warnings
function AlertsPage({
  alerts = [],
  setAlerts,
  userLat,
  userLng,
  userLocationName,
  locationMode,
  locationStatus,
  onDetectGps,
  notify,
  onReloadAlerts
}) {
  const navigate = useNavigate();
  const [filterSource, setFilterSource] = useState("all");
  const [sortBy, setSortBy] = useState("smart");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  const handleFeedback = async (alertId, type) => {
    try {
      setActionLoading((prev) => ({ ...prev, [alertId]: true }));
      await apiFetch(`/alerts/${alertId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, role: "Ward Admin" })
      });
      if (setAlerts) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: type === "RESOLVED" ? "Resolved" : "False Alarm" } : a))
        );
      }
      notify(`Alert ${alertId} marked as ${type === "RESOLVED" ? "Resolved" : "False Alarm"}.`);
    } catch (err) {
      notify(`Action failed: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  const hasUserLocation = userLat != null && userLng != null && !isNaN(Number(userLat)) && !isNaN(Number(userLng));

  // Compute live enriched distance and freshness for all alerts
  const enrichedAlerts = alerts.map((alt) => {
    const aLat = alt.lat ?? alt.latitude;
    const aLng = alt.lng ?? alt.longitude;
    const hasAlertLocation = aLat != null && aLng != null && !isNaN(Number(aLat)) && !isNaN(Number(aLng));

    let distKm = null;
    let etaMin = null;
    let distanceLabel = "Distance unavailable";
    let isNearby = false;

    if (hasUserLocation && hasAlertLocation) {
      distKm = alt.distance_km != null ? alt.distance_km : calcDistanceKm(userLat, userLng, Number(aLat), Number(aLng));
      etaMin = alt.eta_min != null ? alt.eta_min : (distKm != null ? Math.max(1, Math.round(distKm * 3.5 + 1)) : null);
      distanceLabel = `${distKm} km from you`;
      isNearby = distKm < 3.0;
    } else if (!hasUserLocation && hasAlertLocation) {
      distanceLabel = "Enable location to see alert distances";
    }

    const createdTime = new Date(alt.createdAt || alt.updatedAt || Date.now()).getTime();
    const ageMinutes = Math.max(0, Math.round((Date.now() - createdTime) / 60000));
    let freshness = "Updated just now";
    let isStale = false;
    if (ageMinutes >= 120) {
      freshness = `Data may be outdated (${Math.round(ageMinutes / 60)}h ago)`;
      isStale = true;
    } else if (ageMinutes >= 60) {
      freshness = `Updated ${Math.round(ageMinutes / 60)} hr ago`;
    } else if (ageMinutes > 0) {
      freshness = `Updated ${ageMinutes} min ago`;
    }

    const severityOrder = {
      CRITICAL: 1,
      RED: 1,
      HIGH: 2,
      ORANGE: 3,
      ELEVATED: 3,
      MODERATE: 4,
      YELLOW: 4,
      NORMAL: 5,
      GREEN: 5
    };
    const sevScore = severityOrder[String(alt.severity || alt.level || "NORMAL").toUpperCase()] || 4;

    return {
      ...alt,
      aLat: hasAlertLocation ? Number(aLat) : null,
      aLng: hasAlertLocation ? Number(aLng) : null,
      hasAlertLocation,
      distKm,
      etaMin,
      distanceLabel,
      isNearby,
      freshness,
      isStale,
      sevScore
    };
  });

  // Filter by source and search query
  const filteredAlerts = enrichedAlerts.filter((a) => {
    const src = (a.source || a.type || "").toLowerCase();
    if (filterSource === "flood" && src !== "flood") return false;
    if (filterSource === "lightning" && src !== "lightning") return false;
    if (filterSource === "rainfall" && src !== "rainfall") return false;
    if (filterSource === "incident" && src !== "incident" && src !== "sos") return false;
    if (filterSource === "drainage" && src !== "drainage") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (a.title || "").toLowerCase().includes(q);
      const matchDesc = (a.description || a.message || "").toLowerCase().includes(q);
      const matchLoc = (a.location_name || a.area || a.zoneName || "").toLowerCase().includes(q);
      const matchId = (a.id || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchLoc && !matchId) return false;
    }
    return true;
  });

  // Sort alerts
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === "smart") {
      if (a.sevScore !== b.sevScore) return a.sevScore - b.sevScore;
      if (a.distKm != null && b.distKm != null) return a.distKm - b.distKm;
      if (a.distKm != null) return -1;
      if (b.distKm != null) return 1;
      return 0;
    }
    if (sortBy === "proximity") {
      if (a.distKm != null && b.distKm != null) return a.distKm - b.distKm;
      if (a.distKm != null) return -1;
      if (b.distKm != null) return 1;
      return a.sevScore - b.sevScore;
    }
    if (sortBy === "severity") {
      return a.sevScore - b.sevScore;
    }
    if (sortBy === "newest") {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return 0;
  });

  const countBySource = {
    all: enrichedAlerts.length,
    flood: enrichedAlerts.filter((a) => (a.source || a.type) === "flood").length,
    lightning: enrichedAlerts.filter((a) => (a.source || a.type) === "lightning").length,
    rainfall: enrichedAlerts.filter((a) => (a.source || a.type) === "rainfall").length,
    incident: enrichedAlerts.filter((a) => (a.source || a.type) === "incident" || (a.source || a.type) === "sos").length,
    drainage: enrichedAlerts.filter((a) => (a.source || a.type) === "drainage").length
  };

  return (
    <div className="content alerts-page">
      <PageHeader
        title="Live Alerts"
        sub="Monitor and respond to active emergencies"
      >
        <button className="primary" onClick={onReloadAlerts} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <RefreshCw size={14} /> Refresh Feed
        </button>
      </PageHeader>

      {/* Simplified Live Location Banner */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "12px 18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "18px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <MapPin size={17} />
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              LIVE LOCATION
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
              {userLocationName || "Mumbai Zone 3"}
            </div>
          </div>
        </div>
        <button
          className="enable-loc-btn"
          onClick={onDetectGps}
          style={{ background: "#0b1b3a", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
        >
          <Compass size={13} /> Update GPS
        </button>
      </div>

      {/* Compact Alert Filters and Sort */}
      <div className="alerts-controls-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <div className="alerts-tabs" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            ["all", "All", countBySource.all],
            ["flood", "Flood", countBySource.flood],
            ["lightning", "Lightning", countBySource.lightning],
            ["incident", "SOS", countBySource.incident],
            ["drainage", "Blockages", countBySource.drainage]
          ].map(([key, label, count]) => (
            <button
              key={key}
              className={`alerts-tab-btn ${filterSource === key ? "active" : ""}`}
              onClick={() => setFilterSource(key)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: filterSource === key ? "#0b1b3a" : "#ffffff",
                color: filterSource === key ? "#ffffff" : "#475569",
                border: filterSource === key ? "1px solid #0b1b3a" : "1px solid #e2e8f0",
                cursor: "pointer"
              }}
            >
              <span>{label}</span>
              <span style={{
                background: filterSource === key ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                color: filterSource === key ? "#ffffff" : "#64748b",
                padding: "1px 6px",
                borderRadius: "10px",
                fontSize: "10px",
                fontWeight: "700"
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "6px 12px 6px 30px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px", width: "190px", outline: "none" }}
            />
          </div>
          <select
            className="alerts-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px", color: "#334155", background: "#fff" }}
          >
            <option value="smart">Severity + Distance</option>
            <option value="proximity">Closest Distance</option>
            <option value="severity">Highest Severity</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      {sortedAlerts.length === 0 ? (
        <div style={{ padding: "50px 20px", textAlign: "center", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: "15px", color: "#0f172a" }}>No Active Alerts in this Category</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            All monitoring channels are reporting normal operational telemetry.
          </p>
        </div>
      ) : (
        <div className="alerts-cards-list">
          {sortedAlerts.map((alt) => {
            const sev = (alt.severity || alt.level || "NORMAL").toLowerCase();
            const isCritical = sev === "critical" || sev === "red";
            const isHigh = sev === "high";
            const isOrange = sev === "orange" || sev === "elevated" || sev === "moderate";
            const isSosAlert = alt.isSos || alt.type === "sos" || alt.type === "SOS" || alt.source === "incident";
            const typeLabel = (alt.source || alt.type || "FLOOD").toUpperCase();

            // Key emergency metric calculation
            const metricLabel = alt.source === "flood" || alt.type === "flood"
              ? "Water Depth"
              : alt.source === "lightning"
              ? "Strike Proximity"
              : alt.source === "rainfall"
              ? "Precipitation"
              : "Emergency Risk";

            const metricValue = alt.depth
              ? `${alt.depth} m`
              : alt.waterLevel
              ? `${alt.waterLevel} cm`
              : alt.rainfall
              ? `${alt.rainfall} mm/h`
              : alt.lightning_count
              ? `${alt.lightning_count} strikes detected`
              : "Elevated Hazard";

            return (
              <div
                key={alt.id}
                className={`alert-card-rich ${isCritical ? "critical" : isHigh ? "high" : isOrange ? "elevated" : "normal"}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderLeft: isCritical ? "4px solid #dc2626" : isHigh ? "4px solid #f97316" : isOrange ? "4px solid #f59e0b" : "4px solid #16a34a",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}
              >
                {/* 1. Incident Type and Severity */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: "800", padding: "2px 7px", borderRadius: "4px", background: "#f1f5f9", color: "#334155", letterSpacing: "0.5px" }}>
                      [ {typeLabel} ]
                    </span>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: "800",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: isCritical ? "#fee2e2" : isHigh ? "#ffedd5" : isOrange ? "#fef3c7" : "#dcfce7",
                      color: isCritical ? "#dc2626" : isHigh ? "#c2410c" : isOrange ? "#b45309" : "#15803d",
                      letterSpacing: "0.5px"
                    }}>
                      [ {alt.severity || alt.level || "NORMAL"} ]
                    </span>
                    {isSosAlert && (
                      <span style={{ fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px", background: "#dc2626", color: "#fff" }}>
                        SOS
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {alt.freshness || "Just now"}
                  </span>
                </div>

                {/* 2. Clear Incident Title */}
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a", lineHeight: "1.3" }}>
                  {alt.title}
                </h3>

                {/* 3. Location */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#475569", fontWeight: "600" }}>
                  <MapPin size={13} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span>{alt.location_name || alt.area || "Ward 73, Mumbai"}</span>
                </div>

                {/* 4. Key Emergency Metric */}
                <div style={{ fontSize: "12px", background: "#f8fafc", padding: "6px 10px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b", fontWeight: "600" }}>{metricLabel}:</span>
                  <b style={{ color: isCritical ? "#dc2626" : "#0f172a", fontSize: "13px" }}>{metricValue}</b>
                </div>

                {/* 5. Distance and ETA */}
                {alt.distKm != null && (
                  <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{alt.distKm} km away</span>
                    {alt.etaMin != null && <span>· ~{alt.etaMin} min ETA</span>}
                  </div>
                )}

                {/* 6. Primary Action Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                  {alt.hasAlertLocation ? (
                    <button
                      className="btn-view-map"
                      onClick={() => navigate("/map")}
                      title="View alert location on interactive Map"
                      style={{ background: "#0b1b3a", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
                    >
                      <MapIcon size={12} /> View Map
                    </button>
                  ) : <span />}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="btn-alert-feedback"
                      onClick={() => handleFeedback(alt.id, "RESOLVED")}
                      disabled={actionLoading[alt.id]}
                      title="Mark this alert as resolved"
                      style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                    >
                      <CheckCircle2 size={12} /> Resolve
                    </button>
                    <button
                      className="btn-alert-feedback"
                      onClick={() => handleFeedback(alt.id, "FALSE_ALARM")}
                      disabled={actionLoading[alt.id]}
                      title="Mark this alert as false alarm"
                      style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                    >
                      <X size={12} /> Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main Dashboard with Live Map, Incident Feed Sidebar, and Resource Availability Tracker
function Dashboard({
  zones,
  incidents,
  alerts,
  resources,
  chronicBlockages,
  emergencyServices = [],
  shelters = [],
  shelterLoading = false,
  shelterError = null,
  shelterStatus = "idle",
  selectedShelter = null,
  activeRoute = null,
  loadingRoute = false,
  onSelectShelter,
  onClearRoute,
  userLat = 19.132,
  userLng = 72.848,
  userLocationName = "Andheri West Station Road Market",
  locationMode = "gps",
  locationStatus = "idle",
  onSelectLocation,
  onManualSearch,
  onSelectPresetHub,
  onDetectGps,
  onRetryShelters,
  notify,
  syncWeather,
  syncing,
  onAutoDispatch,
  onVerify,
  onFalseAlarm,
  onResolve,
  onOpenOverride,
  onViewPhoto,
  onGenerateReport,
  onResetReputation
}) {
  const navigate = useNavigate();
  const critical = zones.filter((z) => z.risk >= 75).length;
  const elevated = zones.filter((z) => z.risk >= 45 && z.risk < 75).length;
  const totalRain = zones.reduce((sum, z) => sum + (z.rainfall || 0), 0);
  const avgRain = zones.length > 0 ? (totalRain / zones.length).toFixed(1) : 0;
  const availableTeams = resources.filter((r) => r.status === "Available").length;
  const [emsCategoryFilter, setEmsCategoryFilter] = useState("all");

  const filteredEmergencyServices = emergencyServices.filter((ems) => {
    if (emsCategoryFilter === "all") return true;
    return ems.category === emsCategoryFilter;
  });

  // Select top nearest resource for the 3 key emergency categories (Hospitals, NGOs, Govt/Police/Fire)
  const closestHospital = (emergencyServices || [])
    .filter((e) => e.category === "medical" || e.group?.toLowerCase().includes("hospital") || e.name?.toLowerCase().includes("hospital") || e.name?.toLowerCase().includes("dispensary"))
    .sort((a, b) => Number(a.distanceKm ?? 999) - Number(b.distanceKm ?? 999))[0] || null;

  const closestNgo = [
    ...(emergencyServices || []).filter((e) => e.category === "ngo" || e.category === "shelter"),
    ...(shelters || [])
  ].sort((a, b) => Number(a.distanceKm ?? a.distance_km ?? 999) - Number(b.distanceKm ?? b.distance_km ?? 999))[0] || null;

  const closestGov = (emergencyServices || [])
    .filter((e) => e.category === "fire" || e.category === "police" || e.category === "municipal" || e.group?.toLowerCase().includes("fire") || e.group?.toLowerCase().includes("police") || e.name?.toLowerCase().includes("police") || e.name?.toLowerCase().includes("fire"))
    .sort((a, b) => Number(a.distanceKm ?? 999) - Number(b.distanceKm ?? 999))[0] || null;

  const [dashboardIncidentFilter, setDashboardIncidentFilter] = useState("all");

  const sortedIncidents = Array.isArray(incidents)
    ? [...incidents].sort((a, b) => new Date(b.userTimestamp || b.updatedAt || b.createdAt || b.time || 0) - new Date(a.userTimestamp || a.updatedAt || a.createdAt || a.time || 0))
    : [];

  const activeDashboardIncidents = sortedIncidents.filter((i) => !i.isQuarantined && i.status !== "Quarantined Spam");
  const humanReviewCount = activeDashboardIncidents.filter((i) => isHumanInterventionNeeded(i)).length;
  const aiVerifiedCount = activeDashboardIncidents.filter((i) => i.aiVerification?.is_flooding === true || i.aiVerified).length;

  const dashboardDisplayedIncidents = sortedIncidents.filter((i) => {
    if (dashboardIncidentFilter === "review") return isHumanInterventionNeeded(i);
    if (dashboardIncidentFilter === "ai") return i.aiVerification?.is_flooding === true || i.aiVerified;
    return !i.isQuarantined && i.status !== "Quarantined Spam";
  });

  return (
    <div className="content">
      <PageHeader
        title="Overview"
        sub="Real-time disaster response intelligence"
      >
        <button className="primary" onClick={syncWeather} disabled={syncing} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <RefreshCw size={14} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
          {syncing ? "Syncing..." : "Sync Weather"}
        </button>
      </PageHeader>

      {/* Hyperlocal Active User & Shelter Discovery Location Bar */}
      <LocationSearchBar
        userLat={userLat}
        userLng={userLng}
        userLocationName={userLocationName}
        locationMode={locationMode}
        locationStatus={locationStatus}
        shelterLoading={shelterLoading}
        shelterCount={shelters.length}
        emergencyCount={emergencyServices.length}
        onDetectGps={onDetectGps}
        onSelectLocation={onSelectLocation}
        onManualSearch={onManualSearch}
        onSelectPresetHub={onSelectPresetHub}
      />

      <div className="stats-grid">
        <StatCard label="CRITICAL ZONES" value={critical} delta={`${elevated} elevated`} icon={AlertTriangle} tone="red" />
        <StatCard label="ACTIVE INCIDENTS" value={incidents.length} delta="Ground reports" icon={Siren} tone="orange" />
        <StatCard label="LIVE RAINFALL" value={`${avgRain} mm`} delta="Radar feed" icon={CloudRain} tone="blue" />
        <StatCard label="TEAMS AVAILABLE" value={`${availableTeams}/${resources.length}`} delta="Field units" icon={Truck} tone="green" />
      </div>

      <div className="grid-2">
        {/* Map Panel with Toggles */}
        <section className="panel map-panel">
          <div className="panel-head">
            <div>
              <h3>Risk Map</h3>
              <span>Ward 72/73 · GIS Overlays</span>
            </div>
            <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>● Live SSE</span>
          </div>
          <div style={{ padding: "12px" }}>
            <LeafletMap
              zones={zones}
              incidents={incidents}
              resources={resources}
              shelters={shelters}
              selectedShelter={selectedShelter}
              activeRoute={activeRoute}
              center={[userLat, userLng]}
              userLocation={[userLat, userLng]}
              userLocationName={userLocationName}
              height="380px"
              onSelectShelter={onSelectShelter}
              onClearRoute={onClearRoute}
              onAutoDispatch={onAutoDispatch}
              onVerify={onVerify}
              onResolve={onResolve}
              onFalseAlarm={onFalseAlarm}
              onNavigateIncident={(id) => navigate(`/incidents/${id}`)}
              onNavigateZone={(zId) => navigate(`/zones/${zId}`)}
            />
          </div>
          <div className="map-legend">
            <div className="map-legend-items">
              <span className="legend-pill red"><span className="legend-dot red"></span>Critical (≥75)</span>
              <span className="legend-pill orange"><span className="legend-dot orange"></span>Warning (≥45)</span>
              <span className="legend-pill green"><span className="legend-dot green"></span>Normal (&lt;45)</span>
            </div>
          </div>
        </section>

        {/* Live Incident Queue */}
        <section className="panel incident-panel">
          <div className="panel-head" style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "stretch", padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0b1b3a", margin: 0 }}>Incident Feed</h3>
                <span style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  {sortedIncidents.length} Real-Time Ground Reports
                </span>
              </div>
              <NavLink
                to="/incidents"
                className="link"
                style={{ fontSize: "12px", fontWeight: "600", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: "3px", textDecoration: "none" }}
              >
                View All <ChevronRight size={14} />
              </NavLink>
            </div>

            {/* Filter Pills Row */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", overflowX: "auto" }}>
              <button
                className={`resource-filter-pill ${dashboardIncidentFilter === "all" ? "active" : ""}`}
                onClick={() => setDashboardIncidentFilter("all")}
                style={{ fontSize: "11px", padding: "4px 10px" }}
              >
                All ({sortedIncidents.length})
              </button>
              <button
                className={`resource-filter-pill ${dashboardIncidentFilter === "review" ? "active" : ""}`}
                onClick={() => setDashboardIncidentFilter("review")}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  color: dashboardIncidentFilter === "review" ? "#ffffff" : "#c2410c",
                  borderColor: dashboardIncidentFilter === "review" ? "#ea580c" : "#fed7aa",
                  background: dashboardIncidentFilter === "review" ? "#ea580c" : "#fff7ed"
                }}
              >
                ⚠️ Review ({humanReviewCount})
              </button>
              <button
                className={`resource-filter-pill ${dashboardIncidentFilter === "ai" ? "active" : ""}`}
                onClick={() => setDashboardIncidentFilter("ai")}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  color: dashboardIncidentFilter === "ai" ? "#ffffff" : "#15803d",
                  borderColor: dashboardIncidentFilter === "ai" ? "#16a34a" : "#bbf7d0",
                  background: dashboardIncidentFilter === "ai" ? "#16a34a" : "#f0fdf4"
                }}
              >
                🌊 AI Verified ({aiVerifiedCount})
              </button>
            </div>
          </div>
          <div className="incident-feed-list">
            {dashboardDisplayedIncidents.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                No incidents match the selected filter.
              </div>
            ) : (
              dashboardDisplayedIncidents.slice(0, 6).map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  resources={resources}
                  onAutoDispatch={onAutoDispatch}
                  onVerify={onVerify}
                  onFalseAlarm={onFalseAlarm}
                  onOpenOverride={onOpenOverride}
                  onViewPhoto={onViewPhoto}
                  onResetReputation={onResetReputation}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Dynamic Nearby Emergency Services & Safe Evacuation Shelters Grid */}
      <div style={{ marginTop: "20px" }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>📍 Nearby Emergency Services & Safe Evacuation Shelters</h3>
              <span>
                Live discovery for <b>{userLocationName}</b> ({userLat?.toFixed(4)}, {userLng?.toFixed(4)}) · Radius: 5 km
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {shelterLoading && (
                <span style={{ fontSize: "11px", color: "#3b82f6", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Searching POIs...
                </span>
              )}
              <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: "bold" }}>
                {emsCategoryFilter === "all"
                  ? `${emergencyServices.length + shelters.length} Total Facilities (within 5 km)`
                  : emsCategoryFilter === "ngo"
                  ? `${emergencyServices.filter((x) => x.category === "ngo").length + shelters.length} NGOs & Relief Centers (within 5 km)`
                  : `${filteredEmergencyServices.length} Units (within 5 km)`}
              </span>
            </div>
          </div>

          {/* Top 3 Nearest Units Highlight Row (Matches User Mobile Dashboard) */}
          <div style={{ padding: "14px 18px 6px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {/* Card 1: 🏥 Nearest Govt Hospital */}
            {closestHospital && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🏥</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "9px", fontWeight: "900", color: "#b91c1c", letterSpacing: "0.5px" }}>NEAREST GOVT HOSPITAL</div>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{closestHospital.name}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                      ⚡ {closestHospital.distanceKm} km away · ~{Math.max(2, Math.round(Number(closestHospital.distanceKm || 1) * 4))} min ETA
                    </div>
                  </div>
                </div>
                {(closestHospital.navigateUrl || closestHospital.mapsUrl || (closestHospital.lat && closestHospital.lng)) && (
                  <a
                    href={closestHospital.navigateUrl || closestHospital.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${closestHospital.lat},${closestHospital.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ background: "#dc2626", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Directions ↗
                  </a>
                )}
              </div>
            )}

            {/* Card 2: 🤝 Nearest NGO */}
            {closestNgo && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🤝</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "9px", fontWeight: "900", color: "#15803d", letterSpacing: "0.5px" }}>NEAREST NGO / SHELTER</div>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{closestNgo.name}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                      ⚡ {closestNgo.distance_km ?? closestNgo.distanceKm} km away · ~{closestNgo.eta_minutes ?? Math.max(2, Math.round(Number(closestNgo.distance_km || closestNgo.distanceKm || 1) * 5))} min ETA
                    </div>
                  </div>
                </div>
                {(closestNgo.maps_url || closestNgo.mapsUrl || (closestNgo.lat && closestNgo.lng) || (closestNgo.latitude && closestNgo.longitude)) && (
                  <a
                    href={closestNgo.maps_url || closestNgo.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${closestNgo.latitude || closestNgo.lat},${closestNgo.longitude || closestNgo.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ background: "#16a34a", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Directions ↗
                  </a>
                )}
              </div>
            )}

            {/* Card 3: 🏛️ Nearest Govt / Fire / Police */}
            {closestGov && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    {closestGov.category === "fire" ? "🚒" : closestGov.category === "police" ? "👮" : "🏛️"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "9px", fontWeight: "900", color: "#b45309", letterSpacing: "0.5px" }}>NEAREST RESCUE / GOVT BASE</div>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{closestGov.name}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                      ⚡ {closestGov.distanceKm} km away · ~{Math.max(2, Math.round(Number(closestGov.distanceKm || 1) * 4))} min ETA
                    </div>
                  </div>
                </div>
                {(closestGov.navigateUrl || closestGov.mapsUrl || (closestGov.lat && closestGov.lng)) && (
                  <a
                    href={closestGov.navigateUrl || closestGov.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${closestGov.lat},${closestGov.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ background: "#d97706", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Directions ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Category Filter Pills (4 Requested Categories + All) */}
          <div style={{ padding: "8px 18px 4px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {[
              { id: "all", label: "All Units (within 5 km)", count: emergencyServices.length + shelters.length },
              { id: "medical", label: "🏥 Hospitals & ICUs", count: emergencyServices.filter((x) => x.category === "medical").length },
              { id: "fire", label: "🚒 Fire & Water Rescue", count: emergencyServices.filter((x) => x.category === "fire").length },
              { id: "police", label: "👮 Police & Security", count: emergencyServices.filter((x) => x.category === "police").length },
              { id: "ngo", label: "⛺ NGOs & Relief Centers", count: emergencyServices.filter((x) => x.category === "ngo").length + shelters.length }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setEmsCategoryFilter(cat.id)}
                style={{
                  border: "1px solid",
                  borderColor: emsCategoryFilter === cat.id ? "#2563eb" : "#cbd5e1",
                  background: emsCategoryFilter === cat.id ? "#2563eb" : "#fff",
                  color: emsCategoryFilter === cat.id ? "#fff" : "#475569",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease"
                }}
              >
                <span>{cat.label}</span>
                <span
                  style={{
                    background: emsCategoryFilter === cat.id ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                    color: emsCategoryFilter === cat.id ? "#fff" : "#64748b",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontSize: "10px"
                  }}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          <div className="resource-grid">
            {/* 1. Emergency Medical, Fire, Police, NGO Services */}
            {filteredEmergencyServices.map((ems) => (
              <div
                className="resource-card"
                key={ems.id}
                style={{
                  borderLeft: `4px solid ${
                    ems.category === "medical"
                      ? "#ef4444"
                      : ems.category === "fire"
                      ? "#f97316"
                      : ems.category === "police"
                      ? "#3b82f6"
                      : "#10b981"
                  }`
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "24px" }}>{ems.icon}</span>
                    <div>
                      <b style={{ fontSize: "13px", color: "#0f172a" }}>{ems.name}</b>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>{ems.station} · {ems.subType || ems.type}</div>
                    </div>
                  </div>
                  <span className="status-badge" style={{ background: "#eff6ff", color: "#2563eb", fontWeight: "800", fontSize: "10px" }}>
                    {ems.distanceKm} km away
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px", alignItems: "center" }}>
                  <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "9px", fontWeight: "700", padding: "2px 7px", borderRadius: "5px" }}>
                    🏷️ {ems.group || ems.subType}
                  </span>
                  {ems.source === "Google Maps" ? (
                    <span style={{ background: "#eff6ff", color: "#2563eb", fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "5px" }}>
                      📍 Google Maps
                    </span>
                  ) : (
                    <span style={{ background: "#ecfdf5", color: "#047857", fontSize: "9px", fontWeight: "800", padding: "2px 7px", borderRadius: "5px" }}>
                      ✓ Verified Civic Hub
                    </span>
                  )}
                  {ems.rating && (
                    <span style={{ background: "#fef3c7", color: "#b45309", fontSize: "9px", fontWeight: "800", padding: "2px 6px", borderRadius: "5px" }}>
                      ⭐ {ems.rating} ({ems.userRatingsTotal || 0})
                    </span>
                  )}
                </div>

                <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#334155", flexWrap: "wrap", gap: "8px" }}>
                  <span><b>Helpline:</b> {ems.phone}</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ color: "#16a34a", fontWeight: "700" }}>● {ems.status || "Active 24/7"}</span>
                    {(ems.navigateUrl || ems.mapsUrl || (ems.lat && ems.lng)) && (
                      <a
                        href={ems.navigateUrl || ems.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${ems.lat},${ems.lng}&travelmode=driving`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                          color: "#fff",
                          padding: "5px 11px",
                          borderRadius: "7px",
                          fontWeight: "800",
                          textDecoration: "none",
                          fontSize: "11px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          boxShadow: "0 2px 6px rgba(37,99,235,0.25)"
                        }}
                      >
                        🗺️ Navigate in Google Maps ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State when no units match */}
            {filteredEmergencyServices.length === 0 && emsCategoryFilter !== "all" && emsCategoryFilter !== "ngo" && (
              <div style={{ gridColumn: "1 / -1", padding: "32px 20px", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
                <div style={{ fontSize: "28px", marginBottom: "4px" }}>🔍</div>
                <b style={{ color: "#334155", fontSize: "13px" }}>No Units Discovered in this Category within 5 km</b>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  No facilities found matching this category within 5 km of <b>{userLocationName}</b>.
                </div>
              </div>
            )}

            {/* 2. Evacuation Shelters & Relief Centers (Shown ONLY for All Units or NGOs & Relief Centers) */}
            {(emsCategoryFilter === "all" || emsCategoryFilter === "ngo") && (
              <>
                {shelterLoading ? (
                  <div style={{ gridColumn: "1 / -1", padding: "32px 20px", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #93c5fd" }}>
                    <Loader2 size={28} color="#2563eb" style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                    <b style={{ color: "#1e293b", fontSize: "13px" }}>Discovering Safe Evacuation Shelters & Relief Hubs...</b>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      Querying OpenStreetMap Nominatim and Overpass POI servers for civic centers, colleges, halls, stadiums & relief camps within 10 km of {userLocationName}...
                    </div>
                  </div>
                ) : shelterStatus === "invalid" ? (
                  <div style={{ gridColumn: "1 / -1", padding: "24px", textAlign: "center", background: "#fef2f2", borderRadius: "10px", border: "1px solid #fecaca" }}>
                    <AlertTriangle size={28} color="#dc2626" style={{ margin: "0 auto 6px" }} />
                    <b style={{ color: "#991b1b" }}>Invalid Location</b>
                    <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px" }}>
                      Coordinates ({userLat.toFixed(3)}, {userLng.toFixed(3)}) are outside valid service zones.
                    </div>
                  </div>
                ) : shelterStatus === "error" ? (
                  <div style={{ gridColumn: "1 / -1", padding: "24px", textAlign: "center", background: "#fef2f2", borderRadius: "10px", border: "1px solid #fecaca" }}>
                    <AlertTriangle size={28} color="#dc2626" style={{ margin: "0 auto 6px" }} />
                    <b style={{ color: "#991b1b" }}>Unable to Fetch Shelters</b>
                    <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px" }}>
                      {shelterError || "Failed to load shelter data from backend."}
                    </div>
                    {onRetryShelters && (
                      <button
                        onClick={onRetryShelters}
                        className="primary small"
                        style={{ marginTop: "10px" }}
                      >
                        <RefreshCw size={12} /> Retry Shelter Discovery
                      </button>
                    )}
                  </div>
                ) : shelterStatus === "offline" ? (
                  <div style={{ gridColumn: "1 / -1", padding: "24px", textAlign: "center", background: "#f1f5f9", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                    <WifiOff size={28} color="#64748b" style={{ margin: "0 auto 6px" }} />
                    <b style={{ color: "#334155" }}>Offline Mode</b>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      Internet connection unavailable. Reconnect to load live evacuation shelters.
                    </div>
                  </div>
                ) : shelters.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", padding: "28px", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
                    <div style={{ fontSize: "28px", marginBottom: "4px" }}>🏕️</div>
                    <b style={{ color: "#334155", fontSize: "13px" }}>No Shelters Discovered within 10 km</b>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      No verified public evacuation centers or civic refuge spaces found for <b>{userLocationName}</b>. Try searching an adjacent area or market hub above.
                    </div>
                  </div>
                ) : (
                  shelters.map((sh) => {
                    const isSelected = selectedShelter && selectedShelter.id === sh.id;
                    const isVerified = Boolean(sh.is_verified || sh.isVerified);
                    const shMapsUrl = sh.maps_url || sh.mapsUrl || ((sh.latitude || sh.lat) && (sh.longitude || sh.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${sh.latitude || sh.lat},${sh.longitude || sh.lng}&travelmode=driving` : null);
                    return (
                      <div
                        className="resource-card"
                        key={sh.id}
                        style={{
                          borderLeft: `4px solid ${isSelected ? "#e11d48" : isVerified ? "#16a34a" : "#0284c7"}`,
                          background: isSelected ? "#fff1f2" : "#fff"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <span style={{ fontSize: "24px" }}>{sh.icon || "🏕️"}</span>
                            <div>
                              <b style={{ fontSize: "13px", color: isSelected ? "#9f1239" : "#0f172a" }}>{sh.name}</b>
                              <div style={{ display: "flex", gap: "4px", marginTop: "2px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "9px", background: "#f1f5f9", color: "#475569", padding: "1px 5px", borderRadius: "4px", fontWeight: "600" }}>
                                  🏷️ {sh.type || sh.shelterType || "Relief Center"}
                                </span>
                                <span style={{ fontSize: "9px", background: isVerified ? "#dcfce7" : "#e0f2fe", color: isVerified ? "#15803d" : "#0369a1", padding: "1px 5px", borderRadius: "4px", fontWeight: "700" }}>
                                  {isVerified ? "✓ Verified Shelter" : `Discovered (${sh.provider || "OSM"})`}
                                </span>
                              </div>
                              {sh.agency && <div style={{ fontSize: "10px", color: "#0284c7", fontWeight: "600", marginTop: "2px" }}>🤝 Assigned: {sh.agency}</div>}
                              <div style={{ fontSize: "10px", color: "#64748b" }}>{sh.address}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className="status-badge" style={{ background: isSelected ? "#ffe4e6" : isVerified ? "#ecfdf5" : "#eff6ff", color: isSelected ? "#e11d48" : isVerified ? "#16a34a" : "#0284c7", fontWeight: "800", fontSize: "10px" }}>
                              {sh.distance_km ?? sh.distanceKm} km away
                            </span>
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", fontWeight: "600" }}>
                              ~{sh.eta_minutes ?? sh.etaMin ?? 5} min ETA
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#334155" }}>
                          <span><b>Capacity:</b> {sh.capacity} ({sh.currentOccupancy || 0} occupied)</span>
                          <span style={{ color: "#16a34a", fontWeight: "700" }}>● {sh.status || "Safe / Open"}</span>
                        </div>
                        <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                          {sh.phone || sh.contact ? (
                            <span style={{ fontSize: "10px", color: "#2563eb", fontWeight: "700" }}>
                              📞 Helpline: {sh.phone || sh.contact}
                            </span>
                          ) : <span />}
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => {
                                if (onSelectShelter) onSelectShelter(sh);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              style={{
                                background: isSelected ? "#059669" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                                color: "#fff",
                                border: "none",
                                padding: "5px 10px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "800",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                boxShadow: "0 2px 6px rgba(37,99,235,0.25)"
                              }}
                            >
                              {isSelected ? "✓ Active Evacuation Route" : "🛣️ View Safest Route"}
                            </button>
                            {shMapsUrl && (
                              <a
                                href={shMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: "11px",
                                  color: "#2563eb",
                                  fontWeight: "800",
                                  textDecoration: "none",
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  padding: "5px 10px",
                                  borderRadius: "6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  boxShadow: "0 1px 3px rgba(37,99,235,0.15)"
                                }}
                              >
                                🗺️ Navigate in Google Maps ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Resource Availability Tracker Grid */}
      <div style={{ marginTop: "20px" }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Resource Availability Tracker</h3>
              <span>Real-time response team status derived from active dispatches</span>
            </div>
            <NavLink to="/resources" className="link">
              Manage Teams <ChevronRight size={14} />
            </NavLink>
          </div>
          {resources.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", background: "rgba(15, 23, 42, 0.4)", borderRadius: "12px", border: "1px dashed rgba(148, 163, 184, 0.2)", margin: "14px" }}>
              <Layers3 size={28} style={{ color: "#60a5fa", margin: "0 auto 8px", display: "block" }} />
              <b style={{ color: "#f8fafc", fontSize: "14px" }}>No active emergency resources simulated</b>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "4px auto 14px", maxWidth: "420px" }}>
                Generate a dynamic resource simulation to populate nearby Fire Stations, Hospitals, NGOs, and municipal rescue teams.
              </p>
              <NavLink to="/resources" className="primary small" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} /> Open Resource Manager & Simulate
              </NavLink>
            </div>
          ) : (
            <div className="resource-grid">
              {resources.slice(0, 6).map((r) => (
                <ResourceCard key={r.id} team={r} userLat={userLat} userLng={userLng} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Chronic Blockage Tracker Grid */}
      <div style={{ marginTop: "20px" }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Chronic-Blockage Tracker</h3>
              <span>Recurring drainage hotspots identified from persistent ground evidence</span>
            </div>
            <button className="primary small" onClick={onGenerateReport}>
              <Download size={14} /> Generate Desilting Report
            </button>
          </div>
          <div className="chronic-grid">
            {chronicBlockages.map((b) => (
              <div className="chronic-card" key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <b style={{ fontSize: "13px", color: "#0f172a" }}>{b.name}</b>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>{b.ward} · Hotspot ID: {b.id}</div>
                  </div>
                  <span className="flag-count-pill">
                    <AlertCircle size={12} /> Flagged {b.flagCount} times
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#334155", background: "#f8fafc", padding: "8px", borderLeft: "3px solid #f97316", borderRadius: "4px" }}>
                  <b>Primary Cause:</b> {b.primaryCause}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b" }}>
                  <span>Severity: <b>{b.severityTrend}</b></span>
                  <span>Last Flagged: <b>{new Date(b.lastFlaggedAt).toLocaleDateString()}</b></span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// Helper to identify if an incident needs human intervention / manual review
export function isHumanInterventionNeeded(inc) {
  if (!inc) return false;
  if (inc.status === "False Alarm" || inc.status === "Completed" || inc.isQuarantined || inc.status === "Quarantined Spam") return false;
  if (inc.aiVerification) {
    if (inc.aiVerification.is_flooding === false) return true;
    const conf = inc.aiVerification.confidence_score ?? inc.aiVerification.confidence ?? 0;
    if (conf < 0.70) return true;
    if (inc.aiVerification.longest_consecutive_run != null && inc.aiVerification.longest_consecutive_run < 5) return true;
    return false;
  }
  if (inc.aiVerified === false || (inc.cvConfidence && inc.cvConfidence < 70)) {
    return true;
  }
  return false;
}

// Professional Minimal Incident & Emergency Response Card
function IncidentCard({ incident, resources = [], onAutoDispatch, onVerify, onFalseAlarm, onOpenOverride, onViewPhoto, onResetReputation }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const inc = incident;
  const isSos = Boolean(inc.isSos || inc.type === "SOS" || inc.status === "ACTIVE_SOS" || inc.causeCode === "SOS_EMERGENCY");
  const isDispatched = inc.status === "Dispatched";
  const isVerified = inc.status === "Verified";
  const isFalseAlarm = inc.status === "False Alarm";

  const causeCode = inc.causeCode || (inc.cause === "Blocked drain" ? "SUSPECTED_BLOCKED_DRAIN" : "RAINFALL_OVERLOAD");
  const hasVideo = Boolean((inc.videoUrl || inc.video) && inc.videoUrl !== "attached" && (inc.videoUrl?.startsWith("http") || inc.videoUrl?.startsWith("data:video") || inc.videoUrl?.startsWith("/uploads")));
  const hasPhoto = Boolean(inc.photoUrl && inc.photoUrl !== "attached" && (inc.photoUrl.startsWith("http") || inc.photoUrl.startsWith("data:image") || inc.photoUrl.startsWith("/uploads")));

  // Calculate nearest available emergency response resource
  const nearestResource = inc.nearestResource || ((inc.lat && inc.lng && Array.isArray(resources) && resources.length > 0)
    ? [...resources]
        .map((r) => ({ ...r, distKm: calcDistanceKm(inc.lat, inc.lng, r.lat, r.lng) }))
        .filter((r) => r.distKm != null)
        .sort((a, b) => (a.distKm ?? a.distanceKm) - (b.distKm ?? b.distanceKm))[0]
    : null);

  const repCount = inc.reporter_count || (Array.isArray(inc.reports) ? inc.reports.length : (inc.reports_length || 1));
  const nearestDist = (nearestResource?.distKm ?? nearestResource?.distanceKm ?? 0.8);
  const nearestEta = Math.max(2, Math.round(Number(nearestDist) * 4));

  const borderLeftColor = isSos
    ? "#dc2626"
    : isDispatched
    ? "#2563eb"
    : isVerified
    ? "#16a34a"
    : isFalseAlarm
    ? "#94a3b8"
    : "#f59e0b";

  return (
    <div
      className="incident-card"
      style={{
        borderLeft: `4px solid ${borderLeftColor}`,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderLeftWidth: "4px",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "12px",
        boxShadow: isSos ? "0 2px 8px rgba(220, 38, 38, 0.07)" : "0 1px 3px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}
    >
      {/* 1. Header: Status / SOS, Incident ID, Timestamp, Risk */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isSos ? (
            <span style={{
              background: "#dc2626",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "800",
              padding: "3px 8px",
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              letterSpacing: "0.4px"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff", display: "inline-block" }} />
              ACTIVE SOS {repCount > 1 ? `(${repCount})` : ""}
            </span>
          ) : (
            <span style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              fontSize: "10px",
              fontWeight: "700",
              padding: "3px 8px",
              borderRadius: "6px",
              textTransform: "uppercase"
            }}>
              {inc.type || "FLOOD REPORT"}
            </span>
          )}

          <NavLink
            to={`/incidents/${inc.id}`}
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              fontWeight: "700",
              color: "#475569",
              textDecoration: "none",
              background: "#f1f5f9",
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid #e2e8f0"
            }}
            title="Incident details"
          >
            #{inc.id}
          </NavLink>

          {/* Show non-redundant status badge */}
          {!isSos && inc.status && (
            <span className={`status ${inc.status?.toLowerCase().replace(" ", "-")}`} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px" }}>
              {inc.status}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "500" }}>
            {inc.time || "Just now"}
          </span>
          {!isSos && <RiskBadge score={inc.severity || 50} />}
        </div>
      </div>

      {/* 2. Citizen / Distress Title */}
      <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {isSos ? (
          <span>Citizen Distress: <span style={{ color: "#b91c1c" }}>{inc.reporter || "Anonymous Citizen"}</span></span>
        ) : (
          <span>{inc.reporter || "Citizen Report"}</span>
        )}
        {inc.role && (
          <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>
            ({inc.role})
          </span>
        )}
      </div>

      {/* 3. Location */}
      <div style={{ fontSize: "13px", color: "#334155", fontWeight: "500", display: "flex", alignItems: "center", gap: "5px" }}>
        <MapPin size={13} style={{ color: "#2563eb", flexShrink: 0 }} />
        <span>{inc.address || "Live Area, Ward 73"}</span>
      </div>

      {/* 4. Emergency Type & Key Metrics */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "11px" }}>
        <span style={{ background: "#f8fafc", color: "#334155", padding: "3px 8px", borderRadius: "6px", fontWeight: "600", border: "1px solid #e2e8f0" }}>
          {inc.cause || "Drainage Flooding"}
        </span>

        {inc.waterLevel != null && (
          <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 8px", borderRadius: "6px", fontWeight: "700", border: "1px solid #bfdbfe" }}>
            Depth: {inc.waterLevel} cm
          </span>
        )}

        {inc.aiVerification?.is_flooding && (
          <span style={{ background: "#f0fdf4", color: "#166534", padding: "3px 8px", borderRadius: "6px", fontWeight: "700", border: "1px solid #bbf7d0", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={11} /> AI Verified ({inc.aiVerification?.confidence ? `${Math.round(inc.aiVerification.confidence * 100)}%` : "High"})
          </span>
        )}
      </div>

      {/* 5. Nearest Response Unit & ETA */}
      {nearestResource && (
        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <Truck size={13} style={{ color: "#2563eb", flexShrink: 0 }} />
            <span style={{ color: "#64748b", fontSize: "11px" }}>Nearest Unit:</span>
            <b style={{ color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {nearestResource.name}
            </b>
          </div>
          <span style={{
            color: "#166534",
            fontWeight: "700",
            fontSize: "11px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "2px 7px",
            borderRadius: "5px",
            flexShrink: 0
          }}>
            ~{nearestEta} min ETA ({nearestDist.toFixed(1)} km)
          </span>
        </div>
      )}

      {/* 6. Primary Action Buttons */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginTop: "2px" }}>
        {!isDispatched && !isFalseAlarm && (
          <button
            className="primary small"
            onClick={() => onAutoDispatch(inc)}
            style={{ fontSize: "11px", padding: "6px 12px", borderRadius: "6px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Zap size={12} /> Dispatch Unit
          </button>
        )}

        {(inc.lat && inc.lng) ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${inc.lat},${inc.lng}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            style={{
              textDecoration: "none",
              background: "#ffffff",
              color: "#1e293b",
              padding: "5px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              border: "1px solid #cbd5e1"
            }}
          >
            <Navigation size={11} style={{ color: "#2563eb" }} /> Track
          </a>
        ) : null}

        {!isVerified && !isDispatched && !isFalseAlarm && (
          <button
            className="ghost small"
            onClick={() => onVerify(inc.id)}
            style={{ fontSize: "11px", padding: "5px 10px", color: "#16a34a", borderColor: "#bbf7d0", background: "#f0fdf4" }}
          >
            <CheckCircle2 size={12} /> Resolve
          </button>
        )}

        {!isFalseAlarm && !isDispatched && (
          <button
            className="ghost small"
            onClick={() => onFalseAlarm(inc.id)}
            style={{ fontSize: "11px", padding: "5px 8px", color: "#991b1b", borderColor: "#fecaca" }}
            title="Mark as false alarm"
          >
            <X size={12} /> False Alarm
          </button>
        )}

        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          style={{
            background: "transparent",
            border: "none",
            color: "#64748b",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            padding: "4px"
          }}
        >
          {detailsOpen ? "Hide Details ▲" : "Details ▼"}
        </button>
      </div>

      {/* Collapsible Details: Evidence, Telemetry & Sensor Breakdown */}
      {detailsOpen && (
        <div style={{ marginTop: "6px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", fontSize: "11px", color: "#475569" }}>
          {inc.note && (
            <p style={{ margin: "0 0 8px", fontStyle: "italic", color: "#334155" }}>"{inc.note}"</p>
          )}

          {/* Video or Photo Evidence */}
          {hasVideo && (
            <div style={{ marginBottom: "8px", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
              <video src={inc.videoUrl} controls style={{ width: "100%", maxHeight: "160px", background: "#000" }} />
            </div>
          )}
          {hasPhoto && !hasVideo && (
            <div style={{ marginBottom: "8px", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1", cursor: "pointer" }} onClick={() => onViewPhoto && onViewPhoto(inc.photoUrl, inc, false)}>
              <img src={inc.photoUrl} alt="Evidence" style={{ width: "100%", maxHeight: "140px", objectFit: "cover", display: "block" }} />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "10px", flexWrap: "wrap", gap: "6px" }}>
            {inc.lat && inc.lng && <span>GPS: {Number(inc.lat).toFixed(4)}, {Number(inc.lng).toFixed(4)}</span>}
            {inc.cvConfidence && <span>CV Confidence: {inc.cvConfidence}%</span>}
          </div>

          <div style={{ marginTop: "8px", display: "flex", gap: "6px", alignItems: "center" }}>
            <button className="ghost small" onClick={() => onOpenOverride(inc)} style={{ fontSize: "10px" }}>
              <Sliders size={11} /> Override
            </button>
            <NavLink to={`/incidents/${inc.id}`} className="ghost small" style={{ fontSize: "10px", textDecoration: "none" }}>
              Full Profile ↗
            </NavLink>
            {(inc.isQuarantined || inc.status === "Quarantined Spam") && onResetReputation && (
              <button
                onClick={() => onResetReputation(inc.userPhone || inc.reporter)}
                style={{ background: "#9d174d", color: "#fff", border: "none", borderRadius: "4px", padding: "3px 6px", fontSize: "10px", cursor: "pointer" }}
              >
                Reset Trust
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Resource Card Component (Location-Aware Simulated Emergency Resource)
function ResourceCard({ team, userLat, userLng }) {
  const statusUpper = (team.status || "AVAILABLE").toUpperCase();
  const isAvailable = statusUpper === "AVAILABLE" || statusUpper === "READY";
  const isLimited = statusUpper === "LIMITED";
  const isEnRoute = statusUpper === "EN_ROUTE" || statusUpper === "EN ROUTE";
  const isDispatched = statusUpper === "DISPATCHED" || statusUpper === "ALLOCATED";
  const isDeployed = statusUpper === "DEPLOYED" || statusUpper === "ON-SITE";

  let statusClass = "available";
  if (isLimited) statusClass = "limited";
  else if (isEnRoute) statusClass = "en-route";
  else if (isDispatched) statusClass = "dispatched";
  else if (isDeployed) statusClass = "on-site";

  const category = (team.category || team.resource_type || "RESCUE").toUpperCase();
  const categoryLower = category.toLowerCase();
  
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "RESCUE": return "🚒";
      case "MEDICAL": return "🚑";
      case "FOOD": return "🍱";
      case "WATER": return "💧";
      case "SHELTER": return "🛏️";
      default: return "📦";
    }
  };

  const lat = team.latitude ?? team.lat;
  const lng = team.longitude ?? team.lng;
  const dist = (userLat && userLng && lat && lng) ? calcDistanceKm(userLat, userLng, lat, lng) : null;
  const mapLink = (lat && lng) ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;

  return (
    <div className="resource-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0 }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0
          }}>
            {team.emoji || getCategoryIcon(category)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <b style={{ fontSize: "14px", color: "#0f172a", wordBreak: "break-word" }}>{team.name}</b>
              <span className={`resource-badge-category ${categoryLower}`}>{category}</span>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
              <Building2 size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {team.agency || team.station || "Disaster Relief Facility"}
              </span>
            </div>
          </div>
        </div>
        <span className={`resource-status-pill ${statusClass}`}>{team.status}</span>
      </div>

      {/* Quantity & Capacity Display */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div>
          <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>Available Quantity</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>
            {team.quantity != null ? `${team.quantity} ${team.unit || "Units"}` : (team.capacity || "Operational")}
          </div>
        </div>
        {team.simulation_id && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "10px", fontFamily: "ui-monospace, monospace", color: "#64748b", background: "#ffffff", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>
              {team.simulation_id}
            </span>
          </div>
        )}
      </div>

      {/* Equipment / Specs */}
      {team.capacity && team.quantity != null && (
        <div style={{ fontSize: "12px", color: "#475569" }}>
          <b style={{ color: "#1e293b" }}>Capacity:</b> {team.capacity}
        </div>
      )}

      {/* Real Geographic Base Location & Maps Link */}
      <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <MapPin size={13} style={{ color: "#2563eb", flexShrink: 0 }} />
            <span style={{ color: "#1e293b", fontWeight: "500" }}>{team.base_location || team.address || team.station || "Real Facility"}</span>
          </div>
          {mapLink && (
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", fontWeight: "600", textDecoration: "none", flexShrink: 0 }}
              title="Open real coordinates in Google Maps"
            >
              Maps <ExternalLink size={11} />
            </a>
          )}
        </div>
        {dist != null && (
          <div style={{ fontSize: "11px", color: "#64748b", paddingLeft: "18px" }}>
            📍 {dist} km from active operational center
          </div>
        )}
      </div>

      {/* Dispatch / Tasking Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
        <span>Contact: <b style={{ color: "#334155" }}>{team.phone || "Command Radio"}</b></span>
        {team.currentIncidentId ? (
          <span style={{ color: "#2563eb", fontWeight: "700" }}>Incident: {team.currentIncidentId}</span>
        ) : (
          <span style={{ color: "#16a34a", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            ● Ready for Tasking
          </span>
        )}
      </div>
    </div>
  );
}

// Admin Manual Override Modal
function OverrideModal({ incident, resources = [], onClose, onSubmit }) {
  const sortedResources = [...resources].map((r) => {
    const distKm = (incident?.lat && incident?.lng && r.lat && r.lng)
      ? calcDistanceKm(incident.lat, incident.lng, r.lat, r.lng)
      : null;
    return { ...r, distKm };
  }).sort((a, b) => {
    if (a.distKm == null) return 1;
    if (b.distKm == null) return -1;
    return a.distKm - b.distKm;
  });

  const [targetTeam, setTargetTeam] = useState(sortedResources[0]?.name || resources[0]?.name || "High-Volume Dewatering Pump Unit");
  const [rationale, setRationale] = useState("Command center force reassignment to closest squad");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Admin Manual Override: {incident.id}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: "11px", color: "#475569" }}>
            Reassign or force dispatch a specific municipal response team for <b>{incident.id}</b> ({incident.address}).
          </div>
          <label style={{ display: "grid", gap: "6px", fontSize: "11px", fontWeight: "bold" }}>
            Select Response Team (Sorted by Proximity to Incident)
            <select
              value={targetTeam}
              onChange={(e) => setTargetTeam(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              {sortedResources.map((r, idx) => (
                <option key={r.id} value={r.name}>
                  {idx === 0 && r.distKm != null ? `⚡ [Nearest: ${r.distKm} km] ` : r.distKm != null ? `[${r.distKm} km] ` : ""}{r.name} ({r.status})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "6px", fontSize: "11px", fontWeight: "bold" }}>
            Override Rationale / Commander Directives
            <input
              type="text"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </label>
        </div>
        <div className="modal-footer">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={() => onSubmit(incident.id, targetTeam, rationale)}>
            <Sliders size={14} /> Execute Override
          </button>
        </div>
      </div>
    </div>
  );
}

// Risk Map Page with Hyperlocal Search & Shelters
function RiskMap({
  zones,
  incidents,
  resources,
  shelters = [],
  shelterLoading = false,
  shelterError = null,
  shelterStatus = "idle",
  selectedShelter = null,
  activeRoute = null,
  loadingRoute = false,
  onSelectShelter,
  onClearRoute,
  userLat = 19.132,
  userLng = 72.848,
  userLocationName = "Andheri West",
  locationMode = "gps",
  locationStatus = "idle",
  onSelectLocation,
  onManualSearch,
  onSelectPresetHub,
  onDetectGps,
  notify,
  onAutoDispatch,
  onVerify,
  onResolve,
  onFalseAlarm,
  onOpenOverride
}) {
  const navigate = useNavigate();
  const [showHistoricalIncidents, setShowHistoricalIncidents] = useState(false);

  return (
    <div className="content">
      <PageHeader
        eyebrow="GEO-INTELLIGENCE · REAL OPENSTREETMAP & RADAR"
        title="Live Street-Level Flood Risk Map"
        sub="Explore real geographic flood zones, Open-Meteo precipitation overlays, and live response vehicle tracking."
      >
        <button
          onClick={() => setShowHistoricalIncidents(!showHistoricalIncidents)}
          style={{
            padding: "6px 12px",
            background: showHistoricalIncidents ? "#16a34a" : "#0f172a",
            color: "#fff",
            border: "1px solid #334155",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Clock size={13} />
          {showHistoricalIncidents ? "Hide Historical Incidents" : "Show Historical / Resolved Incidents"}
        </button>
      </PageHeader>

      {/* Location Search Bar */}
      <LocationSearchBar
        userLat={userLat}
        userLng={userLng}
        userLocationName={userLocationName}
        locationMode={locationMode}
        locationStatus={locationStatus}
        shelterLoading={shelterLoading}
        shelterCount={shelters.length}
        emergencyCount={resources.length}
        onDetectGps={onDetectGps}
        onSelectLocation={onSelectLocation}
        onManualSearch={onManualSearch}
        onSelectPresetHub={onSelectPresetHub}
      />

      <div className="map-layout">
        <section className="panel full-map">
          <div style={{ height: "620px", position: "relative" }}>
            <LeafletMap
              zones={zones}
              incidents={incidents}
              resources={resources}
              shelters={shelters}
              selectedShelter={selectedShelter}
              activeRoute={activeRoute}
              center={[userLat, userLng]}
              userLocation={[userLat, userLng]}
              userLocationName={userLocationName}
              height="620px"
              zoom={14}
              onSelectShelter={onSelectShelter}
              onClearRoute={onClearRoute}
              onAutoDispatch={onAutoDispatch}
              onVerify={onVerify}
              onResolve={onResolve}
              onFalseAlarm={onFalseAlarm}
              onNavigateIncident={(id) => navigate(`/incidents/${id}`)}
              onNavigateZone={(zId) => navigate(`/zones/${zId}`)}
              showHistoricalIncidents={showHistoricalIncidents}
            />
          </div>
          <div className="map-legend">
            <div className="map-legend-items" style={{ flexWrap: "wrap", gap: "8px" }}>
              <span className="legend-pill red" title="Unresolved active emergency SOS"><span className="legend-dot red"></span>🔴 Active SOS / New</span>
              <span className="legend-pill orange" title="Field verified incident"><span className="legend-dot orange"></span>🟠 Verified</span>
              <span className="legend-pill" style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #7dd3fc" }} title="Response team allocated"><span className="legend-dot" style={{ background: "#0284c7" }}></span>🔵 Resource Allocated</span>
              <span className="legend-pill" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #93c5fd" }} title="Dispatched and traveling to site"><span className="legend-dot" style={{ background: "#2563eb" }}></span>🚑 En Route</span>
              <span className="legend-pill green" title="Operational unit on scene"><span className="legend-dot green"></span>📍 Reached Site</span>
              {showHistoricalIncidents && (
                <span className="legend-pill" style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }} title="Mitigated and closed incident"><span className="legend-dot" style={{ background: "#16a34a" }}></span>🟢 Resolved</span>
              )}
            </div>
            <span className="map-note">🛡️ Click any risk zone or incident marker to inspect sector intelligence</span>
          </div>
        </section>
        <section className="panel zone-list">
          <div className="panel-head">
            <div>
              <h3>Risk Zones</h3>
              <span>Live calculations · Click to inspect</span>
            </div>
          </div>
          {[...zones]
            .sort((a, b) => b.risk - a.risk)
            .map((z) => (
              <div
                className="zone-item"
                key={z.id}
                onClick={() => navigate(`/zones/${z.id}`)}
                style={{ cursor: "pointer" }}
                title={`Open details for ${z.name}`}
              >
                <div className={`zone-dot ${z.risk >= 75 ? "red" : z.risk >= 45 ? "orange" : "green"}`}></div>
                <div style={{ flex: 1 }}>
                  <b>{z.name}</b>
                  <span>{z.ward} · {z.reports} reports · {z.rainfall}mm rain</span>
                </div>
                <RiskBadge score={z.risk} />
                <ChevronRight size={14} color="#94a3b8" />
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}

// Media Lightbox Modal (Supports both Photo and Video Evidence)
function MediaLightboxModal({ mediaUrl, incident, isVideo, onClose }) {
  if (!mediaUrl) return null;
  const isVid = isVideo || mediaUrl.includes(".mp4") || mediaUrl.includes("video") || mediaUrl.startsWith("data:video");
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "750px", padding: "16px" }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: "15px" }}>
              {isVid ? "🎥 Citizen Video Evidence" : "📸 Citizen Ground Photo Evidence"} · {incident?.id || "Incident"}
            </h3>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Reported by <b>{incident?.reporter || "Citizen"} ({incident?.role || "Resident"})</b> · {incident?.address}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ textAlign: "center", padding: "12px 0" }}>
          {isVid ? (
            <video
              src={mediaUrl?.startsWith("/") ? `${API.replace(/\/api\/?$/, "")}${mediaUrl}` : mediaUrl}
              controls
              playsInline
              autoPlay
              style={{ width: "100%", maxHeight: "65vh", borderRadius: "8px", border: "1px solid #334155", background: "#000" }}
              onError={(e) => {
                if (e.target.src !== "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4") {
                  e.target.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
                  e.target.load();
                }
              }}
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Ground Truth Evidence"
              style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "8px", border: "1px solid #334155", background: "#0b1329" }}
            />
          )}
          <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#475569", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px" }}>
            <span>🌊 Reported Water Depth: <b>{incident?.waterLevel || 0} cm</b> · Drain: <b>{incident?.drainObservation || "Unsure"}</b></span>
            <div style={{ display: "flex", gap: "10px" }}>
              {incident?.lat && incident?.lng && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${incident.lat},${incident.lng}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#16a34a", fontWeight: "700", textDecoration: "none" }}
                >
                  🗺️ Track on Google Maps ↗
                </a>
              )}
              <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: "700", textDecoration: "none" }}>
                Open Full File ↗
              </a>
            </div>
          </div>

          {incident?.aiVerification && (
            <div style={{ marginTop: "8px", background: incident.aiVerification.is_flooding ? "#f0fdf4" : "#fef2f2", border: `1px solid ${incident.aiVerification.is_flooding ? "#86efac" : "#fecaca"}`, borderRadius: "6px", padding: "8px 12px", textAlign: "left", fontSize: "11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "800", color: incident.aiVerification.is_flooding ? "#166534" : "#991b1b" }}>
                <span>🤖 Authority AI Vision Verification: {incident.aiVerification.is_flooding ? "🌊 Sustained Flooding Confirmed" : "✓ No Flooding Signal Detected"}</span>
                <span>Confidence: {((incident.aiVerification.confidence_score || incident.aiVerification.confidence || 0) * 100).toFixed(1)}%</span>
              </div>
              {Boolean(incident.aiVerification.frames_analyzed) && (
                <div style={{ marginTop: "4px", fontSize: "10px", color: "#334155", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span>Frames Analyzed: <b>{incident.aiVerification.frames_analyzed}</b></span>
                  <span>Longest Flood Run: <b>{incident.aiVerification.longest_consecutive_run || 0} frames</b></span>
                  <span>Flood Ratio: <b>{((incident.aiVerification.flood_ratio || 0) * 100).toFixed(1)}%</b></span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="primary" onClick={onClose}>Close Preview</button>
        </div>
      </div>
    </div>
  );
}

// Dedicated Incident Management Page
function Incidents({ incidents, resources = [], notify, onReload, onAutoDispatch, onVerify, onFalseAlarm, onOpenOverride, onViewPhoto, onResetReputation }) {
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (onReload) onReload();
  }, []);

  // Strict timestamp sorting: newest incidents first
  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(b.userTimestamp || b.updatedAt || b.createdAt || b.time || 0) - new Date(a.userTimestamp || a.updatedAt || a.createdAt || a.time || 0)
  );

  const activeIncidents = sortedIncidents.filter((i) => !i.isQuarantined && i.status !== "Quarantined Spam");
  const quarantinedCount = sortedIncidents.filter((i) => i.isQuarantined || i.status === "Quarantined Spam").length;
  const humanInterventionCount = activeIncidents.filter((i) => isHumanInterventionNeeded(i)).length;
  const aiVerifiedCount = activeIncidents.filter((i) => i.aiVerification?.is_flooding === true || i.aiVerified).length;

  const filtered = filter === "All"
    ? activeIncidents
    : filter === "ReviewNeeded"
    ? activeIncidents.filter((i) => isHumanInterventionNeeded(i))
    : filter === "AiConfirmed"
    ? activeIncidents.filter((i) => i.aiVerification?.is_flooding === true || i.aiVerified)
    : filter === "Quarantined"
    ? sortedIncidents.filter((i) => i.isQuarantined || i.status === "Quarantined Spam")
    : activeIncidents.filter((i) => i.role === filter || i.status === filter);

  return (
    <div className="content">
      <PageHeader
        eyebrow="GROUND TRUTH · PERSISTENT DATABASE & AI CONFIDENCE"
        title="Citizen Incident Queue & Deduplication"
        sub="Live verified evidence submitted from mobile devices with AI flood telemetry, frame-by-frame diagnostics, and human intervention review filters."
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="segmented">
            <button className={filter === "All" ? "selected" : ""} onClick={() => setFilter("All")}>
              All ({activeIncidents.length})
            </button>
            <button
              className={filter === "ReviewNeeded" ? "selected" : ""}
              onClick={() => setFilter("ReviewNeeded")}
              style={{ color: filter === "ReviewNeeded" ? undefined : "#c2410c", fontWeight: "700" }}
            >
              ⚠️ Human Review Needed ({humanInterventionCount})
            </button>
            <button
              className={filter === "AiConfirmed" ? "selected" : ""}
              onClick={() => setFilter("AiConfirmed")}
              style={{ color: filter === "AiConfirmed" ? undefined : "#16a34a", fontWeight: "700" }}
            >
              🌊 AI Verified ({aiVerifiedCount})
            </button>
            {["Received", "Verified", "Dispatched", "False Alarm"].map((x) => (
              <button className={filter === x ? "selected" : ""} onClick={() => setFilter(x)} key={x}>
                {x}
              </button>
            ))}
            <button
              className={filter === "Quarantined" ? "selected" : ""}
              onClick={() => setFilter("Quarantined")}
              style={{ color: filter === "Quarantined" ? undefined : "#9d174d", fontWeight: "700" }}
            >
              🚫 Quarantined Spam ({quarantinedCount})
            </button>
          </div>
          <button
            onClick={() => {
              if (onReload) onReload();
              if (notify) notify("Incident feed refreshed from live database.");
            }}
            style={{
              padding: "6px 12px",
              background: "#0f172a",
              color: "#38bdf8",
              border: "1px solid #1e293b",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </PageHeader>
      <div className="incident-feed-list" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", maxHeight: "none" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", gridColumn: "1 / -1" }}>
            <h3>No Incidents in Selected Filter</h3>
            <p style={{ fontSize: "12px", marginTop: "6px" }}>
              {filter === "ReviewNeeded"
                ? "All current citizen reports have been verified by AI or resolved."
                : filter === "Quarantined"
                ? "No quarantined spam reports recorded."
                : "No reports matching this category."}
            </p>
          </div>
        ) : (
          filtered.map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              resources={resources}
              onAutoDispatch={onAutoDispatch}
              onVerify={onVerify}
              onFalseAlarm={onFalseAlarm}
              onOpenOverride={onOpenOverride}
              onViewPhoto={onViewPhoto}
              onResetReputation={onResetReputation}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Embedded Interactive Dispatch Mini-Map with Dynamic Maps API markers & real road routing
function DispatchMiniMap({ incident, nearbyResources = [], selectedResource, routeData, loadingRoute, onSelectResource }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  const incLat = incident?.lat != null ? Number(incident.lat) : (incident?.liveLocation?.latitude != null ? Number(incident.liveLocation.latitude) : null);
  const incLng = incident?.lng != null ? Number(incident.lng) : (incident?.liveLocation?.longitude != null ? Number(incident.liveLocation.longitude) : null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (incLat == null || incLng == null || isNaN(incLat) || isNaN(incLng)) return;

    if (!mapInst.current) {
      mapInst.current = L.map(mapRef.current, {
        center: [incLat, incLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer(`https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`, {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20
      }).addTo(mapInst.current);
    }

    const map = mapInst.current;

    // Clear previous layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const isSos = incident?.isSos || incident?.type === "SOS" || incident?.causeCode === "SOS_EMERGENCY";
    const isOnScene = incident?.status === "On Scene" || incident?.dispatchProgress === "on_scene";
    const isDispatched = incident?.status === "Dispatched" || incident?.dispatchProgress === "en_route" || isOnScene;
    const isResolved = incident?.status === "Resolved";

    // 1. Incident marker with pulsing ring
    const incIcon = L.divIcon({
      className: "mini-inc-icon",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:-8px;border-radius:50%;background:${isSos ? "rgba(239,68,68,0.45)" : "rgba(245,158,11,0.45)"};animation:pulse-ring 1.8s infinite ease-in-out;"></div>
          <div style="background:${isSos ? "#ef4444" : "#f59e0b"};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:2.5px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.35);font-weight:bold;">
            ${isSos ? "🚨" : "📍"}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const incMarker = L.marker([incLat, incLng], { icon: incIcon, zIndexOffset: 1000 }).addTo(map);
    incMarker.bindPopup(`
      <div style="font-family:sans-serif;font-size:12px;color:#0f172a;min-width:180px;">
        <b style="color:${isSos ? "#dc2626" : "#2563eb"};font-size:13px;">📍 ${incident?.id || "Target Incident"}</b>
        <div style="margin-top:4px;color:#475569;"><b>Location:</b> ${incident?.address || incident?.zoneId || "Incident Site"}</div>
        <div style="margin-top:2px;color:#475569;"><b>Cause:</b> ${incident?.cause || "Waterlogging"}</div>
        <div style="margin-top:2px;color:#475569;"><b>Status:</b> <span style="font-weight:700;">${incident?.status || "Received"}</span></div>
      </div>
    `);

    // 2. Render all discovered nearby emergency facilities as interactive map markers
    const boundsCoords = [[incLat, incLng]];

    nearbyResources.forEach((res) => {
      if (res.lat == null || res.lng == null || isNaN(res.lat) || isNaN(res.lng)) return;
      const isSelected = selectedResource && (selectedResource.id === res.id || selectedResource.name === res.name);

      const catInfo = getAuthorityResourceCategory(res);
      const catIcon = res.icon || catInfo.icon;
      const catColor = catInfo.color;

      const iconKey = `dispatch-res-${isSelected ? "sel" : "norm"}-${catIcon}`;
      const resDivIcon = getCachedDivIcon(iconKey, {
        className: `dyn-res-icon ${isSelected ? "selected-res" : ""}`,
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            ${isSelected ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(37,99,235,0.4);animation:pulse-ring 2s infinite ease-in-out;"></div>` : ""}
            <div style="background:${isSelected ? "#1d4ed8" : "#ffffff"};color:${isSelected ? "#ffffff" : "#0f172a"};width:${isSelected ? "34px" : "28px"};height:${isSelected ? "34px" : "28px"};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isSelected ? "16px" : "13px"};border:${isSelected ? "3px solid #ffffff" : `2px solid ${catColor}`};box-shadow:0 3px 10px rgba(0,0,0,0.25);transition:all 0.2s ease;">
              ${catIcon}
            </div>
          </div>
        `,
        iconSize: [isSelected ? 34 : 28, isSelected ? 34 : 28],
        iconAnchor: [isSelected ? 17 : 14, isSelected ? 17 : 14]
      });

      const resMarker = L.marker([res.lat, res.lng], { icon: resDivIcon, zIndexOffset: isSelected ? 500 : 100 }).addTo(map);
      
      resMarker.bindPopup(`
        <div style="font-family:sans-serif;font-size:12px;color:#0f172a;min-width:200px;">
          <b style="font-size:13px;color:#0f172a;">${catIcon} ${res.name}</b>
          <div style="font-size:11px;color:${catColor};font-weight:700;margin-top:2px;">${catInfo.label}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${res.group || res.subType || res.category}</div>
          <div style="font-size:11px;color:#475569;margin-top:4px;">📍 ${res.address || res.station}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">
            <span style="font-size:11px;font-weight:700;color:#2563eb;">⚡ ${res.distanceKm != null ? `${res.distanceKm} km` : ""}</span>
            <span style="font-size:11px;font-weight:700;color:#16a34a;">⏱️ ${res.etaText || (res.etaMinutes ? `${res.etaMinutes} min` : "ETA ~5 min")}</span>
          </div>
          ${!isSelected ? `<div style="margin-top:8px;text-align:center;"><button style="background:#2563eb;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;" onclick="window.__selectDispatchRes && window.__selectDispatchRes('${res.id}')">Select for Dispatch</button></div>` : `<div style="margin-top:6px;text-align:center;font-size:11px;font-weight:800;color:#2563eb;">✓ Currently Selected</div>`}
        </div>
      `);

      resMarker.on("click", () => {
        if (onSelectResource) onSelectResource(res);
      });

      if (isSelected) {
        boundsCoords.push([res.lat, res.lng]);
      }
    });

    // 3. Render real road routing geometry from selected emergency service to incident
    if (selectedResource?.lat != null && selectedResource?.lng != null) {
      if (routeData?.coordinates && Array.isArray(routeData.coordinates) && routeData.coordinates.length > 0) {
        const polyCoords = routeData.coordinates.map((c) => [c.lat, c.lng]);
        L.polyline(polyCoords, {
          color: isResolved ? "#10b981" : isOnScene ? "#059669" : "#2563eb",
          weight: 5,
          opacity: 0.9,
          lineJoin: "round"
        }).addTo(map);

        polyCoords.forEach((pt) => boundsCoords.push(pt));
      } else {
        // Direct fallback line while route is loading or if routing offline
        L.polyline([[selectedResource.lat, selectedResource.lng], [incLat, incLng]], {
          color: isResolved ? "#10b981" : isOnScene ? "#10b981" : "#2563eb",
          weight: 4,
          opacity: 0.8,
          dashArray: isOnScene || isResolved ? undefined : "6, 6"
        }).addTo(map);
      }
    }

    // Fit map view bounds comfortably to encompass incident, selected unit, and route
    try {
      if (boundsCoords.length > 1) {
        const bounds = L.latLngBounds(boundsCoords);
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16, animate: true });
      } else {
        map.setView([incLat, incLng], 15, { animate: true });
      }
    } catch {}
  }, [
    incident?.id,
    incLat,
    incLng,
    incident?.status,
    incident?.dispatchProgress,
    nearbyResources.length,
    selectedResource?.id,
    selectedResource?.lat,
    selectedResource?.lng,
    routeData?.coordinates
  ]);

  // Expose global callback for Leaflet popup buttons
  useEffect(() => {
    window.__selectDispatchRes = (resId) => {
      const target = nearbyResources.find((r) => r.id === resId);
      if (target && onSelectResource) onSelectResource(target);
    };
    return () => {
      delete window.__selectDispatchRes;
    };
  }, [nearbyResources, onSelectResource]);

  const isOnScene = incident?.status === "On Scene" || incident?.dispatchProgress === "on_scene";
  const isDispatched = incident?.status === "Dispatched" || incident?.dispatchProgress === "en_route" || isOnScene;
  const isResolved = incident?.status === "Resolved";

  if (incLat == null || incLng == null || isNaN(incLat) || isNaN(incLng)) {
    return (
      <div className="dispatch-minimap-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b", padding: "20px" }}>
        <AlertCircle size={28} color="#f59e0b" style={{ marginBottom: "8px" }} />
        <b style={{ color: "#1e293b", fontSize: "13px" }}>Incident location unavailable</b>
        <span style={{ fontSize: "11px", marginTop: "4px" }}>No valid GPS coordinates associated with {incident?.id || "this report"}.</span>
      </div>
    );
  }

  return (
    <div className="dispatch-minimap-card">
      <div className="dispatch-minimap-badge">
        <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: isResolved ? "#10b981" : isOnScene ? "#059669" : isDispatched ? "#f59e0b" : "#2563eb",
          display: "inline-block",
          boxShadow: isDispatched && !isResolved ? "0 0 8px #f59e0b" : "none"
        }} />
        <span>
          {isResolved
            ? "✅ Incident Mitigated & Cleared"
            : isOnScene
            ? "📍 Squad Reached Site · Operating"
            : isDispatched
            ? `🚗 Squad En Route (${routeData?.durationMin ? `ETA ~${routeData.durationMin} min` : selectedResource?.etaText || "ETA ~5 min"})`
            : selectedResource
            ? `⚡ ${selectedResource.name} · ${selectedResource.distanceKm != null ? `${selectedResource.distanceKm} km away` : "Nearby"}`
            : "⚡ Standby · Ready for Deployment"}
        </span>
      </div>

      {loadingRoute && (
        <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(15,23,42,0.85)", color: "#fff", padding: "4px 10px", borderRadius: "8px", fontSize: "10px", fontWeight: "700", zIndex: 500, display: "flex", alignItems: "center", gap: "6px" }}>
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Calculating Road Route & ETA...
        </div>
      )}

      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// Smart Dispatch Page with Dynamic Maps API Emergency Resource Discovery & Real Road Routing
function Dispatch({ incidents, resources = [], notify, onReload, onAutoDispatch }) {
  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(b.userTimestamp || b.updatedAt || b.createdAt || b.time || 0) - new Date(a.userTimestamp || a.updatedAt || a.createdAt || a.time || 0)
  );

  const [selectedId, setSelectedId] = useState(sortedIncidents[0]?.id || null);
  const selected = sortedIncidents.find((i) => i.id === selectedId) || sortedIncidents[0] || null;

  // Dynamic Emergency Resource Discovery State
  const [searchRadius, setSearchRadius] = useState(5);
  const [activeCategory, setActiveCategory] = useState("all");
  const [nearbyResources, setNearbyResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [errorResources, setErrorResources] = useState(null);

  // Selected Resource for Tasking
  const [selectedResource, setSelectedResource] = useState(null);
  const [team, setTeam] = useState("");

  // Real OSRM Road Routing State
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Action / Confirmation State
  const [sending, setSending] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);

  // Keep selectedId valid
  useEffect(() => {
    if (!selectedId && sortedIncidents.length > 0) {
      setSelectedId(sortedIncidents[0].id);
    }
  }, [sortedIncidents.length]);

  // Extract selected incident GPS
  const incLat = selected?.lat != null ? Number(selected.lat) : (selected?.liveLocation?.latitude != null ? Number(selected.liveLocation.latitude) : null);
  const incLng = selected?.lng != null ? Number(selected.lng) : (selected?.liveLocation?.longitude != null ? Number(selected.liveLocation.longitude) : null);

  // 1. Dynamic Emergency Resource Discovery Effect: Queries Maps API around the Incident's ACTUAL GPS
  useEffect(() => {
    if (!selected) {
      setNearbyResources([]);
      setSelectedResource(null);
      return;
    }

    if (incLat == null || incLng == null || isNaN(incLat) || isNaN(incLng) || incLat === 0 || incLng === 0) {
      setNearbyResources([]);
      setSelectedResource(null);
      setErrorResources("Incident location unavailable. No valid GPS coordinates for this incident.");
      return;
    }

    let isMounted = true;
    setLoadingResources(true);
    setErrorResources(null);

    // Call dedicated backend nearby resources API powered by Google Places & OpenStreetMap
    apiFetch(`/incidents/${selected.id}/nearby-resources?radius_km=${searchRadius}&category=${activeCategory}`)
      .then((data) => {
        if (!isMounted) return;
        const resList = data.resources || [];
        setNearbyResources(resList);

        if (resList.length > 0) {
          // If incident already had an assigned team, try to match it; otherwise auto-select closest resource
          const matched = selected.assignedTeam
            ? resList.find((r) => r.name === selected.assignedTeam) || resList[0]
            : resList[0];
          setSelectedResource(matched);
          setTeam(matched.name);
        } else {
          setSelectedResource(null);
          setTeam("");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("[Smart Dispatch] Dynamic resource discovery error:", err.message);
        setErrorResources("Unable to load nearby emergency resources from Maps API. " + err.message);
        setNearbyResources([]);
        setSelectedResource(null);
      })
      .finally(() => {
        if (isMounted) setLoadingResources(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selected?.id, incLat, incLng, searchRadius, activeCategory]);

  // 2. Real Road Routing Effect: Calculates driving trajectory from selected emergency resource to incident
  useEffect(() => {
    if (!selectedResource || !selectedResource.lat || !selectedResource.lng || incLat == null || incLng == null) {
      setRouteData(null);
      return;
    }

    let isMounted = true;
    setLoadingRoute(true);

    apiFetch(`/route?fromLat=${selectedResource.lat}&fromLng=${selectedResource.lng}&toLat=${incLat}&toLng=${incLng}`)
      .then((route) => {
        if (!isMounted) return;
        if (route && route.success) {
          setRouteData(route);
        } else {
          setRouteData(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("[Smart Dispatch] Route calculation note:", err.message);
        setRouteData(null);
      })
      .finally(() => {
        if (isMounted) setLoadingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedResource?.id, selectedResource?.lat, selectedResource?.lng, incLat, incLng]);

  const handleSelectResourceItem = (resItem) => {
    setSelectedResource(resItem);
    setTeam(resItem.name);
  };

  const handleDispatch = async () => {
    if (!selected || !selectedResource) return;
    setSending(true);
    try {
      const etaStr = routeData?.durationMin
        ? `${routeData.durationMin} min`
        : selectedResource.etaText || "8–12 min";

      await apiFetch(`/incidents/${selected.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team: selectedResource.name,
          teamId: selectedResource.id,
          reason: selected.cause || "Hyperlocal urban flood emergency tasking",
          eta: etaStr
        })
      });
      notify(`✓ Dispatched ${selectedResource.name} to ${selected.id}. Distance: ${selectedResource.distanceKm} km, ETA: ${etaStr}.`);
      setShowDispatchConfirm(false);
      onReload();
    } catch (err) {
      notify("Dispatch failed: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleProgressStage = async (stage) => {
    if (!selected) return;
    setUpdatingProgress(true);
    try {
      if (stage === "resolved") {
        await apiFetch(`/incidents/${selected.id}/resolve`, { method: "POST" });
        notify(`✓ Incident ${selected.id} marked as Fully Resolved (Severity: 0).`);
      } else {
        await apiFetch(`/incidents/${selected.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage })
        });
        if (stage === "on_scene") {
          notify(`✓ Squad ${selected.assignedTeam || team} marked as Reached / On Scene at ${selected.id}.`);
        } else if (stage === "en_route") {
          notify(`↺ Squad marked as En Route to ${selected.id}.`);
        }
      }
      onReload();
    } catch (err) {
      notify("Progress update notice: " + err.message);
    } finally {
      setUpdatingProgress(false);
    }
  };

  const isDispatched = selected?.status === "Dispatched" || selected?.dispatchProgress === "en_route";
  const isOnScene = selected?.status === "On Scene" || selected?.dispatchProgress === "on_scene";
  const isResolved = selected?.status === "Resolved" || selected?.dispatchProgress === "resolved";

  // Step Calculation: 1 = Reported/Triaged, 2 = En route, 3 = On scene, 4 = Resolved
  const currentStep = isResolved ? 4 : isOnScene ? 3 : isDispatched ? 2 : 1;
  const progressPercent = isResolved ? 100 : isOnScene ? 70 : isDispatched ? 35 : 0;

  return (
    <div className="content">
      <PageHeader
        eyebrow="RESPONSE ORCHESTRATION"
        title="Smart Dispatch & Dynamic Resource Tasking"
        sub="Discover real nearby emergency services around citizen GPS coordinates using live Maps API integration and OSRM road routing."
      />
      <div className="dispatch-layout">
        {/* Left Column: Incidents Queue */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Incidents Feed</h3>
              <span>Choose an incident to discover nearby emergency services</span>
            </div>
          </div>
          {sortedIncidents.length === 0 ? (
            <div style={{ padding: "20px", color: "#8a9ba8", fontSize: "11px" }}>No incidents awaiting dispatch.</div>
          ) : (
            sortedIncidents.map((i) => {
              const itemResolved = i.status === "Resolved";
              const itemOnScene = i.status === "On Scene" || i.dispatchProgress === "on_scene";
              const itemDispatched = i.status === "Dispatched" || i.dispatchProgress === "en_route" || itemOnScene;
              const isChosen = selected?.id === i.id;
              const itemLat = i.lat != null ? Number(i.lat) : (i.liveLocation?.latitude != null ? Number(i.liveLocation.latitude) : null);
              const itemLng = i.lng != null ? Number(i.lng) : (i.liveLocation?.longitude != null ? Number(i.liveLocation.longitude) : null);

              return (
                <button
                  className={`dispatch-item ${isChosen ? "chosen" : ""}`}
                  key={i.id}
                  onClick={() => setSelectedId(i.id)}
                  style={{
                    borderLeft: itemResolved
                      ? "4px solid #10b981"
                      : itemOnScene
                      ? "4px solid #059669"
                      : itemDispatched
                      ? "4px solid #f59e0b"
                      : isChosen
                      ? "4px solid #2563eb"
                      : "4px solid transparent"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <b>{i.id}</b>
                      {itemResolved ? (
                        <span style={{ fontSize: "9px", background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "10px", fontWeight: "800" }}>
                          ✓ Resolved
                        </span>
                      ) : itemOnScene ? (
                        <span style={{ fontSize: "9px", background: "#ecfdf5", color: "#047857", padding: "1px 6px", borderRadius: "10px", fontWeight: "800", border: "1px solid #a7f3d0" }}>
                          📍 On Scene
                        </span>
                      ) : itemDispatched ? (
                        <span style={{ fontSize: "9px", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "10px", fontWeight: "800", border: "1px solid #fde68a" }}>
                          🚗 En Route
                        </span>
                      ) : null}
                    </div>
                    <span>{i.address || i.zoneId} · {i.cause}</span>

                    {/* GPS Coordinates Preview */}
                    <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>📍</span>
                      <span>{itemLat != null && itemLng != null ? `${itemLat.toFixed(4)}, ${itemLng.toFixed(4)}` : "GPS unavailable"}</span>
                    </div>

                    {/* Assigned Unit Tag */}
                    {itemDispatched && i.assignedTeam && (
                      <div style={{ fontSize: "10px", color: itemResolved ? "#166534" : "#2563eb", marginTop: "2px", fontWeight: "700" }}>
                        🚒 {i.assignedTeam}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <RiskBadge score={i.severity} />
                    {itemDispatched && i.originalSeverity && i.originalSeverity > i.severity && (
                      <span style={{ fontSize: "9px", color: "#16a34a", fontWeight: "700" }}>
                        ↓ from {i.originalSeverity}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </section>

        {/* Right Column: Selected Incident & Dynamic Dispatch Workspace */}
        <section className="panel dispatch-form">
          <div className="dispatch-hero">
            <div className="hero-icon"><RouteIcon /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Selected Incident</span>
                <span className={`status ${selected?.status?.toLowerCase().replace(" ", "-")}`}>
                  {selected?.status || "Received"}
                </span>
              </div>
              <h2>{selected?.id || "No Incident Selected"}</h2>
              <p>
                {selected?.reporter || "Citizen"} · {selected?.address || selected?.zoneId} · Severity <b>{selected?.severity}</b>
                {selected?.originalSeverity && selected.originalSeverity > selected.severity ? ` (Mitigated from ${selected.originalSeverity})` : ""}
              </p>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                <MapPin size={13} color="#38bdf8" />
                <span><b>GPS Coordinates:</b> {incLat != null && incLng != null ? `${incLat.toFixed(5)}, ${incLng.toFixed(5)}` : "Location coordinates unavailable"}</span>
              </div>
            </div>
          </div>

          {/* Live Multi-Stage Dispatch Lifecycle Timeline */}
          {selected && (
            <div className="dispatch-timeline-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <b style={{ fontSize: "12px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Activity size={15} color="#2563eb" /> Live Dispatch & Mitigation Lifecycle
                </b>
                <span style={{ fontSize: "11px", fontWeight: "700", color: isResolved ? "#10b981" : isOnScene ? "#047857" : isDispatched ? "#b45309" : "#64748b" }}>
                  {isResolved ? "Stage 4 / 4: Resolved" : isOnScene ? "Stage 3 / 4: On Scene / Reached" : isDispatched ? "Stage 2 / 4: En Route" : "Stage 1 / 4: Triaged"}
                </span>
              </div>

              <div className="dispatch-stepper">
                <div className="dispatch-step-line">
                  <div className="dispatch-step-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>

                <div className={`dispatch-step-item ${currentStep >= 1 ? "completed" : ""}`}>
                  <div className="dispatch-step-circle">📋</div>
                  <span className="dispatch-step-label">1. Triaged</span>
                </div>

                <div className={`dispatch-step-item ${currentStep === 2 ? "current-en-route" : currentStep > 2 ? "completed" : ""}`}>
                  <div className="dispatch-step-circle">🚗</div>
                  <span className="dispatch-step-label">2. En Route</span>
                </div>

                <div className={`dispatch-step-item ${currentStep === 3 ? "current-on-scene" : currentStep > 3 ? "completed" : ""}`}>
                  <div className="dispatch-step-circle">📍</div>
                  <span className="dispatch-step-label">3. Reached Site</span>
                </div>

                <div className={`dispatch-step-item ${currentStep === 4 ? "completed" : ""}`}>
                  <div className="dispatch-step-circle">✅</div>
                  <span className="dispatch-step-label">4. Mitigated</span>
                </div>
              </div>
            </div>
          )}

          {/* Embedded Interactive Dispatch Route Map */}
          {selected && (
            <DispatchMiniMap
              incident={selected}
              nearbyResources={nearbyResources}
              selectedResource={selectedResource}
              routeData={routeData}
              loadingRoute={loadingRoute}
              onSelectResource={handleSelectResourceItem}
            />
          )}

          {/* Dynamic Maps API Discovery Filter Bar */}
          <div style={{ marginTop: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  🗺️ Maps API POI Search Radius:
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[3, 5, 10, 15].map((rad) => (
                    <button
                      key={rad}
                      onClick={() => setSearchRadius(rad)}
                      style={{
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: searchRadius === rad ? "800" : "600",
                        borderRadius: "6px",
                        border: searchRadius === rad ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                        background: searchRadius === rad ? "#eff6ff" : "#ffffff",
                        color: searchRadius === rad ? "#1d4ed8" : "#475569",
                        cursor: "pointer"
                      }}
                    >
                      {rad} km
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                {loadingResources ? (
                  <>
                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Searching Maps API...
                  </>
                ) : (
                  <span>Discovered: <b>{nearbyResources.length}</b> real places</span>
                )}
              </div>
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
              {[
                { id: "all", label: "All Categories", icon: "🌐" },
                { id: "fire", label: "Fire & Water Rescue", icon: "🚒" },
                { id: "medical", label: "Hospitals & ICUs", icon: "🏥" },
                { id: "police", label: "Police & Security", icon: "👮" },
                { id: "municipal", label: "Municipal Disaster Cells", icon: "🏛️" },
                { id: "shelter", label: "Evacuation Shelters", icon: "🏠" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "10px",
                    fontWeight: activeCategory === cat.id ? "800" : "600",
                    borderRadius: "20px",
                    border: activeCategory === cat.id ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                    background: activeCategory === cat.id ? "#2563eb" : "#ffffff",
                    color: activeCategory === cat.id ? "#ffffff" : "#475569",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error / Empty State Notice */}
          {errorResources && (
            <div style={{ marginTop: "12px", padding: "12px 14px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: "10px", color: "#991b1b", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} />
                <span>{errorResources}</span>
              </div>
              <button
                className="ghost small"
                onClick={() => setSearchRadius((r) => Math.min(15, r + 5))}
                style={{ fontSize: "10px" }}
              >
                Retry Search
              </button>
            </div>
          )}

          {!loadingResources && !errorResources && nearbyResources.length === 0 && (
            <div style={{ marginTop: "12px", padding: "18px", textAlign: "center", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "12px", color: "#64748b" }}>
              <Compass size={24} color="#94a3b8" style={{ marginBottom: "6px" }} />
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b" }}>No nearby emergency resources found within {searchRadius} km.</div>
              <p style={{ fontSize: "11px", margin: "4px 0 10px" }}>Expand the search radius to discover facilities in adjacent municipal sectors.</p>
              <button
                className="primary small"
                onClick={() => setSearchRadius(10)}
                style={{ fontSize: "11px" }}
              >
                ⚡ Expand Search Radius to 10 km
              </button>
            </div>
          )}

          {/* Dynamically Discovered Real Emergency Services Cards Grid */}
          <div style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "11px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
                📍 Nearest Emergency Services to {selected?.id || "Incident Site"} (Discovered via Maps API):
              </label>
              <span style={{ fontSize: "10px", color: "#64748b" }}>Sorted by shortest distance</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "12px" }}>
              {nearbyResources.map((r, idx) => {
                const isChosen = selectedResource?.id === r.id || team === r.name;
                return (
                  <div
                    key={r.id || idx}
                    onClick={() => handleSelectResourceItem(r)}
                    style={{
                      background: isChosen ? "#eff6ff" : "#ffffff",
                      border: isChosen ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isChosen ? "0 4px 14px rgba(37,99,235,0.18)" : "0 1px 3px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "18px" }}>
                          {r.icon || (r.category === "fire" ? "🚒" : r.category === "medical" ? "🏥" : r.category === "police" ? "👮" : r.category === "shelter" ? "🏠" : "🏛️")}
                        </span>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          <span style={{
                            fontSize: "9px",
                            fontWeight: "800",
                            background: idx === 0 ? "#dcfce7" : "#dbeafe",
                            color: idx === 0 ? "#15803d" : "#1e40af",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            border: idx === 0 ? "1px solid #86efac" : "1px solid #bfdbfe"
                          }}>
                            {idx === 0 ? "⚡ Nearest " : ""}{r.distanceKm != null ? `${r.distanceKm} km` : ""}
                          </span>
                          {r.etaText && (
                            <span style={{ fontSize: "9px", fontWeight: "800", background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "10px" }}>
                              ⏱️ {r.etaText}
                            </span>
                          )}
                        </div>
                      </div>

                      <b style={{ fontSize: "12px", color: "#0f172a", display: "block", marginTop: "6px", lineHeight: "1.3" }}>
                        {r.name}
                      </b>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                        📍 {r.address || r.station}
                      </div>
                      <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>
                        🏢 {r.group || r.subType || r.category}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "9px", fontWeight: "700", color: r.openNow === false ? "#dc2626" : "#16a34a" }}>
                        ● {r.status || "Active 24/7"}
                      </span>
                      {isChosen ? (
                        <span style={{ fontSize: "10px", fontWeight: "800", color: "#2563eb" }}>✓ Selected</span>
                      ) : (
                        <span style={{ fontSize: "10px", color: "#64748b" }}>Select ➔</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Emergency Service Selector */}
          <label style={{ marginTop: "4px" }}>
            Assigned Response Team (Discovered by Maps API)
            <select
              value={team}
              onChange={(e) => {
                const chosenName = e.target.value;
                setTeam(chosenName);
                const found = nearbyResources.find((r) => r.name === chosenName);
                if (found) setSelectedResource(found);
              }}
              disabled={sending || updatingProgress || nearbyResources.length === 0}
            >
              {nearbyResources.map((r, idx) => (
                <option key={r.id || idx} value={r.name}>
                  {idx === 0 && r.distanceKm != null ? `⚡ [Nearest: ${r.distanceKm} km] ` : r.distanceKm != null ? `[${r.distanceKm} km away] ` : ""}{r.name} ({r.etaText || "ETA ~5 min"})
                </option>
              ))}
            </select>
          </label>

          {/* Routing Rationale & Live ETA Display */}
          <div className="route-card">
            <div>
              <b>Automated Routing Rationale & Road Corridor</b>
              <p>
                {selected?.routingRationale || selected?.causeDescription || "Standard municipal emergency response tasking."}
                {routeData?.distanceKm && ` Driven route: ${routeData.distanceKm} km via safest arterial high-ground corridor.`}
              </p>
            </div>
            <div className="eta">
              {isOnScene
                ? "0 min (On site)"
                : routeData?.durationMin
                ? `ETA ${routeData.durationMin} min`
                : selectedResource?.etaText
                ? `ETA ${selectedResource.etaText}`
                : "8–12 min"}
            </div>
          </div>

          {/* Smooth Interactive Action Controls */}
          <div className="action-row" style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            {!isDispatched && !isOnScene && !isResolved && (
              <button
                className="dispatch-action-btn primary"
                onClick={() => setShowDispatchConfirm(true)}
                disabled={!selected || !selectedResource || sending}
                style={{ flex: 1 }}
              >
                {sending ? (
                  <>
                    <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Assigning & Deploying Squad...
                  </>
                ) : (
                  <>
                    <Send size={15} /> 🚀 Dispatch Selected Emergency Squad ({selectedResource?.name ? selectedResource.name.split(" ")[0] : "Nearest"})
                  </>
                )}
              </button>
            )}

            {isDispatched && !isOnScene && !isResolved && (
              <>
                <button
                  className="dispatch-action-btn stage-reached"
                  onClick={() => handleProgressStage("on_scene")}
                  disabled={updatingProgress}
                  style={{ flex: 1 }}
                >
                  {updatingProgress ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <MapPin size={15} />}
                  📍 Mark Squad Reached Site / On Scene
                </button>
                <button
                  className="dispatch-action-btn stage-resolve"
                  onClick={() => handleProgressStage("resolved")}
                  disabled={updatingProgress}
                >
                  <Check size={15} /> Fast Resolve
                </button>
              </>
            )}

            {isOnScene && !isResolved && (
              <button
                className="dispatch-action-btn stage-resolve"
                onClick={() => handleProgressStage("resolved")}
                disabled={updatingProgress}
                style={{ flex: 1, padding: "12px 20px" }}
              >
                {updatingProgress ? (
                  <>
                    <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Resolving Incident...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> ✅ Hazard Mitigated — Mark Incident Fully Resolved
                  </>
                )}
              </button>
            )}

            {isResolved && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "#ecfdf5", border: "1.5px solid #a7f3d0", padding: "12px 16px", borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#065f46", fontSize: "12px", fontWeight: "800" }}>
                  <CheckCircle2 size={18} color="#10b981" /> Incident Fully Cleared & Mitigated (Severity: 0)
                </div>
                <button
                  className="ghost"
                  onClick={() => handleProgressStage("en_route")}
                  disabled={updatingProgress}
                  style={{ fontSize: "11px", padding: "5px 10px" }}
                >
                  <RotateCcw size={13} /> Re-open Active Response
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Confirmation Modal before Dispatching */}
      {showDispatchConfirm && selected && selectedResource && (
        <div className="modal-backdrop" onClick={() => setShowDispatchConfirm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Send size={18} color="#2563eb" /> Confirm Emergency Dispatch Tasking
              </h3>
              <button className="close-btn" onClick={() => setShowDispatchConfirm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Target Incident</div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{selected.id} · {selected.address}</div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>GPS: {incLat?.toFixed(4)}, {incLng?.toFixed(4)} · Cause: {selected.cause}</div>
              </div>

              <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase" }}>Assigned Emergency Service Unit</div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a8a", marginTop: "2px" }}>{selectedResource.icon || "🚒"} {selectedResource.name}</div>
                <div style={{ fontSize: "11px", color: "#1e40af", marginTop: "2px" }}>📍 {selectedResource.address || selectedResource.station}</div>
                <div style={{ display: "flex", gap: "14px", marginTop: "6px", fontSize: "11px", fontWeight: "700" }}>
                  <span>Distance: <b>{selectedResource.distanceKm} km</b></span>
                  <span>Estimated ETA: <b>{routeData?.durationMin ? `${routeData.durationMin} min` : selectedResource.etaText || "8–12 min"}</b></span>
                </div>
              </div>

              <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0" }}>
                Deploying this unit will notify ward dispatchers, log the action to the audit ledger, and initiate live en-route GPS tracking.
              </p>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="ghost" onClick={() => setShowDispatchConfirm(false)}>
                Cancel
              </button>
              <button className="primary" onClick={handleDispatch} disabled={sending}>
                {sending ? "Deploying..." : "Confirm & Deploy Squad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Dedicated Comprehensive Incident Details & Dynamic Lifecycle Management Page
function IncidentDetailPage({ incidents, resources = [], notify, onReload, onAutoDispatch, onVerify, onFalseAlarm, onOpenOverride, onViewPhoto, onResetReputation }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(() => incidents.find((i) => i.id === id) || null);
  const [loadingIncident, setLoadingIncident] = useState(!incident);
  const [nearbyResources, setNearbyResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedResource, setSelectedResource] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  // Sync from props or fetch fresh incident
  useEffect(() => {
    const found = incidents.find((i) => i.id === id);
    if (found) {
      setIncident(found);
      setLoadingIncident(false);
    } else {
      setLoadingIncident(true);
      apiFetch(`/incidents/${id}`)
        .then((res) => {
          setIncident(res);
          setLoadingIncident(false);
        })
        .catch((err) => {
          console.error("[IncidentDetailPage] Load error:", err);
          setLoadingIncident(false);
        });
    }
  }, [id, incidents]);

  // Dynamically discover emergency resources around incident GPS via Maps API
  useEffect(() => {
    if (!incident) return;
    const lat = Number(incident.lat ?? incident.latitude ?? incident.liveLocation?.latitude);
    const lng = Number(incident.lng ?? incident.longitude ?? incident.liveLocation?.longitude);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      setNearbyResources([]);
      return;
    }

    setLoadingResources(true);
    apiFetch(`/incidents/${incident.id}/nearby-resources?radius_km=${searchRadius}&category=${activeCategory}`)
      .then((res) => {
        const list = res.resources || [];
        setNearbyResources(list);
        if (list.length > 0) {
          setSelectedResource((prev) => {
            if (prev) {
              const matched = list.find((r) => r.name === prev.name || r.id === prev.id);
              if (matched) return matched;
            }
            return list[0];
          });
        }
      })
      .catch((err) => {
        console.warn("[IncidentDetailPage] Nearby resources warning:", err);
      })
      .finally(() => setLoadingResources(false));
  }, [incident?.id, searchRadius, activeCategory]);

  // Calculate real OSRM turn-by-turn road route when selected resource changes
  useEffect(() => {
    if (!incident || !selectedResource) {
      setRouteData(null);
      return;
    }
    const incLat = Number(incident.lat ?? incident.latitude ?? incident.liveLocation?.latitude);
    const incLng = Number(incident.lng ?? incident.longitude ?? incident.liveLocation?.longitude);
    const resLat = Number(selectedResource.lat);
    const resLng = Number(selectedResource.lng);
    if (isNaN(incLat) || isNaN(incLng) || isNaN(resLat) || isNaN(resLng)) return;

    setLoadingRoute(true);
    apiFetch(`/route?fromLat=${resLat}&fromLng=${resLng}&toLat=${incLat}&toLng=${incLng}`)
      .then((res) => {
        setRouteData(res);
      })
      .catch(() => {
        setRouteData({
          coordinates: [{ lat: resLat, lng: resLng }, { lat: incLat, lng: incLng }],
          distanceKm: selectedResource.distanceKm || 1.8,
          durationMin: selectedResource.etaMinutes || 6
        });
      })
      .finally(() => setLoadingRoute(false));
  }, [incident?.id, selectedResource?.id, selectedResource?.lat, selectedResource?.lng]);

  // Lifecycle Action Handlers
  const handleVerify = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/incidents/${id}/verify`, { method: "POST" });
      notify(`Incident ${id} marked as VERIFIED.`);
      if (res.incident) setIncident(res.incident);
      if (onReload) onReload();
    } catch (err) {
      notify("Verification failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoDispatch = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/incidents/${id}/auto-dispatch`, { method: "POST" });
      notify(res.message || `Auto-dispatched rapid emergency unit to ${id}.`);
      if (res.incident) setIncident(res.incident);
      if (onReload) onReload();
    } catch (err) {
      notify("Auto-dispatch failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProgressStage = async (stage) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/incidents/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage })
      });
      notify(`Lifecycle updated: ${id} → ${stage.replace("_", " ").toUpperCase()}`);
      if (res.incident) setIncident(res.incident);
      if (onReload) onReload();
    } catch (err) {
      notify("Progress update failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/incidents/${id}/resolve`, { method: "POST" });
      notify(`Incident ${id} marked as RESOLVED. SOS marker cleared from active map.`);
      if (res.incident) setIncident(res.incident);
      if (onReload) onReload();
    } catch (err) {
      notify("Resolution failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFalseAlarm = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/incidents/${id}/false-alarm`, { method: "POST" });
      notify(`Incident ${id} marked as FALSE ALARM. Cleared from active map.`);
      if (res.incident) setIncident(res.incident);
      if (onReload) onReload();
    } catch (err) {
      notify("False alarm failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAllocateResource = async (res) => {
    setActionLoading(true);
    try {
      const alloc = await apiFetch(`/incidents/${id}/allocate-resource`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(res)
      });
      notify(`Allocated ${res.name} (${res.distanceKm} km, ETA: ${res.etaText}) to ${id}.`);
      if (alloc.incident) setIncident(alloc.incident);
      setConfirmModal(null);
      if (onReload) onReload();
    } catch (err) {
      notify("Allocation failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loadingIncident) {
    return (
      <div className="content" style={{ textAlign: "center", padding: "80px" }}>
        <Loader2 size={36} style={{ animation: "spin 1s linear infinite", color: "#2563eb" }} />
        <h3 style={{ marginTop: "16px" }}>Loading Incident {id}...</h3>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="content" style={{ textAlign: "center", padding: "60px" }}>
        <AlertTriangle size={48} color="#ef4444" />
        <h2 style={{ marginTop: "12px" }}>Incident {id} Not Found</h2>
        <p style={{ color: "#64748b", margin: "8px 0 20px" }}>The requested incident record does not exist in the database.</p>
        <button className="primary" onClick={() => navigate("/incidents")}>
          <ArrowLeft size={14} /> Return to Incidents Feed
        </button>
      </div>
    );
  }

  const inc = incident;
  const isSos = Boolean(inc.isSos || inc.type === "SOS" || inc.causeCode === "SOS_EMERGENCY");
  const statusUpper = String(inc.status || "").toUpperCase();
  const isResolved = statusUpper === "RESOLVED" || inc.status === "Resolved";
  const isFalseAlarm = statusUpper === "FALSE_ALARM" || inc.status === "False Alarm";
  const isReached = statusUpper === "ON SCENE" || statusUpper === "ON_SCENE" || statusUpper === "REACHED_SITE" || inc.dispatchProgress === "on_scene";
  const isEnRoute = statusUpper === "DISPATCHED" || statusUpper === "EN_ROUTE" || inc.dispatchProgress === "en_route";
  const isAllocated = statusUpper === "RESOURCE ALLOCATED" || statusUpper === "RESOURCE_ALLOCATED" || statusUpper === "ALLOCATED" || Boolean(inc.assignedResource);
  const isVerified = statusUpper === "VERIFIED" || inc.status === "Verified";

  const incLat = Number(inc.lat ?? inc.latitude ?? inc.liveLocation?.latitude);
  const incLng = Number(inc.lng ?? inc.longitude ?? inc.liveLocation?.longitude);

  const hasVideo = Boolean((inc.videoUrl || inc.video) && inc.videoUrl !== "attached" && (inc.videoUrl?.startsWith("http") || inc.videoUrl?.startsWith("data:video") || inc.videoUrl?.startsWith("/uploads")));
  const hasPhoto = Boolean(inc.photoUrl && inc.photoUrl !== "attached" && (inc.photoUrl.startsWith("http") || inc.photoUrl.startsWith("data:image") || inc.photoUrl.startsWith("/uploads")));

  // Pipeline Stepper Progress Index
  // 0: Received, 1: Verified, 2: Resource Allocated, 3: En Route, 4: Reached Site, 5: Resolved
  const currentStep = isResolved ? 5 : isReached ? 4 : isEnRoute ? 3 : isAllocated ? 2 : isVerified ? 1 : 0;

  return (
    <div className="content">
      {/* Back to feed & Quick Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <button className="ghost small" onClick={() => navigate("/incidents")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <ArrowLeft size={14} /> Back to Incident Feed
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Live Lifecycle:</span>
          <span className={`status ${inc.status?.toLowerCase().replace(" ", "-")}`} style={{ fontSize: "12px", padding: "4px 10px" }}>
            {inc.status}
          </span>
          <RiskBadge score={inc.severity || (isSos ? 95 : 50)} />
        </div>
      </div>

      {/* High-Urgency SOS Banner if active */}
      {isSos && !isResolved && !isFalseAlarm && (
        <div
          style={{
            background: "linear-gradient(135deg, #dc2626, #991b1b)",
            color: "#ffffff",
            padding: "14px 18px",
            borderRadius: "10px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 14px rgba(220, 38, 38, 0.35)",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="pulsing-red-dot" style={{ background: "#ffffff", width: "12px", height: "12px" }} />
            <div>
              <b style={{ fontSize: "15px", letterSpacing: "0.5px" }}>
                🚨 ACTIVE CRITICAL SOS DISTRESS CLUSTER (500m GEOFENCE)
              </b>
              <div style={{ fontSize: "12px", opacity: 0.95, marginTop: "3px" }}>
                <b>{inc.reporter_count || inc.reports?.length || 1}</b> {((inc.reporter_count || inc.reports?.length || 1) === 1) ? "citizen has" : "citizens have"} triggered emergency SOS in this 500m sector · First: {inc.first_reported_at ? new Date(inc.first_reported_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : inc.time} · Latest: {inc.last_reported_at ? new Date(inc.last_reported_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active"}
              </div>
            </div>
          </div>
          <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.25)", padding: "5px 12px", borderRadius: "12px", fontWeight: "800" }}>
            {inc.reporter_count || inc.reports?.length || 1} AGGREGATED REPORTS
          </span>
        </div>
      )}

      {/* Main Incident Details Header Card */}
      <section className="panel" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#0f172a" }}>{inc.id}</h2>
              <span style={{ fontSize: "12px", background: "#f1f5f9", padding: "3px 9px", borderRadius: "6px", color: "#334155", fontWeight: "700" }}>
                {inc.zoneId || "Mumbai Zone"}
              </span>
            </div>
            <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span>📍 <b>{inc.address || "Live Street Location"}</b></span>
              <span>·</span>
              <span>Primary Reporter: <b>{inc.reporter}</b> ({inc.role || "Citizen"})</span>
              <span>·</span>
              <span>⏱️ {inc.time || (inc.userTimestamp ? new Date(inc.userTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now")}</span>
            </div>
            {incLat && incLng && (
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace" }}>
                  GPS: {incLat.toFixed(5)}, {incLng.toFixed(5)}
                </span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${incLat},${incLng}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2563eb", fontWeight: "700", textDecoration: "none" }}
                >
                  Open in Google Maps ↗
                </a>
              </div>
            )}
          </div>

          {/* Assigned Resource Status Card if assigned */}
          {inc.assignedResource ? (
            <div style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: "10px", padding: "10px 14px", minWidth: "240px" }}>
              <div style={{ fontSize: "10px", color: "#1d4ed8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Assigned Response Unit
              </div>
              <b style={{ fontSize: "13px", color: "#0f172a", display: "block", marginTop: "2px" }}>
                {inc.assignedResource.name}
              </b>
              <div style={{ fontSize: "11px", color: "#334155", marginTop: "2px" }}>
                📍 {inc.assignedResource.distanceKm} km away · ETA: <b>{inc.assignedResource.etaText || "8 min"}</b>
              </div>
            </div>
          ) : inc.assignedTeam ? (
            <div style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: "10px", padding: "10px 14px", minWidth: "240px" }}>
              <div style={{ fontSize: "10px", color: "#1d4ed8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Assigned Squad
              </div>
              <b style={{ fontSize: "13px", color: "#0f172a", display: "block", marginTop: "2px" }}>
                {inc.assignedTeam}
              </b>
              <div style={{ fontSize: "11px", color: "#334155", marginTop: "2px" }}>
                Status: <b>{inc.status}</b>
              </div>
            </div>
          ) : null}
        </div>

        {/* Visual Lifecycle Stepper Pipeline */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Operational Lifecycle Progress
          </div>

          {isFalseAlarm ? (
            <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "12px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px", color: "#475569" }}>
              <X size={20} color="#64748b" />
              <div>
                <b>Closed as False Alarm</b>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {inc.falseAlarmReason || "Flagged by Authority Admin"} {inc.falseAlarmAt ? `· Recorded at ${new Date(inc.falseAlarmAt).toLocaleTimeString()}` : ""}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
              {[
                { step: 0, label: "1. Received", icon: "🔴", desc: "Citizen Distress Logged", active: currentStep >= 0 },
                { step: 1, label: "2. Verified", icon: "🟠", desc: inc.verifiedAt ? `Verified ${new Date(inc.verifiedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Ground Verification", active: currentStep >= 1 },
                { step: 2, label: "3. Allocated", icon: "🔵", desc: inc.allocatedAt ? `Assigned Unit` : "Resource Assigned", active: currentStep >= 2 },
                { step: 3, label: "4. En Route", icon: "🚑", desc: inc.dispatchedAt ? `Dispatched` : "Traveling to Site", active: currentStep >= 3 },
                { step: 4, label: "5. Reached Site", icon: "📍", desc: inc.reachedAt ? `On Scene` : "Operating on Site", active: currentStep >= 4 },
                { step: 5, label: "6. Resolved", icon: "🟢", desc: inc.resolvedAt ? `Closed ${new Date(inc.resolvedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Hazard Mitigated", active: currentStep >= 5 }
              ].map((st) => {
                const isCurrent = currentStep === st.step;
                const isDone = currentStep > st.step;
                return (
                  <div
                    key={st.step}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: isCurrent ? "2px solid #2563eb" : isDone ? "1.5px solid #86efac" : "1px solid #e2e8f0",
                      background: isCurrent ? "#eff6ff" : isDone ? "#f0fdf4" : "#f8fafc",
                      position: "relative"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: isCurrent ? "#1d4ed8" : isDone ? "#166534" : "#64748b" }}>
                        {st.label}
                      </span>
                      <span>{isDone ? "✓" : st.icon}</span>
                    </div>
                    <div style={{ fontSize: "10px", color: isCurrent ? "#1e40af" : isDone ? "#15803d" : "#94a3b8", marginTop: "3px" }}>
                      {st.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* State-Aware Action Control Bar */}
        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#334155", marginRight: "4px" }}>
            Authority Actions:
          </span>

          {!isVerified && !isDispatched && !isResolved && !isFalseAlarm && (
            <button className="ghost small" onClick={handleVerify} disabled={actionLoading} style={{ color: "#16a34a", fontWeight: "700" }}>
              <CheckCircle2 size={13} /> Mark Verified
            </button>
          )}

          {!isResolved && !isFalseAlarm && (
            <button className="auto-dispatch-btn pumping-unit" onClick={handleAutoDispatch} disabled={actionLoading} style={{ fontSize: "11px" }}>
              <Zap size={13} /> Auto-Dispatch Rapid Unit
            </button>
          )}

          {isAllocated && !isEnRoute && !isReached && !isResolved && !isFalseAlarm && (
            <button className="primary small" onClick={() => handleProgressStage("en_route")} disabled={actionLoading}>
              <Truck size={13} /> Resource En Route
            </button>
          )}

          {(isEnRoute || isAllocated) && !isReached && !isResolved && !isFalseAlarm && (
            <button className="primary small" onClick={() => handleProgressStage("on_scene")} disabled={actionLoading} style={{ background: "#059669" }}>
              <MapPin size={13} /> Mark Reached Site
            </button>
          )}

          {!isResolved && !isFalseAlarm && (
            <button className="primary small" onClick={handleResolve} disabled={actionLoading} style={{ background: "#16a34a" }}>
              <Check size={13} /> Mark Resolved & Close SOS
            </button>
          )}

          {!isResolved && !isFalseAlarm && (
            <button className="danger-btn small" onClick={handleFalseAlarm} disabled={actionLoading}>
              <X size={13} /> False Alarm
            </button>
          )}

          <button className="ghost small" onClick={() => onOpenOverride(inc)} title="Admin Manual Override">
            <Sliders size={13} /> Manual Override
          </button>
        </div>
      </section>

      {/* Clustered SOS Reports & Individual GPS Distribution Panel */}
      {((inc.reports && inc.reports.length > 0) || inc.reporter_count > 1 || isSos) && (
        <section className="panel" style={{ marginBottom: "16px", border: "1.5px solid #fca5a5", background: "#fffdfa" }}>
          <div className="panel-head" style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, color: "#991b1b", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertOctagon size={18} color="#dc2626" />
                Aggregated SOS Cluster Telemetry & Individual Reporter GPS Locations
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "block" }}>
                500-meter geographic deduplication fence anchored at ({incLat?.toFixed(5)}, {incLng?.toFixed(5)}). Individual GPS coordinates preserved below for ground search & rescue.
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "6px", fontWeight: "800" }}>
                {inc.reports?.length || inc.reporter_count || 1} Active Distress Signals
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "14px" }}>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fed7aa" }}>
              <div style={{ fontSize: "10px", color: "#9a3412", fontWeight: "800", textTransform: "uppercase" }}>Primary Anchor Location</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b", marginTop: "2px" }}>{inc.address || "Main Incident Center"}</div>
              <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>{incLat?.toFixed(5)}, {incLng?.toFixed(5)}</div>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fed7aa" }}>
              <div style={{ fontSize: "10px", color: "#9a3412", fontWeight: "800", textTransform: "uppercase" }}>First Distress Logged</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b", marginTop: "2px" }}>
                {inc.first_reported_at ? new Date(inc.first_reported_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : inc.time || "Initial"}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Initial distress beacon</div>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fed7aa" }}>
              <div style={{ fontSize: "10px", color: "#9a3412", fontWeight: "800", textTransform: "uppercase" }}>Latest Distress Report</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b", marginTop: "2px" }}>
                {inc.last_reported_at ? new Date(inc.last_reported_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Recent"}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Cluster boundary active</div>
            </div>
          </div>

          {/* Table of Attached Citizen Reports */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", background: "#ffffff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", color: "#475569" }}>#</th>
                  <th style={{ padding: "8px 12px", color: "#475569" }}>Reporting User</th>
                  <th style={{ padding: "8px 12px", color: "#475569" }}>Contact / Role</th>
                  <th style={{ padding: "8px 12px", color: "#475569" }}>Live GPS Location</th>
                  <th style={{ padding: "8px 12px", color: "#475569" }}>Distance from Anchor</th>
                  <th style={{ padding: "8px 12px", color: "#475569" }}>Reported Time</th>
                  <th style={{ padding: "8px 12px", color: "#475569", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(inc.reports && inc.reports.length > 0 ? inc.reports : [
                  {
                    id: "RPT-01",
                    user_name: inc.reporter || "Primary Caller",
                    role: inc.role || "Citizen",
                    user_phone: inc.userPhone || "Emergency Line",
                    latitude: incLat,
                    longitude: incLng,
                    address: inc.address,
                    distance_meters: 0,
                    timestamp: inc.createdAt || inc.userTimestamp
                  }
                ]).map((rep, idx) => {
                  const repLat = rep.latitude != null ? rep.latitude : (rep.lat != null ? rep.lat : incLat);
                  const repLng = rep.longitude != null ? rep.longitude : (rep.lng != null ? rep.lng : incLng);
                  return (
                    <tr key={rep.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontWeight: "700", color: "#64748b" }}>{idx + 1}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <b>{rep.user_name || "Citizen"}</b>
                        {idx === 0 && <span style={{ marginLeft: "6px", fontSize: "9px", background: "#dbeafe", color: "#1e40af", padding: "1px 5px", borderRadius: "4px", fontWeight: "800" }}>ANCHOR</span>}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#334155" }}>
                        <div>{rep.user_phone || "Not provided"}</div>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>{rep.role || "Citizen"}</span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#0f172a" }}>
                          {Number(repLat)?.toFixed(5)}, {Number(repLng)?.toFixed(5)}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>{rep.address || inc.address}</div>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ background: (rep.distance_meters || 0) === 0 ? "#f1f5f9" : "#eff6ff", color: (rep.distance_meters || 0) === 0 ? "#475569" : "#2563eb", padding: "2px 7px", borderRadius: "4px", fontWeight: "700", fontSize: "11px" }}>
                          {(rep.distance_meters || 0) === 0 ? "0m (Center)" : `+${rep.distance_meters}m`}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", color: "#64748b", fontSize: "11px" }}>
                        {rep.timestamp ? new Date(rep.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Just now"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${repLat},${repLng}&travelmode=driving`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700", textDecoration: "none" }}
                        >
                          Google Maps ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Dynamic Emergency Resource Discovery Section (Maps API Powered) */}
      <div className="dispatch-layout" style={{ marginTop: "16px" }}>
        {/* Discovered Nearby Facilities Column */}
        <section className="panel" style={{ flex: "1 1 450px" }}>
          <div className="panel-head">
            <div>
              <h3>Dynamic Emergency Resource Discovery</h3>
              <span>Live Maps API search around GPS ({incLat?.toFixed(4)}, {incLng?.toFixed(4)})</span>
            </div>
            {/* Search Radius Pills */}
            <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
              {[3, 5, 10, 15].map((rad) => (
                <button
                  key={rad}
                  onClick={() => setSearchRadius(rad)}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: searchRadius === rad ? "800" : "600",
                    borderRadius: "6px",
                    border: searchRadius === rad ? "1.5px solid #2563eb" : "1px solid transparent",
                    background: searchRadius === rad ? "#eff6ff" : "transparent",
                    color: searchRadius === rad ? "#1d4ed8" : "#64748b",
                    cursor: "pointer"
                  }}
                >
                  {rad} km
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", margin: "10px 0" }}>
            {[
              { id: "all", label: "All Categories", icon: "🌐" },
              { id: "fire", label: "Fire & Water Rescue", icon: "🚒" },
              { id: "medical", label: "Hospitals & ICUs", icon: "🏥" },
              { id: "police", label: "Police Stations", icon: "👮" },
              { id: "municipal", label: "Municipal Disaster Cells", icon: "🏛️" },
              { id: "shelter", label: "Shelters & Evac", icon: "🏠" }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: activeCategory === cat.id ? "800" : "600",
                  borderRadius: "20px",
                  border: activeCategory === cat.id ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                  background: activeCategory === cat.id ? "#2563eb" : "#ffffff",
                  color: activeCategory === cat.id ? "#ffffff" : "#475569",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Results List */}
          {loadingResources ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#2563eb" }} />
              <div style={{ marginTop: "8px", fontSize: "12px" }}>Querying Maps API for nearby emergency services...</div>
            </div>
          ) : nearbyResources.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "8px" }}>
              <AlertCircle size={24} color="#94a3b8" />
              <div style={{ marginTop: "6px", fontWeight: "700", fontSize: "13px" }}>No emergency facilities found within {searchRadius} km</div>
              <p style={{ fontSize: "11px", marginTop: "4px" }}>Expand the search radius above to 10 km or 15 km to discover broader regional rescue hubs.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "8px", maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
              {nearbyResources.map((res, idx) => {
                const isChosen = selectedResource && (selectedResource.id === res.id || selectedResource.name === res.name);
                return (
                  <div
                    key={res.id || idx}
                    onClick={() => setSelectedResource(res)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: isChosen ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      background: isChosen ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "15px" }}>{res.icon || (res.category === "medical" ? "🏥" : res.category === "police" ? "👮" : res.category === "municipal" ? "🏛️" : res.category === "shelter" ? "🏠" : "🚒")}</span>
                          <b style={{ fontSize: "12px", color: "#0f172a" }}>{res.name}</b>
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>📍 {res.address}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "2px 7px", borderRadius: "10px", fontSize: "10px", fontWeight: "800" }}>
                          ⚡ {res.distanceKm} km
                        </span>
                        <div style={{ fontSize: "10px", color: "#2563eb", fontWeight: "700", marginTop: "3px" }}>
                          ETA: {res.etaText || "6 min"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: "700" }}>
                        ● Active Emergency POI
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal(res);
                        }}
                        style={{
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                      >
                        🚀 Allocate & Dispatch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Mini-Map & Ground Truth Telemetry Column */}
        <section className="panel" style={{ flex: "1 1 500px" }}>
          <div className="panel-head">
            <div>
              <h3>Turn-by-Turn Road Corridor</h3>
              <span>{selectedResource ? `OSRM Route from ${selectedResource.name} to ${inc.id}` : "Select a discovered facility to inspect routing"}</span>
            </div>
            {routeData && (
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#2563eb" }}>
                ⏱️ {routeData.durationMin || selectedResource?.etaMinutes || 5} min ({routeData.distanceKm || selectedResource?.distanceKm} km)
              </span>
            )}
          </div>

          <div style={{ height: "340px", position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
            <DispatchMiniMap
              incident={inc}
              nearbyResources={nearbyResources}
              selectedResource={selectedResource}
              routeData={routeData}
              loadingRoute={loadingRoute}
              onSelectResource={(res) => setSelectedResource(res)}
            />
          </div>

          {/* Ground Truth Video / Photo Evidence */}
          <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: hasPhoto || hasVideo ? "1fr 1fr" : "1fr", gap: "10px" }}>
            {hasVideo && (
              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #334155", background: "#0f172a" }}>
                <video
                  src={inc.videoUrl?.startsWith("/") ? `${API.replace(/\/api\/?$/, "")}${inc.videoUrl}` : inc.videoUrl}
                  controls
                  playsInline
                  style={{ width: "100%", maxHeight: "150px", objectFit: "contain", display: "block" }}
                />
                <div style={{ padding: "4px 8px", fontSize: "10px", color: "#fff", fontWeight: "700", background: "#0f172a" }}>
                  🎥 Citizen Video Evidence
                </div>
              </div>
            )}
            {hasPhoto && !hasVideo && (
              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                <img
                  src={inc.photoUrl}
                  alt="Ground Truth Evidence"
                  style={{ width: "100%", height: "150px", objectFit: "cover", display: "block", cursor: "pointer" }}
                  onClick={() => onViewPhoto && onViewPhoto(inc.photoUrl, inc, false)}
                />
                <div style={{ padding: "4px 8px", fontSize: "10px", color: "#334155", fontWeight: "700", background: "#f8fafc" }}>
                  📸 Ground Truth Photo Evidence
                </div>
              </div>
            )}

            <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px", color: "#334155" }}>
              <div style={{ fontWeight: "700", marginBottom: "4px", color: "#0f172a" }}>Ground Telemetry:</div>
              <div>🌊 Water Level: <b>{inc.waterLevel || 15} cm</b></div>
              <div>🚰 Drainage Status: <b>{inc.drainObservation || "Unsure"}</b></div>
              <div>⏱️ Onset Speed: <b>{inc.onsetSpeed || "10–20 min"}</b></div>
              <div>🤖 AI Confidence: <b>{((inc.aiVerification?.confidence_score ?? inc.cvConfidence ?? 88) * (inc.aiVerification?.confidence_score != null ? 100 : 1)).toFixed(0)}%</b></div>
              {inc.note && <div style={{ marginTop: "4px", fontStyle: "italic", color: "#64748b" }}>"{inc.note}"</div>}
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal before Dispatching */}
      {confirmModal && (
        <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3>Confirm Rapid Unit Allocation</h3>
              <button className="icon-btn" onClick={() => setConfirmModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 12px" }}>
                Allocate and dispatch the selected emergency facility to <b>{inc.id}</b>.
              </p>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                <div><b>Resource:</b> {confirmModal.name} ({confirmModal.category})</div>
                <div style={{ marginTop: "4px" }}><b>Location:</b> {confirmModal.address}</div>
                <div style={{ marginTop: "4px" }}><b>Distance:</b> {confirmModal.distanceKm} km · ETA: <b>{confirmModal.etaText || "6 min"}</b></div>
                <div style={{ marginTop: "4px" }}><b>Destination:</b> {inc.address || inc.id}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="ghost" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="primary" onClick={() => handleAllocateResource(confirmModal)} disabled={actionLoading}>
                🚀 Confirm & Dispatch Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dedicated Comprehensive Zone Details & Multi-Sector Monitoring Page
function ZoneDetailPage({
  zones = [],
  incidents = [],
  alerts = [],
  resources = [],
  shelters = [],
  chronicBlockages = [],
  notify,
  onReload,
  onAutoDispatch,
  onVerify,
  onFalseAlarm,
  onResolve,
  onOpenOverride,
  onViewPhoto,
  onResetReputation
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [zone, setZone] = useState(() => {
    const target = String(id || "").toLowerCase();
    return zones.find((z) => String(z.id || "").toLowerCase() === target || String(z.name || "").toLowerCase() === target) || null;
  });
  const [loadingZone, setLoadingZone] = useState(!zone);

  // Sync from props or fetch fresh zone from backend
  useEffect(() => {
    const target = String(id || "").toLowerCase();
    const found = zones.find((z) => String(z.id || "").toLowerCase() === target || String(z.name || "").toLowerCase() === target);
    if (found) {
      setZone(found);
      setLoadingZone(false);
    } else {
      setLoadingZone(true);
      apiFetch(`/zones/${id}`)
        .then((res) => {
          setZone(res);
          setLoadingZone(false);
        })
        .catch((err) => {
          console.error("[ZoneDetailPage] Load error:", err);
          setLoadingZone(false);
        });
    }
  }, [id, zones]);

  const zoneId = zone?.id || id;
  const zoneLat = Number(zone?.lat ?? zone?.latitude ?? 19.132);
  const zoneLng = Number(zone?.lng ?? zone?.longitude ?? 72.848);

  // Active Incidents in this zone (by zoneId or proximity < 1.8km)
  const zoneIncidents = incidents.filter((inc) => {
    if (inc.zoneId && (inc.zoneId === zoneId || inc.zoneId === zone?.name)) return true;
    if (inc.lat && inc.lng && zoneLat && zoneLng) {
      const d = calcDistanceKm(zoneLat, zoneLng, inc.lat, inc.lng);
      return d != null && d <= 1.8;
    }
    return false;
  });

  // Recent Alerts in this zone
  const zoneAlerts = alerts.filter((alt) => {
    if (alt.zoneId && (alt.zoneId === zoneId || alt.zoneId === zone?.name)) return true;
    if (alt.lat && alt.lng && zoneLat && zoneLng) {
      const d = calcDistanceKm(zoneLat, zoneLng, alt.lat, alt.lng);
      return d != null && d <= 2.5;
    }
    return false;
  });

  // Nearby Resources in this zone
  const nearbyZoneResources = resources.map((r) => {
    const rLat = r.latitude ?? r.lat;
    const rLng = r.longitude ?? r.lng;
    const dist = (rLat && rLng && zoneLat && zoneLng) ? calcDistanceKm(zoneLat, zoneLng, rLat, rLng) : null;
    return { ...r, distanceKm: dist };
  }).filter((r) => r.distanceKm == null || r.distanceKm <= 5.0).sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

  // Nearby Shelters
  const nearbyZoneShelters = shelters.map((s) => {
    const sLat = s.latitude ?? s.lat;
    const sLng = s.longitude ?? s.lng;
    const dist = (sLat && sLng && zoneLat && zoneLng) ? calcDistanceKm(zoneLat, zoneLng, sLat, sLng) : null;
    return { ...s, distanceKm: dist };
  }).filter((s) => s.distanceKm == null || s.distanceKm <= 5.0).sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

  // Chronic Blockages in this ward
  const zoneBlockages = chronicBlockages.filter((cb) => {
    if (zone?.ward && cb.ward && (cb.ward.toLowerCase().includes(zone.ward.toLowerCase()) || zone.ward.toLowerCase().includes(cb.ward.toLowerCase()))) return true;
    if (cb.lat && cb.lng && zoneLat && zoneLng) {
      const d = calcDistanceKm(zoneLat, zoneLng, cb.lat, cb.lng);
      return d != null && d <= 2.0;
    }
    return false;
  });

  const riskScore = zone?.risk ?? 50;
  const riskLevel = riskScore >= 75 ? "CRITICAL" : riskScore >= 45 ? "ELEVATED" : "NORMAL";
  const riskColor = riskScore >= 75 ? "#dc2626" : riskScore >= 45 ? "#ea580c" : "#16a34a";
  const riskBg = riskScore >= 75 ? "#fee2e2" : riskScore >= 45 ? "#ffedd5" : "#dcfce7";

  if (loadingZone && !zone) {
    return (
      <div className="incident-detail-container" style={{ padding: "30px", textAlign: "center" }}>
        <Loader2 className="animate-spin" size={36} color="#2563eb" style={{ margin: "40px auto 16px" }} />
        <h3 style={{ color: "#0f172a" }}>Loading Zone Intelligence...</h3>
        <p style={{ color: "#64748b" }}>Retrieving real-time hydrological & risk telemetry for Zone {id}...</p>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="incident-detail-container" style={{ padding: "30px", textAlign: "center" }}>
        <AlertTriangle size={48} color="#dc2626" style={{ margin: "40px auto 16px" }} />
        <h2 style={{ color: "#0f172a" }}>Zone Not Found ({id})</h2>
        <p style={{ color: "#64748b", maxWidth: "420px", margin: "10px auto 20px" }}>
          The requested risk zone could not be located in the current municipal registry.
        </p>
        <button className="primary" onClick={() => navigate("/map")}>
          ← Back to Live Risk Map
        </button>
      </div>
    );
  }

  return (
    <div className="incident-detail-container" style={{ padding: "20px 28px 48px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Breadcrumb Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate(-1)}
            className="ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                {zone.name}
              </h1>
              <span style={{ fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px", background: riskBg, color: riskColor, border: `1px solid ${riskColor}40` }}>
                {riskLevel === "CRITICAL" ? "🔴" : riskLevel === "ELEVATED" ? "🟠" : "🟢"} {riskLevel} ({riskScore}/100)
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              📍 <b>{zone.ward || "Civic Ward"}</b> · Zone ID: <b>{zone.id}</b> · Coordinates: <b>{zoneLat.toFixed(4)}, {zoneLng.toFixed(4)}</b>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => navigate("/map")}
            className="ghost"
            style={{ fontSize: "12px", padding: "7px 14px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <MapIcon size={14} /> Live Risk Map
          </button>
          <button
            onClick={() => onReload && onReload()}
            className="primary"
            style={{ fontSize: "12px", padding: "7px 14px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: "20px" }}>
        <div className="stat-card" style={{ borderLeft: `4px solid ${riskColor}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Risk Score</span>
            <Activity size={18} color={riskColor} />
          </div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: riskColor, marginTop: "4px" }}>
            {riskScore}<span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "500" }}>/100</span>
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Status: <b style={{ color: riskColor }}>{riskLevel}</b>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #0284c7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Rainfall Intensity</span>
            <CloudRain size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>
            {zone.rainfall || 0}<span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "500" }}> mm/hr</span>
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Live Radar: <b style={{ color: (zone.rainfall || 0) >= 40 ? "#dc2626" : "#0284c7" }}>{(zone.rainfall || 0) >= 50 ? "Heavy Downpour" : (zone.rainfall || 0) >= 25 ? "Moderate Rain" : "Light Showers"}</b>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #2563eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Flood Water Depth</span>
            <Droplets size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>
            {zone.waterLevel || 0}<span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "500" }}> cm</span>
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Trend: <b style={{ color: zone.trend === "rising" ? "#dc2626" : "#16a34a" }}>{zone.trend ? zone.trend.toUpperCase() : "STABLE"}</b>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #ea580c" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Active Incidents</span>
            <Siren size={18} color="#ea580c" />
          </div>
          <div style={{ fontSize: "26px", fontWeight: "900", color: zoneIncidents.length > 0 ? "#dc2626" : "#16a34a", marginTop: "4px" }}>
            {zoneIncidents.length}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Citizen Reports: <b>{zone.reports || zoneIncidents.length}</b>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="dispatch-layout" style={{ gap: "20px" }}>
        {/* Left Column: Interactive Map & Telemetry Details */}
        <div style={{ flex: "1 1 580px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Zone Focused Map */}
          <section className="panel" style={{ padding: "0", overflow: "hidden" }}>
            <div className="panel-head" style={{ padding: "12px 16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "14px" }}>Zone Geographic Sector & Emergency Assets</h3>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Live perimeter map with incidents & resources</span>
              </div>
              <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>● Realtime SSE</span>
            </div>
            <div style={{ height: "380px", position: "relative" }}>
              <LeafletMap
                zones={[zone]}
                incidents={zoneIncidents}
                resources={nearbyZoneResources}
                shelters={nearbyZoneShelters}
                selectedZoneId={zone.id}
                center={[zoneLat, zoneLng]}
                userLocation={[zoneLat, zoneLng]}
                userLocationName={zone.name}
                height="380px"
                zoom={15}
                onNavigateIncident={(incId) => navigate(`/incidents/${incId}`)}
              />
            </div>
          </section>

          {/* Drainage & Civic Diagnosis Card */}
          <section className="panel" style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Wrench size={18} color="#0284c7" />
              <h3 style={{ margin: 0, fontSize: "14px" }}>Drainage & Civic Hydrology Status</h3>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#334155" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ color: "#64748b", fontSize: "11px" }}>Primary Diagnosis Cause</div>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>{zone.cause || "Normal Drainage Flow"}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: "11px" }}>Stormwater Outfall Condition</div>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                    {riskScore >= 75 ? "Submerged / Silted Outfall" : riskScore >= 45 ? "High Tide Backflow Risk" : "Free Gravity Discharge"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: "11px" }}>Dewatering Requirement</div>
                  <div style={{ fontWeight: "700", color: riskScore >= 75 ? "#dc2626" : "#16a34a", marginTop: "2px" }}>
                    {riskScore >= 75 ? "500HP Dewatering Pump Deployed" : "Standard Gravity Drainage"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: "11px" }}>Chronic Hotspots in Ward</div>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                    {zoneBlockages.length} Chronic Silt Locations
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Active Alerts for this Zone */}
          {zoneAlerts.length > 0 && (
            <section className="panel" style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Bell size={18} color="#ea580c" />
                <h3 style={{ margin: 0, fontSize: "14px" }}>Active Broadcast Alerts for {zone.name}</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {zoneAlerts.map((alt) => (
                  <div key={alt.id} style={{ background: alt.level === "RED" ? "#fee2e2" : "#ffedd5", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${alt.level === "RED" ? "#fca5a5" : "#fed7aa"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ fontSize: "12px", color: alt.level === "RED" ? "#991b1b" : "#9a3412" }}>{alt.title}</b>
                      <span style={{ fontSize: "10px", fontWeight: "700", background: "#fff", padding: "2px 6px", borderRadius: "4px" }}>{alt.level}</span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#334155", margin: "4px 0" }}>{alt.message}</p>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>
                      Channels: {Array.isArray(alt.channels) ? alt.channels.join(", ") : alt.channels || "App"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Active Incidents & Emergency Resources */}
        <div style={{ flex: "1 1 480px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Active Incidents in Zone */}
          <section className="panel" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Siren size={18} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: "14px" }}>Active Incidents in Sector ({zoneIncidents.length})</h3>
              </div>
              <button onClick={() => navigate("/incidents")} className="ghost" style={{ fontSize: "11px", padding: "3px 8px" }}>
                View All Incidents &rarr;
              </button>
            </div>

            {zoneIncidents.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <CheckCircle2 size={28} color="#16a34a" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>No Active Emergency Reports</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>All incidents in this sector are resolved or normal.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {zoneIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <b style={{ fontSize: "13px", color: inc.isSos ? "#dc2626" : "#0f172a" }}>
                          {inc.isSos ? "🚨 " : "📍 "}{inc.id}
                        </b>
                        <span className={`map-badge ${inc.status === "Verified" ? "orange" : inc.status === "Resolved" ? "green" : "blue"}`} style={{ fontSize: "9px" }}>
                          {inc.status || "Received"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                        {inc.address || inc.cause || "Waterlogging Reported"} · {inc.time || "Just now"}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Nearby Emergency Resources */}
          <section className="panel" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Truck size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: "14px" }}>Emergency Resources & Infrastructure</h3>
              </div>
              <button onClick={() => navigate("/resources")} className="ghost" style={{ fontSize: "11px", padding: "3px 8px" }}>
                Manage Fleet &rarr;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "360px", overflowY: "auto" }}>
              {nearbyZoneResources.slice(0, 6).map((res) => {
                const catInfo = getAuthorityResourceCategory(res);
                return (
                  <div
                    key={res.id}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>{catInfo.icon}</span>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>{res.name}</div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {catInfo.label} · {res.status || "Available"}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "11px", fontWeight: "700", color: "#2563eb" }}>
                      {res.distanceKm != null ? `${res.distanceKm} km` : "Nearby"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Dedicated Resources Page with Dynamic Emergency Simulation
function ResourcesPage({
  resources = [],
  setResources,
  userLat = 19.132,
  userLng = 72.848,
  userLocationName = "Andheri / Mumbai Command Center",
  notify,
  onReload
}) {
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [lastGenMeta, setLastGenMeta] = useState(null);
  const [simError, setSimError] = useState(null);

  // Trigger Dynamic Simulation generation via backend Maps API lookup
  const handleGenerateSimulations = async () => {
    setGenerating(true);
    setSimError(null);
    try {
      if (notify) notify("Generating emergency resource simulation...");
      const res = await apiFetch("/resources/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: userLat,
          longitude: userLng,
          radius_km: 6.0
        })
      });

      if (res && res.success) {
        setLastGenMeta({
          simulation_id: res.simulation_id,
          count: res.count,
          facilities_count: res.facilities_count,
          categories_count: res.categories_count,
          center: res.center
        });
        if (typeof setResources === "function") {
          setResources(res.resources || []);
        }
        if (typeof onReload === "function") {
          onReload();
        }
        if (notify) {
          notify(`Simulation generated successfully. ${res.count} resources across ${res.facilities_count} nearby facilities in ${res.categories_count} resource categories.`);
        }
      } else {
        throw new Error(res?.error || "Unable to discover nearby facilities.");
      }
    } catch (err) {
      console.error("[Generate Simulations Error]:", err);
      setSimError(err.message || "Unable to discover nearby facilities.");
      if (notify) notify("Simulation generation failed: " + (err.message || "Maps API lookup failed"));
    } finally {
      setGenerating(false);
    }
  };

  // Clear simulated resource inventory
  const handleClearSimulation = async () => {
    setClearing(false);
    try {
      setClearing(true);
      await apiFetch("/resources/simulate", { method: "DELETE" });
      if (typeof setResources === "function") {
        setResources([]);
      }
      if (typeof onReload === "function") {
        onReload();
      }
      setLastGenMeta(null);
      if (notify) notify("Resource simulation cleared. Inventory is now empty.");
    } catch (err) {
      if (notify) notify("Failed to clear simulation: " + err.message);
    } finally {
      setClearing(false);
    }
  };

  const simulationId = lastGenMeta?.simulation_id || resources[0]?.simulation_id;
  const uniqueFacilities = new Set(resources.map((r) => r.agency || r.station || r.base_location)).size;
  const uniqueCategories = new Set(resources.map((r) => (r.category || r.resource_type || "RESCUE").toUpperCase())).size;

  // Category counts
  const rescueCount = resources.filter((r) => (r.category || r.resource_type || "").toUpperCase() === "RESCUE").length;
  const medicalCount = resources.filter((r) => (r.category || r.resource_type || "").toUpperCase() === "MEDICAL").length;
  const foodCount = resources.filter((r) => (r.category || r.resource_type || "").toUpperCase() === "FOOD").length;
  const waterCount = resources.filter((r) => (r.category || r.resource_type || "").toUpperCase() === "WATER").length;
  const shelterCount = resources.filter((r) => (r.category || r.resource_type || "").toUpperCase() === "SHELTER").length;

  // Filtered resources
  const filteredResources = resources.filter((r) => {
    const cat = (r.category || r.resource_type || "RESCUE").toUpperCase();
    if (categoryFilter !== "ALL" && cat !== categoryFilter) return false;

    const status = (r.status || "AVAILABLE").toUpperCase();
    if (statusFilter !== "ALL") {
      if (statusFilter === "AVAILABLE" && (status !== "AVAILABLE" && status !== "READY")) return false;
      if (statusFilter === "LIMITED" && status !== "LIMITED") return false;
      if (statusFilter === "DEPLOYED" && (status === "AVAILABLE" || status === "LIMITED")) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (r.name || "").toLowerCase().includes(q);
      const matchAgency = (r.agency || r.station || "").toLowerCase().includes(q);
      const matchLoc = (r.base_location || r.address || "").toLowerCase().includes(q);
      const matchCap = (r.capacity || "").toLowerCase().includes(q);
      const matchCat = cat.toLowerCase().includes(q);
      if (!matchName && !matchAgency && !matchLoc && !matchCap && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="content">
      <PageHeader
        title="Team Tracker"
        sub="Live inventory and readiness of emergency rescue units, medical fleets, and relief facilities"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {resources.length > 0 && (
            <button
              className="ghost"
              onClick={handleClearSimulation}
              disabled={clearing || generating}
              style={{ color: "#dc2626", borderColor: "#fecaca", background: "#fef2f2" }}
              title="Clear all generated simulations"
            >
              {clearing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
              Clear Simulation
            </button>
          )}

          {resources.length > 0 && (
            <button className="ghost" onClick={onReload} disabled={generating}>
              <RefreshCw size={14} /> Refresh Status
            </button>
          )}

          <button
            className="primary"
            onClick={handleGenerateSimulations}
            disabled={generating}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {generating ? (
              <>
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>{resources.length > 0 ? "Regenerate Simulation" : "Generate Simulations"}</span>
              </>
            )}
          </button>
        </div>
      </PageHeader>

      {/* Generating Full Banner Loading State */}
      {generating && (
        <div style={{
          background: "#ffffff",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow: "0 2px 8px rgba(37, 99, 235, 0.06)"
        }}>
          <Loader2 size={24} style={{ color: "#2563eb", animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <div>
            <b style={{ fontSize: "14px", color: "#0f172a" }}>Generating emergency resource simulation...</b>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "3px 0 0" }}>
              Querying Google Maps API for nearby Fire Stations, Hospitals, NGOs, and Municipal Facilities around {userLocationName}...
            </p>
          </div>
        </div>
      )}

      {/* Error State Banner */}
      {simError && !generating && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: "12px",
          padding: "14px 18px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={18} style={{ color: "#dc2626" }} />
            <div>
              <b style={{ color: "#991b1b", fontSize: "13px" }}>{simError}</b>
              <div style={{ color: "#b91c1c", fontSize: "12px", marginTop: "2px" }}>
                Ensure your internet connection and Maps API key are active.
              </div>
            </div>
          </div>
          <button className="primary small" onClick={handleGenerateSimulations}>
            <RefreshCw size={12} /> Retry Simulation
          </button>
        </div>
      )}

      {/* INITIAL EMPTY STATE (When no simulations have been generated) */}
      {resources.length === 0 && !generating ? (
        <div className="resource-empty-state">
          <div className="resource-empty-icon">
            <Layers3 size={30} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
            Emergency Resource Inventory
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "480px", marginBottom: "22px", lineHeight: "1.5" }}>
            The inventory is empty. Discover real nearby facilities (Fire Stations, Hospitals, NGOs, Relief Shelters) from Google Maps around <b>{userLocationName || "Mumbai Operational Area"}</b> and simulate live readiness.
          </p>

          <button
            className="primary"
            style={{ padding: "10px 22px", fontSize: "13px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "8px" }}
            onClick={handleGenerateSimulations}
            disabled={generating}
          >
            <Sparkles size={16} />
            <span>Generate Simulations</span>
          </button>
        </div>
      ) : resources.length > 0 && (
        <>
          {/* Active Simulation Summary Banner */}
          <div className="simulation-banner">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div className="sim-status-pill">
                <CheckCircle2 size={14} style={{ color: "#16a34a" }} />
                <span>SIMULATION ACTIVE</span>
                {simulationId && (
                  <span className="sim-id-code">
                    {simulationId}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "13px", color: "#334155" }}>
                <b>{resources.length} resources</b> discovered across <b>{uniqueFacilities} nearby facilities</b> in <b>{uniqueCategories} categories</b>.
              </div>
            </div>

            <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
              <MapPin size={13} style={{ color: "#2563eb" }} />
              <span>Center: <b style={{ color: "#0f172a" }}>{userLocationName || "Mumbai Command"}</b></span>
            </div>
          </div>

          {/* Filter & Controls Bar */}
          <div className="resource-filter-bar">
            {/* Category Pills */}
            <div className="resource-filter-pills">
              <button
                className={`resource-filter-pill ${categoryFilter === "ALL" ? "active" : ""}`}
                onClick={() => setCategoryFilter("ALL")}
              >
                All ({resources.length})
              </button>
              <button
                className={`resource-filter-pill ${categoryFilter === "RESCUE" ? "active" : ""}`}
                onClick={() => setCategoryFilter("RESCUE")}
              >
                🚒 Rescue ({rescueCount})
              </button>
              <button
                className={`resource-filter-pill ${categoryFilter === "MEDICAL" ? "active" : ""}`}
                onClick={() => setCategoryFilter("MEDICAL")}
              >
                🚑 Medical ({medicalCount})
              </button>
              <button
                className={`resource-filter-pill ${categoryFilter === "FOOD" ? "active" : ""}`}
                onClick={() => setCategoryFilter("FOOD")}
              >
                🍱 Food ({foodCount})
              </button>
              <button
                className={`resource-filter-pill ${categoryFilter === "WATER" ? "active" : ""}`}
                onClick={() => setCategoryFilter("WATER")}
              >
                💧 Water ({waterCount})
              </button>
              <button
                className={`resource-filter-pill ${categoryFilter === "SHELTER" ? "active" : ""}`}
                onClick={() => setCategoryFilter("SHELTER")}
              >
                🛏️ Shelter ({shelterCount})
              </button>
            </div>

            {/* Status & Search & View Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {/* Search Box */}
              <div style={{ position: "relative", minWidth: "190px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Filter resources or facilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "6px 10px 6px 30px",
                    fontSize: "12px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    color: "#0f172a",
                    width: "100%",
                    outline: "none"
                  }}
                />
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#0f172a",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available Only</option>
                <option value="LIMITED">Limited Only</option>
                <option value="DEPLOYED">Deployed / Allocated</option>
              </select>

              {/* View Toggle */}
              <div style={{ display: "flex", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "2px" }}>
                <button
                  style={{
                    padding: "5px 10px",
                    fontSize: "11px",
                    fontWeight: "600",
                    background: viewMode === "grid" ? "#ffffff" : "transparent",
                    color: viewMode === "grid" ? "#0f172a" : "#64748b",
                    boxShadow: viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={() => setViewMode("grid")}
                >
                  Cards
                </button>
                <button
                  style={{
                    padding: "5px 10px",
                    fontSize: "11px",
                    fontWeight: "600",
                    background: viewMode === "table" ? "#ffffff" : "transparent",
                    color: viewMode === "table" ? "#0f172a" : "#64748b",
                    boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={() => setViewMode("table")}
                >
                  Table
                </button>
              </div>
            </div>
          </div>

          {/* Filter results empty state */}
          {filteredResources.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", margin: "20px 0" }}>
              <Filter size={24} style={{ color: "#94a3b8", marginBottom: "8px" }} />
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>No matching resources</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                No resources match the selected category ("{categoryFilter}") or search criteria.
              </div>
              <button
                className="ghost small"
                style={{ marginTop: "12px" }}
                onClick={() => { setCategoryFilter("ALL"); setStatusFilter("ALL"); setSearchQuery(""); }}
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="resource-grid">
              {filteredResources.map((r) => (
                <ResourceCard key={r.id} team={r} userLat={userLat} userLng={userLng} />
              ))}
            </div>
          ) : (
            /* TABLE VIEW */
            <div style={{ overflowX: "auto", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "12px 16px" }}>Resource</th>
                    <th style={{ padding: "12px 16px" }}>Category</th>
                    <th style={{ padding: "12px 16px" }}>Agency / Facility</th>
                    <th style={{ padding: "12px 16px" }}>Quantity</th>
                    <th style={{ padding: "12px 16px" }}>Location</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map((r) => {
                    const cat = (r.category || r.resource_type || "RESCUE").toUpperCase();
                    const statusUpper = (r.status || "AVAILABLE").toUpperCase();
                    const isAvail = statusUpper === "AVAILABLE" || statusUpper === "READY";
                    const isLim = statusUpper === "LIMITED";
                    const lat = r.latitude ?? r.lat;
                    const lng = r.longitude ?? r.lng;
                    const mapLink = (lat && lng) ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;

                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "16px" }}>{r.emoji || "📦"}</span>
                            <div>
                              <b style={{ color: "#0f172a" }}>{r.name}</b>
                              {r.capacity && <div style={{ fontSize: "11px", color: "#64748b" }}>{r.capacity}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`resource-badge-category ${cat.toLowerCase()}`}>{cat}</span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#334155", fontWeight: "600" }}>
                          {r.agency || r.station || "Disaster Command"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <b style={{ color: "#2563eb", fontSize: "13px" }}>
                            {r.quantity != null ? `${r.quantity} ${r.unit || "Units"}` : "Operational"}
                          </b>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <MapPin size={12} style={{ color: "#2563eb", flexShrink: 0 }} />
                            <span style={{ color: "#334155" }}>{r.base_location || r.address || r.station || "Real Facility"}</span>
                            {mapLink && (
                              <a href={mapLink} target="_blank" rel="noreferrer" style={{ color: "#2563eb", marginLeft: "4px" }}>
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`resource-status-pill ${isAvail ? "available" : isLim ? "limited" : "dispatched"}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Chronic Blockage & Drainage Intelligence Page
function Drainage({ zones, incidents, chronicBlockages, notify, onGenerateReport }) {
  return (
    <div className="content">
      <PageHeader
        eyebrow="PREVENTIVE MAINTENANCE & CHRONIC BLOCKAGE TRACKER"
        title="Drainage Intelligence & Recurring Blockages"
        sub="Persistent ground evidence and low-rainfall water accumulation reveal chronic drainage bottlenecks."
      >
        <button className="primary" onClick={onGenerateReport}>
          <FileText size={16} /> Export BMC Desilting Directives
        </button>
      </PageHeader>

      <div className="stats-grid">
        <StatCard label="Chronic Hotspots" value={chronicBlockages.length} delta="Monitored in Ward 72/73" icon={Wrench} tone="orange" />
        <StatCard label="Action Required" value={chronicBlockages.filter((b) => b.status === "Desilting Required").length} delta="Desilting work orders" icon={AlertCircle} tone="red" />
        <StatCard label="Evidence Clusters" value={incidents.length} delta="GPS ground truth" icon={Layers3} tone="blue" />
        <StatCard label="Outfall Corridors" value="4" delta="Active drainage gates" icon={Activity} tone="green" />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Monitored Chronic Blockage Hotspots</h3>
            <span>Recurring flood locations flagged repeatedly across monsoons</span>
          </div>
        </div>
        <div className="chronic-grid">
          {chronicBlockages.map((b) => (
            <div className="chronic-card" key={b.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <b style={{ fontSize: "14px", color: "#0f172a" }}>{b.name}</b>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{b.ward} · Hotspot ID: {b.id}</div>
                </div>
                <span className="flag-count-pill">
                  <AlertCircle size={12} /> Flagged {b.flagCount} times
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#334155", background: "#f8fafc", padding: "8px", borderLeft: "3px solid #f97316", borderRadius: "4px" }}>
                <b>Root Obstruction:</b> {b.primaryCause}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span>Severity: <b>{b.severityTrend}</b></span>
                <span>Status: <b style={{ color: b.status === "Desilting Required" ? "#dc2626" : "#2563eb" }}>{b.status}</b></span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


// Live Data Sources Probe Page
function Sources({ notify }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/data-sources");
      setSources(data);
      notify("Data source live latency & health checks completed.");
    } catch (err) {
      notify("Failed to probe data sources: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return (
    <div className="content">
      <PageHeader
        eyebrow="DATA & INTEGRATIONS · LIVE PROBES"
        title="Live Data Sources & Network Health"
        sub="Real-time latency probes and connection health for Open-Meteo, OpenStreetMap, OSRM, and storage."
      >
        <button className="ghost" onClick={fetchSources} disabled={loading}>
          <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Testing..." : "Test Connections"}
        </button>
      </PageHeader>
      <div className="source-grid">
        {sources.map((s) => (
          <div className="panel source-card" key={s.name}>
            <div className="source-icon"><Database size={18} /></div>
            <div>
              <b>{s.name}</b>
              <span>{s.kind}</span>
            </div>
            <em className="connected" style={{ background: s.status === "Live" || s.status === "Active" ? "#ebfaf4" : "#fef3c7" }}>
              {s.status}
            </em>
            <div className="source-line">
              <i style={{ background: s.status === "Live" || s.status === "Active" ? "#13b978" : "#f59e0b" }}></i>
              <small>Latency: <b>{s.latency}</b> · Last ping: {s.lastSync || "Just now"}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Settings Page
function SettingsPage({ notify }) {
  return (
    <div className="content">
      <PageHeader eyebrow="CONTROL CENTER" title="System Settings" sub="Configure risk score bands and notification channels." />
      <div className="settings-grid">
        <section className="panel form-panel">
          <h3>Risk Thresholds</h3>
          <p>Bands for Red, Orange, and early warning.</p>
          {[
            ["Red threshold", "75"],
            ["Orange threshold", "45"],
            ["Alert lead-time target (min)", "20"]
          ].map((x) => (
            <label key={x[0]}>
              {x[0]}
              <input defaultValue={x[1]} type="number" />
            </label>
          ))}
          <button className="primary" onClick={() => notify("Risk thresholds updated.")}>
            Save Changes
          </button>
        </section>
        <section className="panel form-panel">
          <h3>Notification Channels</h3>
          <p>Channels used for citizen alert broadcasts.</p>
          {["In-app push notifications", "SMS gateway (Twilio)", "WhatsApp alerts", "Operations dashboard bus"].map((x) => (
            <label className="check-row" key={x}>
              <input type="checkbox" defaultChecked />
              {x}
              <span></span>
            </label>
          ))}
        </section>
      </div>
    </div>
  );
}


const DAG_STAGES = [
  {
    id: "observation-agent",
    name: "Observation",
    phase: "Perception",
    icon: Eye,
    role: "Multisource Hydrological Perception",
    description: "Ingests raw IoT rain gauges, municipal ultrasonic flood depth sensors, telemetry streams, and natural language field logs.",
    inputs: ["IoT Rain Gauges (mm/hr)", "Ultrasonic Depth Sensors (cm)", "Field Telemetry Notes"],
    outputs: ["Standardized Observation Matrix", "Confidence Score", "Sensor Cross-Validation"]
  },
  {
    id: "evidence-agent",
    name: "Evidence Check",
    phase: "Verification",
    icon: CheckCircle2,
    role: "Multi-Modal Evidence Synthesis",
    description: "Correlates citizen crowd reports, geofenced photo hashes, historical zone baseline thresholds, and sensor telemetry to calculate tamper-proof confidence.",
    inputs: ["Citizen Crowd Reports", "Zone Threshold Matrix", "Sensor Consistency Vector"],
    outputs: ["Confidence Rating (0-100%)", "Verification Classification", "Discrepancy Flags"]
  },
  {
    id: "risk-agent",
    name: "Risk Scoring",
    phase: "Assessment",
    icon: AlertTriangle,
    role: "Hyperlocal Hydrological Risk Scoring",
    description: "Computes base flood severity, incorporates exposure boost (vulnerability density, onset rate, critical infrastructure), and yields RED/ORANGE/YELLOW tiering.",
    inputs: ["Water Depth (cm)", "Rainfall Rate (mm)", "Citizen Vulnerability Density", "Onset Rate Vector"],
    outputs: ["Composite Risk Score (0-100)", "Risk Classification (RED/ORANGE/YELLOW)", "Exposure Boost Delta"]
  },
  {
    id: "cause-agent",
    name: "Cause Diagnosis",
    phase: "Reasoning",
    icon: BrainCircuit,
    role: "Causal Failure Inference",
    description: "Employs rule-based heuristics and topological terrain logic to determine primary cause (drainage blockage, high-tide backflow, flash storm runoff).",
    inputs: ["Drainage Obstruction Signal", "Rainfall Intensity", "Topological Basin Model"],
    outputs: ["Root Cause Classification Code", "Human Descriptive Name", "Confidence Metric"]
  },
  {
    id: "resource-agent",
    name: "Resource Match",
    phase: "Dispatch",
    icon: Truck,
    role: "Spatial Dispatch & Fleet Optimization",
    description: "Ranks municipal emergency teams and high-capacity dewatering pumps based on geodesic Haversine distance, equipment compatibility, and readiness.",
    inputs: ["Available Response Units", "Equipment Profiles", "Root Cause & Incident Location"],
    outputs: ["Ranked Response Fleet", "Top Recommended Unit", "Estimated Transit Time"]
  },
  {
    id: "route-agent",
    name: "Safety Routing",
    phase: "Evacuation",
    icon: RouteIcon,
    role: "Corridor Safety & Evacuation Policy",
    description: "Evaluates inundation severity to trigger safe evacuation corridors or advisory shelter-in-place instructions, avoiding submerged arterial roads.",
    inputs: ["Calculated Flood Risk Tier", "Road Inundation Depths", "Surrounding Shelter Coordinates"],
    outputs: ["Evacuation Requirement Boolean", "Actionable Travel Advisory", "Routing Policy Mode"]
  },
  {
    id: "notification-agent",
    name: "Notifications",
    phase: "Broadcast",
    icon: Bell,
    role: "Multi-Channel Broadcast Synthesis",
    description: "Synthesizes concise citizen warnings and multi-channel dispatch payloads across WhatsApp, SMS, Push, and Authority operations feeds.",
    inputs: ["Risk Tier", "Root Cause", "Safe Corridors", "Audience Geofence"],
    outputs: ["Broadcast Warning Message", "Escalation Tier", "Target Distribution Channels"]
  },
  {
    id: "audit-agent",
    name: "Audit Guardrail",
    phase: "Governance",
    icon: ShieldCheck,
    role: "Cryptographic Provenance & Guardrails",
    description: "Computes SHA-256 evidence digests, registers geohash cells, generates cryptographic execution traces, and enforces human-in-the-loop sign-off for critical risks.",
    inputs: ["Full Pipeline State Vector", "Decision Matrices", "Supervisor Rules"],
    outputs: ["Cryptographic Trace Hash", "Human Approval Requirement", "Immutable Audit Record"]
  }
];

const MAC_PRESETS = [
  {
    id: "preset-monsoon-flash",
    name: "Monsoon Flash Surge",
    tag: "CRITICAL RED",
    color: "#ef4444",
    scenario: {
      rainfall: 98,
      waterLevel: 58,
      reports: 24,
      note: "Extreme monsoon downpour. Inflow overflowing arterial roads, multiple vehicles stalled near underpass.",
      blockedDrainSignal: true,
      lat: 19.1197,
      lng: 72.8468,
      vulnerablePeople: 12,
      onsetSpeed: "0–10 min",
      drainPenalty: 18
    }
  },
  {
    id: "preset-drain-clog",
    name: "Chronic Silt & Trash Clog",
    tag: "ORANGE WARNING",
    color: "#f59e0b",
    scenario: {
      rainfall: 48,
      waterLevel: 42,
      reports: 9,
      note: "Storm drain choked with plastic debris and construction silt. Inundation rising despite moderate rainfall.",
      blockedDrainSignal: true,
      lat: 19.1155,
      lng: 72.8432,
      vulnerablePeople: 4,
      onsetSpeed: "10–30 min",
      drainPenalty: 22
    }
  },
  {
    id: "preset-powai-corridor",
    name: "Powai Commercial Corridor",
    tag: "URBAN ELEVATED",
    color: "#3b82f6",
    scenario: {
      rainfall: 72,
      waterLevel: 36,
      reports: 11,
      note: "Water accumulation outside Nahar Amrit Shakti and Vinca commercial junction. Pedestrian movement restricted.",
      blockedDrainSignal: false,
      lat: 19.1172,
      lng: 72.8988,
      vulnerablePeople: 7,
      onsetSpeed: "10–30 min",
      drainPenalty: 8
    }
  },
  {
    id: "preset-monitored-flow",
    name: "Monitored Stable Flow",
    tag: "LOW RISK",
    color: "#10b981",
    scenario: {
      rainfall: 18,
      waterLevel: 10,
      reports: 1,
      note: "Routine monsoon drizzle. Clear culverts with adequate gravity discharge into local storm outfall.",
      blockedDrainSignal: false,
      lat: 19.1250,
      lng: 72.8550,
      vulnerablePeople: 0,
      onsetSpeed: "Gradual",
      drainPenalty: 0
    }
  }
];

const AGENT_ICONS = {
  "observation-agent": Eye,
  "evidence-agent": CheckCircle2,
  "risk-agent": AlertTriangle,
  "cause-agent": BrainCircuit,
  "resource-agent": Truck,
  "route-agent": RouteIcon,
  "notification-agent": Bell,
  "audit-agent": ShieldCheck
};

function MultiAgentOps({ incidents: propIncidents = [], resources: propResources = [], zones: propZones = [], notify, onReload }) {
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [incidents, setIncidents] = useState(propIncidents);
  const [resources, setResources] = useState(propResources);
  const [selectedIncident, setSelectedIncident] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepperMode, setStepperMode] = useState(true);
  const [activeDagStep, setActiveDagStep] = useState(-1);
  const [activeTab, setActiveTab] = useState("decision"); // decision | trace | candidates | audit
  const [copied, setCopied] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all"); // all | red | pending
  const [selectedAgentNode, setSelectedAgentNode] = useState(null);
  const [activePresetId, setActivePresetId] = useState("");

  const [scenario, setScenario] = useState({
    rainfall: 82,
    waterLevel: 46,
    reports: 14,
    note: "Severe waterlogging at subway entrance. 3 vehicles immobilized. Inflow overflowing roadside drains.",
    blockedDrainSignal: true,
    lat: 19.1197,
    lng: 72.8468,
    vulnerablePeople: 6,
    onsetSpeed: "0–10 min",
    drainPenalty: 15
  });

  // Sync props if provided
  useEffect(() => {
    if (propIncidents && propIncidents.length > 0) setIncidents(propIncidents);
  }, [propIncidents]);

  useEffect(() => {
    if (propResources && propResources.length > 0) setResources(propResources);
  }, [propResources]);

  // Load backend status and runs
  const load = useCallback(async () => {
    try {
      const [agentStatus, agentRuns, incidentList] = await Promise.all([
        apiFetch("/agents/status"),
        apiFetch("/agents/runs?limit=15"),
        propIncidents.length ? Promise.resolve(propIncidents) : apiFetch("/incidents").catch(() => [])
      ]);
      setStatus(agentStatus);
      setRuns(agentRuns || []);
      if (!propIncidents.length) setIncidents(incidentList || []);
      // If we don't have an active analysis yet, load the latest run if available
      if (agentRuns && agentRuns.length > 0 && !analysis) {
        setAnalysis(agentRuns[0]);
      }
    } catch (err) {
      console.error("[MultiAgentOps] Load error:", err);
    }
  }, [propIncidents, analysis]);

  useEffect(() => {
    load();
  }, [load]);

  // Handle Preset Scenario Selection
  const handleApplyPreset = (preset) => {
    setActivePresetId(preset.id);
    setSelectedIncident("");
    setScenario({ ...preset.scenario });
    if (notify) notify(`Loaded scenario preset: ${preset.name}`);
  };

  // Handle Incident Selection with Auto-Fill
  const handleSelectIncident = (incId) => {
    setSelectedIncident(incId);
    setActivePresetId("");
    if (!incId) return;
    const inc = incidents.find((i) => i.id === incId);
    if (inc) {
      setScenario({
        lat: Number(inc.lat || 19.132),
        lng: Number(inc.lng || 72.848),
        rainfall: Number(inc.rainfallMm || inc.rainfall || 50),
        waterLevel: Number(inc.water_level || inc.waterLevel || 30),
        reports: Number(inc.reports || inc.reportCount || 3),
        note: inc.note || inc.description || "Active incident reported by ground observer",
        blockedDrainSignal: Boolean(inc.cause?.toLowerCase().includes("drain") || inc.blockedDrainSignal),
        vulnerablePeople: Number(inc.vulnerablePeople || 2),
        onsetSpeed: inc.onsetSpeed || "10–30 min",
        drainPenalty: Number(inc.drainPenalty || 8)
      });
      if (notify) notify(`Auto-filled scenario parameters from incident ${inc.id}`);
    }
  };

  // Execute Multi-Agent Orchestration with optional Stepper Animation
  const runOrchestration = async () => {
    setLoading(true);
    setActiveDagStep(-1);
    try {
      if (stepperMode) {
        // Animate through DAG nodes
        for (let i = 0; i < DAG_STAGES.length; i++) {
          setActiveDagStep(i);
          await new Promise((res) => setTimeout(res, 260));
        }
      }

      const payload = { ...scenario };
      const result = selectedIncident
        ? await apiFetch(`/incidents/${selectedIncident}/coordinate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
        : await apiFetch("/agents/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

      setAnalysis(result);
      setActiveTab("decision");
      await load();
      if (onReload) onReload();
      if (notify) notify("Multi-agent orchestration completed!");
    } catch (err) {
      console.error("[MultiAgentOps] Orchestration error:", err);
      if (notify) notify(`Orchestration failed: ${err.message}`);
    } finally {
      setLoading(false);
      setActiveDagStep(-1);
    }
  };

  // Run What-If Simulations
  const runSimulation = async () => {
    try {
      const result = await apiFetch("/simulations/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenario)
      });
      setSimulation(result.scenarios || []);
      setActiveTab("simulation");
      if (notify) notify("Simulated 4 what-if scenarios based on current scenario parameters.");
    } catch (err) {
      if (notify) notify(`Simulation failed: ${err.message}`);
    }
  };

  // Human-in-the-Loop Actions
  const handleHumanAction = async (action, extra = {}) => {
    if (!analysis?.runId) return;
    try {
      const res = await apiFetch(`/agents/runs/${analysis.runId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra })
      });
      if (res.run) {
        setAnalysis(res.run);
      }
      await load();
      if (onReload) onReload();
      if (action === "approve") {
        if (notify) notify(`Approved! Response unit dispatched: ${analysis.decision?.resource?.recommended?.name || "Team"}`);
      } else if (action === "override") {
        if (notify) notify(`Overridden! Alternate team assigned: ${extra.team || "Team"}`);
      } else if (action === "false_alarm") {
        if (notify) notify("Flagged as false alarm. Incident status updated.");
      }
    } catch (err) {
      if (notify) notify(`Action failed: ${err.message}`);
    }
  };

  // Copy Broadcast Alert to Clipboard
  const handleCopyAlert = () => {
    if (!analysis?.decision?.notification?.message) return;
    navigator.clipboard.writeText(analysis.decision.notification.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (notify) notify("Alert notification message copied to clipboard!");
  };

  // Export Trace JSON
  const handleExportTrace = () => {
    if (!analysis) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysis, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `varsharaksha_trace_${analysis.runId || "run"}.json`);
    dlAnchorElem.click();
    if (notify) notify("Audit trace exported as JSON.");
  };

  // Clear Run History
  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all coordination run history?")) return;
    try {
      await apiFetch("/agents/runs", { method: "DELETE" });
      setRuns([]);
      if (notify) notify("Agent coordination run history cleared.");
    } catch (err) {
      if (notify) notify(`Failed to clear runs: ${err.message}`);
    }
  };

  // Filtered past runs
  const filteredRuns = runs.filter((r) => {
    if (historyFilter === "red") return r.decision?.risk?.label === "RED";
    if (historyFilter === "pending") return r.audit?.approvalStatus === "pending_approval";
    return true;
  });

  const isRed = analysis?.decision?.risk?.label === "RED";
  const isOrange = analysis?.decision?.risk?.label === "ORANGE";
  const approvalPending = analysis?.audit?.humanApprovalRequired && analysis?.audit?.approvalStatus === "pending_approval";
  const isApproved = analysis?.audit?.approvalStatus === "approved";
  const isOverridden = analysis?.audit?.approvalStatus === "overridden";

  return (
    <div className="page mac-container" style={{ paddingBottom: 60 }}>
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 8px #10b981" }} />
            SUPERVISOR ORCHESTRATION ENGINE · ONLINE
          </div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
            Multi-Agent Control Center
            <span style={{ fontSize: 13, fontWeight: 600, padding: "4px 10px", background: "#e0f2fe", color: "#0369a1", borderRadius: 20 }}>
              Sequential + Explainable DAG
            </span>
          </h1>
          <p className="muted" style={{ maxWidth: 840 }}>
            An autonomous multi-agent pipeline providing verifiable consensus for perception, multi-modal evidence verification, hyperlocal risk scoring, cause diagnosis, resource routing, and tamper-evident audit logging.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn secondary" onClick={() => load()}>
            <RefreshCw size={15} /> Refresh Telemetry
          </button>
          <button className="btn secondary" onClick={handleExportTrace} disabled={!analysis}>
            <Download size={15} /> Export Trace
          </button>
        </div>
      </div>

      {/* Cyber-HUD Telemetry Ribbon */}
      <div className="mac-telemetry-ribbon">
        <div className="mac-telemetry-item">
          <div className="mac-telemetry-icon">
            <Zap size={18} />
          </div>
          <div className="mac-telemetry-content">
            <span className="mac-telemetry-label">Supervisor Engine</span>
            <span className="mac-telemetry-value">
              Online · Fast-DAG
            </span>
          </div>
        </div>

        <div className="mac-telemetry-item">
          <div className="mac-telemetry-icon" style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
            <BrainCircuit size={18} />
          </div>
          <div className="mac-telemetry-content">
            <span className="mac-telemetry-label">Active Micro-Agents</span>
            <span className="mac-telemetry-value">8 Verifiable Agents</span>
          </div>
        </div>

        <div className="mac-telemetry-item">
          <div className="mac-telemetry-icon" style={{ color: "#a855f7", background: "rgba(168, 85, 247, 0.12)", borderColor: "rgba(168, 85, 247, 0.3)" }}>
            <ShieldCheck size={18} />
          </div>
          <div className="mac-telemetry-content">
            <span className="mac-telemetry-label">Audit Provenance</span>
            <span className="mac-telemetry-value">SHA-256 State Ledger</span>
          </div>
        </div>

        <div className="mac-telemetry-item">
          <div className="mac-telemetry-icon" style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
            <AlertTriangle size={18} />
          </div>
          <div className="mac-telemetry-content">
            <span className="mac-telemetry-label">Guardrail Protocol</span>
            <span className="mac-telemetry-value">Human Sign-off on RED</span>
          </div>
        </div>
      </div>

      {/* Quick Scenario Presets */}
      <div className="mac-presets-bar">
        <span className="mac-presets-label">
          <Sparkles size={14} color="#3b82f6" /> Scenario Presets:
        </span>
        {MAC_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              className={`mac-preset-btn ${isActive ? "active" : ""}`}
              onClick={() => handleApplyPreset(preset)}
            >
              <span>{preset.name}</span>
              <span className="mac-preset-tag" style={{ color: isActive ? "#ffffff" : preset.color }}>
                {preset.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual Workflow: Multi-Agent DAG Pipeline */}
      <section className="mac-dag-panel">
        <div className="mac-dag-header">
          <div className="mac-dag-title">
            <BrainCircuit size={22} color="#38bdf8" />
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Multi-Agent Execution Pipeline</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                Click any agent node to inspect its bounded role, inputs, and real-time execution outputs.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={stepperMode}
                onChange={(e) => setStepperMode(e.target.checked)}
              />
              Animated Stepper Mode
            </label>
            <span className="status-pill success" style={{ fontSize: 11 }}>Supervisor Active</span>
          </div>
        </div>

        <div className="mac-dag-flow">
          {DAG_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isStepActive = activeDagStep === idx;
            const agentOutput = analysis?.agents?.find((a) => a.id === stage.id)?.output;
            const isCompleted = Boolean(analysis && !loading);

            // Compute helpful summary snippet
            let snippet = stage.phase;
            if (stage.id === "observation-agent" && agentOutput?.observation) {
              snippet = `${agentOutput.observation.rainfall}mm · ${agentOutput.observation.waterLevel}cm`;
            } else if (stage.id === "evidence-agent" && agentOutput?.confidence) {
              snippet = `${agentOutput.confidence.confidence}% Conf · ${agentOutput.verification}`;
            } else if (stage.id === "risk-agent" && agentOutput?.score != null) {
              snippet = `Risk ${agentOutput.score}/100 (${agentOutput.label})`;
            } else if (stage.id === "cause-agent" && agentOutput?.code) {
              snippet = agentOutput.name || agentOutput.code;
            } else if (stage.id === "resource-agent" && agentOutput?.recommended) {
              snippet = agentOutput.recommended.name ? agentOutput.recommended.name.split(" ")[0] + " Unit" : "Recommended";
            } else if (stage.id === "route-agent" && agentOutput?.evacuationRequired != null) {
              snippet = agentOutput.evacuationRequired ? "Evacuate" : "Safe Corridors";
            } else if (stage.id === "notification-agent" && agentOutput?.escalation) {
              snippet = `${agentOutput.escalation} Tier`;
            } else if (stage.id === "audit-agent" && agentOutput?.traceId) {
              snippet = "Cryptographic Trace";
            }

            return (
              <div
                key={stage.id}
                className={`mac-dag-node ${isStepActive ? "active-step" : ""} ${isCompleted ? "completed" : ""}`}
                onClick={() => setSelectedAgentNode(stage)}
                title={`Click to inspect ${stage.name}`}
              >
                <div className="mac-dag-node-top">
                  <span className="mac-dag-node-step">0{idx + 1}</span>
                  <div className="mac-dag-node-icon">
                    <Icon size={14} />
                  </div>
                </div>
                <div className="mac-dag-node-name" title={stage.name}>{stage.name}</div>
                <div className="mac-dag-node-snippet" title={snippet}>{snippet}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Studio Grid: Orchestration Controls on Left, Decision Intelligence on Right */}
      <div className="mac-studio-grid">
        {/* Left Column: Input Studio & Spatial Context */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className="mac-card">
            <div className="mac-card-title">
              <div>
                <h3>Orchestration Studio</h3>
                <p>Simulate flood telemetry or coordinate with live municipal reports.</p>
              </div>
              <Zap size={20} color="#2563eb" />
            </div>

            {/* Existing Incident Picker */}
            <div className="mac-form-group">
              <label className="mac-form-label">
                <span>Select Ground Incident</span>
                {selectedIncident && (
                  <span className="mac-form-badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                    Linked: {selectedIncident}
                  </span>
                )}
              </label>
              <select
                className="mac-form-select"
                value={selectedIncident}
                onChange={(e) => handleSelectIncident(e.target.value)}
              >
                <option value="">-- Custom Simulation / Real-time Test --</option>
                {incidents.slice(0, 25).map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id} · {inc.cause || "Active Incident"} · Water: {inc.water_level || inc.waterLevel || "?"}cm
                  </option>
                ))}
              </select>
            </div>

            {/* Sliders for Rainfall & Water Level */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="mac-form-group">
                <label className="mac-form-label">
                  <span>Rainfall (mm)</span>
                  <span
                    className="mac-form-badge"
                    style={{
                      background: scenario.rainfall > 65 ? "#fee2e2" : scenario.rainfall > 35 ? "#fef3c7" : "#e0f2fe",
                      color: scenario.rainfall > 65 ? "#b91c1c" : scenario.rainfall > 35 ? "#b45309" : "#0369a1"
                    }}
                  >
                    {scenario.rainfall} mm
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="140"
                  value={scenario.rainfall}
                  className="mac-range-slider"
                  onChange={(e) => setScenario({ ...scenario, rainfall: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className="mac-form-input"
                  value={scenario.rainfall}
                  onChange={(e) => setScenario({ ...scenario, rainfall: Number(e.target.value) })}
                />
              </div>

              <div className="mac-form-group">
                <label className="mac-form-label">
                  <span>Water Depth (cm)</span>
                  <span
                    className="mac-form-badge"
                    style={{
                      background: scenario.waterLevel > 35 ? "#fee2e2" : scenario.waterLevel > 20 ? "#fef3c7" : "#e0f2fe",
                      color: scenario.waterLevel > 35 ? "#b91c1c" : scenario.waterLevel > 20 ? "#b45309" : "#0369a1"
                    }}
                  >
                    {scenario.waterLevel} cm
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scenario.waterLevel}
                  className="mac-range-slider"
                  onChange={(e) => setScenario({ ...scenario, waterLevel: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className="mac-form-input"
                  value={scenario.waterLevel}
                  onChange={(e) => setScenario({ ...scenario, waterLevel: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Reports & Drain Signal */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="mac-form-group">
                <label className="mac-form-label">Ground Citizen Reports</label>
                <input
                  type="number"
                  className="mac-form-input"
                  min="1"
                  max="50"
                  value={scenario.reports}
                  onChange={(e) => setScenario({ ...scenario, reports: Number(e.target.value) })}
                />
              </div>

              <div className="mac-form-group">
                <label className="mac-form-label">Drainage Obstruction Signal</label>
                <select
                  className="mac-form-select"
                  value={scenario.blockedDrainSignal ? "yes" : "no"}
                  onChange={(e) => setScenario({ ...scenario, blockedDrainSignal: e.target.value === "yes" })}
                >
                  <option value="yes">Detected / Blocked Culvert</option>
                  <option value="no">Normal / Unblocked</option>
                </select>
              </div>
            </div>

            {/* Vulnerable People & Onset Speed */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="mac-form-group">
                <label className="mac-form-label">Vulnerable Citizens At Site</label>
                <input
                  type="number"
                  className="mac-form-input"
                  min="0"
                  max="30"
                  value={scenario.vulnerablePeople}
                  onChange={(e) => setScenario({ ...scenario, vulnerablePeople: Number(e.target.value) })}
                />
              </div>

              <div className="mac-form-group">
                <label className="mac-form-label">Water Rise Onset Speed</label>
                <select
                  className="mac-form-select"
                  value={scenario.onsetSpeed}
                  onChange={(e) => setScenario({ ...scenario, onsetSpeed: e.target.value })}
                >
                  <option value="0–10 min">0–10 min (Flash Flood)</option>
                  <option value="10–30 min">10–30 min (Rapid Rise)</option>
                  <option value="Gradual">Gradual / Monitored</option>
                </select>
              </div>
            </div>

            {/* Observation Notes */}
            <div className="mac-form-group">
              <label className="mac-form-label">Field Observation & NLP Notes</label>
              <textarea
                className="mac-form-textarea"
                rows="3"
                value={scenario.note}
                onChange={(e) => setScenario({ ...scenario, note: e.target.value })}
                placeholder="Citizen reports, waterlogging description, landmark notes..."
              />
            </div>

            {/* Run Buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <button
                className="btn primary"
                style={{ flex: 1, minWidth: 200, padding: "12px 18px", fontSize: 14 }}
                disabled={loading}
                onClick={runOrchestration}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Running Agents...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="white" /> Run Multi-Agent Analysis
                  </>
                )}
              </button>
              <button className="btn secondary" onClick={runSimulation} disabled={loading}>
                <Activity size={16} /> What-If Matrix
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Supervisor Decision Hub & Deep Dive */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {analysis ? (
            <section className="mac-card">
              {/* Human-in-the-Loop Action Banner */}
              {approvalPending && (
                <div className="mac-approval-banner">
                  <div className="mac-approval-info">
                    <AlertTriangle size={26} color="#e11d48" />
                    <div>
                      <strong style={{ color: "#9f1239", fontSize: 14 }}>
                        Supervisor Guardrail: Human Approval Required
                      </strong>
                      <p style={{ margin: 0, fontSize: 12, color: "#881337" }}>
                        Critical flood risk or high exposure detected. Verify recommendation before field deployment.
                      </p>
                    </div>
                  </div>
                  <div className="mac-approval-actions">
                    <button
                      className="btn primary"
                      style={{ background: "#e11d48", borderColor: "#be123c" }}
                      onClick={() => handleHumanAction("approve")}
                    >
                      <Check size={16} /> Approve & Dispatch {analysis.decision?.resource?.recommended?.name?.split(" ")[0] || "Team"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => handleHumanAction("false_alarm")}
                    >
                      Flag False Alarm
                    </button>
                  </div>
                </div>
              )}

              {isApproved && (
                <div className="mac-approval-banner approved">
                  <div className="mac-approval-info">
                    <CheckCircle2 size={24} color="#16a34a" />
                    <div>
                      <strong style={{ color: "#166534", fontSize: 14 }}>
                        Authorized by Authority Admin
                      </strong>
                      <p style={{ margin: 0, fontSize: 12, color: "#14532d" }}>
                        Dispatched unit: <b>{analysis.decision?.resource?.recommended?.name}</b> · Trace recorded in audit ledger.
                      </p>
                    </div>
                  </div>
                  <span className="status-pill success">Dispatched</span>
                </div>
              )}

              {isOverridden && (
                <div className="mac-approval-banner approved">
                  <div className="mac-approval-info">
                    <Sliders size={24} color="#2563eb" />
                    <div>
                      <strong style={{ color: "#1e40af", fontSize: 14 }}>
                        Manual Override Applied
                      </strong>
                      <p style={{ margin: 0, fontSize: 12, color: "#1e3a8a" }}>
                        Assigned alternate unit: <b>{analysis.decision?.resource?.recommended?.name}</b>.
                      </p>
                    </div>
                  </div>
                  <span className="status-pill" style={{ background: "#dbeafe", color: "#1e40af" }}>Overridden</span>
                </div>
              )}

              {/* Decision Header */}
              <div className="mac-card-title" style={{ marginBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3>Supervisor Decision</h3>
                    <span
                      className="status-pill"
                      style={{
                        background: isRed ? "#fee2e2" : isOrange ? "#fef3c7" : "#dcfce7",
                        color: isRed ? "#991b1b" : isOrange ? "#92400e" : "#166534",
                        fontWeight: 700
                      }}
                    >
                      {analysis.decision?.risk?.label || "NORMAL"} WARNING
                    </span>
                  </div>
                  <p>Trace ID: {analysis.audit?.traceId} · Geohash: {analysis.audit?.geohash}</p>
                </div>
                <ShieldCheck size={26} color={isRed ? "#ef4444" : "#16a34a"} />
              </div>

              {/* KPI Summary Grid */}
              <div className="mac-decision-kpis">
                <div className={`mac-kpi-box ${isRed ? "red" : isOrange ? "orange" : "green"}`}>
                  <span className="mac-kpi-label">Risk Score</span>
                  <div className="mac-kpi-value">{analysis.decision?.risk?.score || 0}/100</div>
                  <div className="mac-kpi-sub">
                    Base: {analysis.decision?.risk?.baseScore || 0} + Boost: {analysis.decision?.risk?.exposureBoost || 0}
                  </div>
                </div>

                <div className="mac-kpi-box">
                  <span className="mac-kpi-label">Root Cause</span>
                  <div className="mac-kpi-value" style={{ fontSize: 15, marginTop: 4 }}>
                    {analysis.decision?.cause?.name || "Evaluating"}
                  </div>
                  <div className="mac-kpi-sub">{analysis.decision?.cause?.code}</div>
                </div>

                <div className="mac-kpi-box">
                  <span className="mac-kpi-label">Top Recommended Unit</span>
                  <div className="mac-kpi-value" style={{ fontSize: 15, marginTop: 4 }}>
                    {analysis.decision?.resource?.recommended?.name || "Pending"}
                  </div>
                  <div className="mac-kpi-sub">
                    {analysis.decision?.resource?.recommended?.distanceKm != null ? `${analysis.decision.resource.recommended.distanceKm} km away` : "Available"}
                  </div>
                </div>

                <div className="mac-kpi-box">
                  <span className="mac-kpi-label">Human Approval</span>
                  <div className="mac-kpi-value" style={{ fontSize: 15, marginTop: 4 }}>
                    {analysis.audit?.humanApprovalRequired ? "Required" : "Auto-Approved"}
                  </div>
                  <div className="mac-kpi-sub">Guardrail Protocol</div>
                </div>
              </div>

              {/* Navigation Tabs for Deep Inspection */}
              <div className="mac-tabs-nav">
                <button
                  className={`mac-tab-btn ${activeTab === "decision" ? "active" : ""}`}
                  onClick={() => setActiveTab("decision")}
                >
                  <Eye size={14} /> Key Decisions
                </button>
                <button
                  className={`mac-tab-btn ${activeTab === "candidates" ? "active" : ""}`}
                  onClick={() => setActiveTab("candidates")}
                >
                  <Truck size={14} /> Ranked Response Teams ({analysis.decision?.resource?.candidates?.length || 0})
                </button>
                <button
                  className={`mac-tab-btn ${activeTab === "trace" ? "active" : ""}`}
                  onClick={() => setActiveTab("trace")}
                >
                  <BrainCircuit size={14} /> Agent Traces ({analysis.agents?.length || 0})
                </button>
                <button
                  className={`mac-tab-btn ${activeTab === "audit" ? "active" : ""}`}
                  onClick={() => setActiveTab("audit")}
                >
                  <FileText size={14} /> Cryptographic Proof & Ledger
                </button>
              </div>

              {/* Tab 1: Key Decisions (Evacuation, Broadcast Alert, Root Cause) */}
              {activeTab === "decision" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Safety & Evacuation Advisory */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <b style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <RouteIcon size={16} color="#2563eb" /> Safety Routing & Evacuation Policy
                      </b>
                      <span className={`status-pill ${analysis.decision?.route?.evacuationRequired ? "critical" : "success"}`}>
                        {analysis.decision?.route?.evacuationRequired ? "Evacuation Triggered" : "Shelter in Place / Avoid Hotspots"}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#334155" }}>
                      {analysis.decision?.route?.advisory}
                    </p>
                    <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                      Policy: <code>{analysis.decision?.route?.routePolicy}</code>
                    </div>
                  </div>

                  {/* Broadcast Alert */}
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <b style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "#1e40af" }}>
                        <Bell size={16} color="#2563eb" /> Synthesized Broadcast Notification
                      </b>
                      <button
                        className="btn secondary"
                        style={{ padding: "4px 10px", fontSize: 11, height: 28 }}
                        onClick={handleCopyAlert}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied!" : "Copy Alert"}
                      </button>
                    </div>
                    <p style={{ margin: "4px 0 8px", fontSize: 13, color: "#1e3a8a", fontWeight: 500 }}>
                      "{analysis.decision?.notification?.message}"
                    </p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className="status-pill" style={{ background: "#dbeafe", color: "#1e40af", fontSize: 11 }}>
                        Escalation: {analysis.decision?.notification?.escalation}
                      </span>
                      {(analysis.decision?.notification?.channels || []).map((ch) => (
                        <span key={ch} className="status-pill" style={{ fontSize: 11 }}>
                          #{ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Explainability Checklist */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                    <b style={{ fontSize: 13, display: "block", marginBottom: 8 }}>Supervisor Rationale & Explainability:</b>
                    <div style={{ display: "grid", gap: 6 }}>
                      {(analysis.audit?.explainability || []).map((exp, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
                          <CheckCircle2 size={15} color="#10b981" />
                          <span>{exp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Ranked Response Teams */}
              {activeTab === "candidates" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                      Resource Allocation Agent ranked <b>{analysis.decision?.resource?.candidates?.length || 0} teams</b> based on distance, equipment capability, and cause suitability.
                    </p>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {(analysis.decision?.resource?.candidates || []).map((team, idx) => {
                      const isTopMatch = team.id === analysis.decision?.resource?.recommended?.id;
                      return (
                        <div
                          key={team.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "12px 16px",
                            border: `1.5px solid ${isTopMatch ? "#3b82f6" : "#e2e8f0"}`,
                            borderRadius: 12,
                            background: isTopMatch ? "#eff6ff" : "#ffffff"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: isTopMatch ? "#2563eb" : "#f1f5f9",
                                color: isTopMatch ? "#ffffff" : "#475569",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 700,
                                fontSize: 12
                              }}
                            >
                              #{idx + 1}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <b style={{ fontSize: 14 }}>{team.name}</b>
                                {isTopMatch && (
                                  <span className="status-pill success" style={{ fontSize: 10 }}>
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                                {team.station || team.type} · {team.distanceKm != null ? `${team.distanceKm} km away` : "Stationed nearby"} · Fit Score: <b>{team.allocationScore}/100</b>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {!isTopMatch && (
                              <button
                                className="btn secondary"
                                style={{ padding: "6px 12px", fontSize: 12 }}
                                onClick={() => handleHumanAction("override", { teamId: team.id, team: team.name })}
                              >
                                Assign This Unit
                              </button>
                            )}
                            {isTopMatch && !isApproved && (
                              <button
                                className="btn primary"
                                style={{ padding: "6px 14px", fontSize: 12 }}
                                onClick={() => handleHumanAction("approve")}
                              >
                                Dispatch Unit
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Agent Traces (Deep Inspection) */}
              {activeTab === "trace" && (
                <div style={{ display: "grid", gap: 12 }}>
                  {(analysis.agents || []).map((agent) => (
                    <div
                      key={agent.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 14,
                        background: "#ffffff"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <CheckCircle2 size={16} color="#10b981" />
                          <b style={{ fontSize: 14 }}>{agent.name || agent.id}</b>
                        </div>
                        <span className="status-pill success" style={{ fontSize: 10 }}>
                          Completed in {agent.durationMs || 10}ms
                        </span>
                      </div>
                      <pre className="mac-code-block" style={{ maxHeight: 180, fontSize: 11 }}>
                        {JSON.stringify(agent.output, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Cryptographic Proof & Ledger */}
              {activeTab === "audit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Cryptographic & Audit Ledger Verification</h4>
                    <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                      <div><b>Trace ID:</b> <code>{analysis.audit?.traceId}</code></div>
                      <div><b>Evidence SHA-256 Hash:</b> <code>{analysis.audit?.evidenceHash}</code></div>
                      <div><b>Geohash Cell:</b> <code>{analysis.audit?.geohash}</code></div>
                      <div><b>Execution Completed:</b> <code>{analysis.completedAt}</code></div>
                      <div><b>Approval Status:</b> <span className="status-pill success">{analysis.audit?.approvalStatus || "auto_approved"}</span></div>
                    </div>
                  </div>

                  <pre className="mac-code-block" style={{ maxHeight: 220 }}>
                    {JSON.stringify(analysis.audit, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          ) : (
            <section className="mac-card" style={{ textAlign: "center", padding: 40 }}>
              <BrainCircuit size={48} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
              <h3>No Orchestration Loaded</h3>
              <p className="muted" style={{ maxWidth: 400, margin: "0 auto 16px" }}>
                Select a preset scenario on the left or click "Run Multi-Agent Analysis" to launch the supervisor orchestration.
              </p>
              <button className="btn primary" onClick={runOrchestration}>
                Run Multi-Agent Analysis Now
              </button>
            </section>
          )}

          {/* What-If Comparative Matrix (if generated) */}
          {simulation && (
            <section className="mac-card">
              <div className="mac-card-title">
                <div>
                  <h3>What-If Scenario Comparisons</h3>
                  <p>Hydrological divergence under spiked conditions.</p>
                </div>
                <Activity size={22} color="#2563eb" />
              </div>

              <div className="mac-whatif-grid">
                {simulation.map((item) => (
                  <div key={item.id} className="mac-whatif-card">
                    <b style={{ fontSize: 13 }}>{item.label}</b>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        className="status-pill"
                        style={{
                          background: item.risk?.label === "RED" ? "#fee2e2" : item.risk?.label === "ORANGE" ? "#fef3c7" : "#dcfce7",
                          color: item.risk?.label === "RED" ? "#991b1b" : item.risk?.label === "ORANGE" ? "#92400e" : "#166534"
                        }}
                      >
                        {item.risk?.score}/100 · {item.risk?.label}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      Cause: <b>{item.cause?.name}</b>
                    </div>
                    <button
                      className="btn secondary"
                      style={{ padding: "5px 10px", fontSize: 11, marginTop: 4 }}
                      onClick={() => {
                        const patch = item.patch || {};
                        setScenario((prev) => ({ ...prev, ...patch }));
                        if (notify) notify(`Applied parameters from "${item.label}" scenario.`);
                      }}
                    >
                      Load into Studio
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Historical Coordination Runs Explorer */}
      <section className="mac-card" style={{ marginTop: 10 }}>
        <div className="mac-card-title">
          <div>
            <h3>Recent Coordination Traces</h3>
            <p>Persistent trace audit log. Click any previous run to restore its full state and DAG.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className={`mac-preset-btn ${historyFilter === "all" ? "active" : ""}`}
              onClick={() => setHistoryFilter("all")}
            >
              All ({runs.length})
            </button>
            <button
              className={`mac-preset-btn ${historyFilter === "red" ? "active" : ""}`}
              onClick={() => setHistoryFilter("red")}
            >
              High Risk
            </button>
            <button
              className={`mac-preset-btn ${historyFilter === "pending" ? "active" : ""}`}
              onClick={() => setHistoryFilter("pending")}
            >
              Pending Approval
            </button>
            {runs.length > 0 && (
              <button className="btn secondary" style={{ fontSize: 11, padding: "5px 9px" }} onClick={handleClearHistory}>
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredRuns.length === 0 ? (
          <p className="muted" style={{ padding: 20, textAlign: "center" }}>
            No matching coordination traces found.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {filteredRuns.map((run) => {
              const runIsRed = run.decision?.risk?.label === "RED";
              const runIsActive = analysis?.runId === run.runId;
              return (
                <div
                  key={run.runId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `1.5px solid ${runIsActive ? "#2563eb" : "#e2e8f0"}`,
                    background: runIsActive ? "#eff6ff" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => {
                    setAnalysis(run);
                    setActiveTab("decision");
                    if (notify) notify(`Restored coordination trace ${run.runId}`);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: runIsRed ? "#fee2e2" : "#f1f5f9",
                        color: runIsRed ? "#b91c1c" : "#2563eb",
                        display: "grid",
                        placeItems: "center"
                      }}
                    >
                      <BrainCircuit size={16} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <b>{run.runId}</b>
                        {run.incidentId && (
                          <span className="status-pill" style={{ fontSize: 10 }}>
                            {run.incidentId}
                          </span>
                        )}
                        <span
                          className="status-pill"
                          style={{
                            background: runIsRed ? "#fee2e2" : "#fef3c7",
                            color: runIsRed ? "#991b1b" : "#92400e",
                            fontSize: 10
                          }}
                        >
                          {run.decision?.risk?.score || 0}/100 {run.decision?.risk?.label}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        Cause: {run.decision?.cause?.name || "Diagnosed"} · Team: {run.decision?.resource?.recommended?.name || "Recommended"} · Completed {new Date(run.completedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="status-pill success" style={{ fontSize: 11 }}>
                      {run.audit?.approvalStatus || "COMPLETED"}
                    </span>
                    <ChevronRight size={16} color="#94a3b8" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Agent Node Deep Inspector Dialog Modal */}
      {selectedAgentNode && (
        <div className="mac-modal-backdrop" onClick={() => setSelectedAgentNode(null)}>
          <div className="mac-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mac-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center" }}>
                  {React.createElement(selectedAgentNode.icon || BrainCircuit, { size: 22 })}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{selectedAgentNode.name}</h3>
                    <span className="status-pill" style={{ background: "#e0f2fe", color: "#0369a1", fontSize: 11 }}>
                      {selectedAgentNode.phase} Phase
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    ID: <code>{selectedAgentNode.id}</code>
                  </span>
                </div>
              </div>
              <button
                className="btn secondary"
                style={{ padding: "6px 10px", borderRadius: "50%", minWidth: "unset" }}
                onClick={() => setSelectedAgentNode(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <b style={{ fontSize: 13, color: "#1e293b", display: "block", marginBottom: 4 }}>
                  Bounded Role & Objective
                </b>
                <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                  {selectedAgentNode.description}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <b style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 6 }}>
                    📥 Ingested Inputs
                  </b>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#334155" }}>
                    {selectedAgentNode.inputs?.map((inp, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>{inp}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <b style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 6 }}>
                    📤 Output Artifacts
                  </b>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#334155" }}>
                    {selectedAgentNode.outputs?.map((out, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>{out}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <b style={{ fontSize: 13, color: "#1e293b", display: "block", marginBottom: 6 }}>
                  Live Execution Telemetry & Decision Payload
                </b>
                {analysis?.agents?.find((a) => a.id === selectedAgentNode.id) ? (
                  <pre className="mac-code-block">
                    {JSON.stringify(
                      analysis.agents.find((a) => a.id === selectedAgentNode.id).output,
                      null,
                      2
                    )}
                  </pre>
                ) : (
                  <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10, padding: 16, textAlign: "center", color: "#64748b", fontSize: 12 }}>
                    No run executed yet for this agent node. Click "Run Multi-Agent Analysis" on the studio to generate live output.
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button className="btn primary" onClick={() => setSelectedAgentNode(null)}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [resources, setResources] = useState([]);
  const [chronicBlockages, setChronicBlockages] = useState([]);
  const [emergencyServices, setEmergencyServices] = useState([]);

  // Hyperlocal Location & Shelter Discovery State
  const [userLat, setUserLat] = useState(19.1320);
  const [userLng, setUserLng] = useState(72.8480);
  const [userLocationName, setUserLocationName] = useState("Andheri West Station Road Market");
  const [locationMode, setLocationMode] = useState("preset"); // gps | search | preset | fallback
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | detecting_gps | searching | gps_denied | invalid_location | offline

  const [shelters, setShelters] = useState([]);
  const [shelterLoading, setShelterLoading] = useState(false);
  const [shelterError, setShelterError] = useState(null);
  const [shelterStatus, setShelterStatus] = useState("idle");

  // Interactive Route State
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // General App State
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [overrideIncident, setOverrideIncident] = useState(null);
  const [photoModal, setPhotoModal] = useState(null);

  const shelterReqIdRef = useRef(0);

  const notify = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Fetch dynamic shelters, response units, and emergency services for active coordinates
  const fetchSheltersAndLocationData = useCallback(async (lat, lng, locName, mode = "gps") => {
    const reqId = ++shelterReqIdRef.current;
    setUserLat(lat);
    setUserLng(lng);
    if (locName) setUserLocationName(locName);
    setLocationMode(mode);
    setLocationStatus("idle");
    setShelterLoading(true);
    setShelterError(null);
    setShelterStatus("loading");

    // Clear active route if coordinates changed
    setSelectedShelter(null);
    setActiveRoute(null);

    try {
      const [shRes, emsRes, resRes, zRes] = await Promise.all([
        apiFetch(`/shelters/nearby?latitude=${lat}&longitude=${lng}&radius_km=10`).catch((err) => {
          console.warn("[web] Shelter discovery warning:", err.message);
          return [];
        }),
        apiFetch(`/emergency-services?lat=${lat}&lng=${lng}&radius_km=5`).catch(() => []),
        apiFetch(`/resources?lat=${lat}&lng=${lng}`).catch(() => []),
        apiFetch(`/zones?lat=${lat}&lng=${lng}`).catch(() => [])
      ]);

      if (reqId !== shelterReqIdRef.current) return;

      const shelterList = Array.isArray(shRes) ? shRes : shRes?.shelters || [];
      setShelters(shelterList);
      setShelterStatus(shelterList.length === 0 ? "empty" : "success");

      if (Array.isArray(emsRes) && emsRes.length > 0) setEmergencyServices(emsRes);
      if (Array.isArray(resRes) && resRes.length > 0) setResources(resRes);
      if (Array.isArray(zRes) && zRes.length > 0) setZones(zRes);

      console.log(`[VarshaRaksha Web] Loaded ${shelterList.length} shelters and ${resRes.length} resources near ${locName || `${lat}, ${lng}`}`);
    } catch (err) {
      if (reqId !== shelterReqIdRef.current) return;
      setShelterError(err.message || "Failed to load shelter data.");
      setShelterStatus(!navigator.onLine ? "offline" : "error");
    } finally {
      if (reqId === shelterReqIdRef.current) {
        setShelterLoading(false);
      }
    }
  }, []);

  const routeCacheRef = useRef(new Map());
  const prevGpsCoordsRef = useRef(null);

  // Calculate safest OSRM road route to chosen shelter (with persistent coordinate caching)
  const handleSelectShelter = useCallback(async (sh) => {
    setSelectedShelter(sh);
    const destLat = sh.latitude ?? sh.lat;
    const destLng = sh.longitude ?? sh.lng;
    const cacheKey = `${Number(userLat).toFixed(4)},${Number(userLng).toFixed(4)}_${Number(destLat).toFixed(4)},${Number(destLng).toFixed(4)}`;

    const cached = routeCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      setActiveRoute(cached.data);
      notify(`🛣️ Safest route to ${sh.name}: ${cached.data.durationMin || 5} min ETA (${cached.data.distanceKm || 1.5} km) [Cached].`);
      return;
    }

    setLoadingRoute(true);
    try {
      const routeData = await apiFetch(`/route?fromLat=${userLat}&fromLng=${userLng}&toLat=${destLat}&toLng=${destLng}`);
      routeCacheRef.current.set(cacheKey, { data: routeData, timestamp: Date.now() });
      setActiveRoute(routeData);
      notify(`🛣️ Safest route to ${sh.name}: ${routeData.durationMin || 5} min ETA (${routeData.distanceKm || 1.5} km).`);
    } catch (err) {
      console.warn("[web] Route calculation error:", err.message);
      // Fallback route line
      const fallbackRoute = {
        coordinates: [
          { lat: userLat, lng: userLng },
          { lat: destLat, lng: destLng }
        ],
        distanceKm: ((sh.distance_km ?? sh.distanceKm) || 1.2),
        durationMin: (sh.eta_minutes ?? 5),
        hazardAdvisory: "Direct road corridor · Exercise caution near local storm drains."
      };
      setActiveRoute(fallbackRoute);
      notify(`🗺️ Displaying direct corridor to ${sh.name}.`);
    } finally {
      setLoadingRoute(false);
    }
  }, [userLat, userLng, notify]);

  const handleClearRoute = useCallback(() => {
    setSelectedShelter(null);
    setActiveRoute(null);
  }, []);

  // Live GPS Detection Handler (Throttled by 25m distance threshold to avoid state thrashing)
  const handleDetectGps = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("gps_denied");
      notify("Geolocation is not supported by this browser.");
      return;
    }

    setLocationStatus("detecting_gps");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Sensible GPS filtering: only do full reverse geocode and shelter query if moved > 25 meters
        const prevGps = prevGpsCoordsRef.current;
        if (prevGps) {
          const distKm = calcDistanceKm(prevGps.latitude, prevGps.longitude, latitude, longitude);
          if (distKm != null && distKm < 0.025) {
            // User moved less than 25m: update coordinates without refetching all APIs
            setUserLat(latitude);
            setUserLng(longitude);
            setLocationStatus("idle");
            return;
          }
        }

        prevGpsCoordsRef.current = { latitude, longitude };
        let detectedName = `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

        try {
          const geoRes = await apiFetch(`/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          if (geoRes?.road) {
            detectedName = `${geoRes.road}, ${geoRes.ward || "Mumbai"}`;
          } else if (geoRes?.displayName) {
            detectedName = geoRes.displayName.split(",").slice(0, 2).join(",");
          }
        } catch {
          // fallback string
        }

        notify(`🎯 GPS Location detected: ${detectedName}`);
        fetchSheltersAndLocationData(latitude, longitude, detectedName, "gps");
      },
      (err) => {
        console.warn("[web] GPS access error:", err.message);
        setLocationStatus("gps_denied");
        fetchSheltersAndLocationData(19.1320, 72.8480, "Andheri West Station Road Market", "preset");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  }, [fetchSheltersAndLocationData, notify]);

  // Preset Hub Selection Handler
  const handleSelectPresetHub = useCallback((hub) => {
    const lat = hub.latitude || hub.lat;
    const lng = hub.longitude || hub.lng;
    notify(`🏪 Switched location to ${hub.name}`);
    fetchSheltersAndLocationData(lat, lng, hub.name, "preset");
  }, [fetchSheltersAndLocationData, notify]);

  // Suggestion Click Handler
  const handleSelectLocation = useCallback((item) => {
    const name = item.name || item.displayName;
    notify(`📍 Selected location: ${name}`);
    fetchSheltersAndLocationData(item.latitude, item.longitude, name, "search");
  }, [fetchSheltersAndLocationData, notify]);

  // Manual Text Submit Geocode Handler
  const handleManualSearch = useCallback(async (query) => {
    if (!query || !query.trim()) return;
    try {
      const res = await apiFetch(`/geocode/search?q=${encodeURIComponent(query.trim())}`);
      const list = res?.results || (Array.isArray(res) ? res : []);
      if (list.length > 0) {
        const top = list[0];
        notify(`🔍 Geocoded "${query}" → ${top.name}`);
        fetchSheltersAndLocationData(top.latitude, top.longitude, top.name, "search");
      } else {
        setLocationStatus("invalid_location");
        notify(`No coordinates found for "${query}". Try another area.`);
      }
    } catch (err) {
      setLocationStatus("invalid_location");
      notify("Geocoding failed: " + err.message);
    }
  }, [fetchSheltersAndLocationData, notify]);

  // Load baseline static datasets
  const loadInitialData = useCallback(async () => {
    try {
      const [z, inc, al, res, cb, ems] = await Promise.all([
        apiFetch("/zones").catch(() => []),
        apiFetch("/incidents").catch(() => []),
        apiFetch(`/alerts?lat=${userLat}&lng=${userLng}`).catch(() => []),
        apiFetch(`/resources?lat=${userLat}&lng=${userLng}`).catch(() => []),
        apiFetch("/chronic-blockages").catch(() => []),
        apiFetch(`/emergency-services?lat=${userLat}&lng=${userLng}&radius_km=5`).catch(() => [])
      ]);
      setZones(z);
      setIncidents((inc || []).sort((a, b) => new Date(b.userTimestamp || b.updatedAt || b.createdAt || b.time || 0) - new Date(a.userTimestamp || a.updatedAt || a.createdAt || a.time || 0)));
      setAlerts(al);
      setResources(res);
      setChronicBlockages(cb);
      setEmergencyServices(ems);
    } catch (err) {
      console.warn("[web] Initial data loading notice:", err.message);
    }
  }, [userLat, userLng]);

  // Initial Startup Effect with SSE & Throttled Fallback Polling
  useEffect(() => {
    loadInitialData();
    if (navigator.geolocation) {
      handleDetectGps();
    } else {
      fetchSheltersAndLocationData(19.1320, 72.8480, "Andheri West Station Road Market", "preset");
    }

    // Connect to live SSE Stream for targeted real-time updates (no full-layer wipeouts)
    let es;
    try {
      es = new EventSource(`${API}/stream`);
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (
            data.type === "INCIDENT_REPORTED" ||
            data.type === "INCIDENT_DISPATCHED" ||
            data.type === "report:created" ||
            data.event === "report:created" ||
            data.type === "report:merged" ||
            data.event === "report:merged"
          ) {
            if (data.payload?.incident) {
              const newInc = data.payload.incident;
              setIncidents((prev) => [newInc, ...prev.filter((i) => i.id !== newInc.id)]);
            }
          }
          if (data.type === "RISK_UPDATED" && Array.isArray(data.zones)) {
            setZones(data.zones);
          }
        } catch {
          // parse error
        }
      };

      es.addEventListener("report:created", (evt) => {
        try {
          const d = JSON.parse(evt.data);
          if (d.payload?.incident) {
            const newInc = d.payload.incident;
            setIncidents((prev) => [newInc, ...prev.filter((i) => i.id !== newInc.id)]);
            if (newInc.isSos || newInc.type === "SOS" || newInc.status === "ACTIVE_SOS") {
              playSosEmergencyChime();
              setNotificationsOpen(true);
              notify(`🚨 CRITICAL SOS TRIGGERED by ${newInc.reporter || "User"} at ${newInc.address}! (Phone: ${newInc.userPhone || "Emergency"})`);
            }
          }
        } catch {}
      });

      es.addEventListener("sos:triggered", (evt) => {
        try {
          const d = JSON.parse(evt.data);
          const sosInc = d.payload?.incident;
          const sosAlt = d.payload?.alert;
          if (sosInc) {
            setIncidents((prev) => [sosInc, ...prev.filter((i) => i.id !== sosInc.id)]);
          }
          if (sosAlt) {
            setAlerts((prev) => [sosAlt, ...prev.filter((a) => a.id !== sosAlt.id)]);
          }
          playSosEmergencyChime();
          setNotificationsOpen(true);
          notify(`🚨 CRITICAL SOS TRIGGERED: ${sosInc?.reporter || "Distress Signal"} at ${sosInc?.address || "Active Area"}`);
        } catch {}
      });

      es.addEventListener("incident:resolved", (evt) => {
        try {
          const d = JSON.parse(evt.data);
          const incId = d.id || d.incident?.id;
          if (incId) {
            setIncidents((prev) => prev.filter((i) => i.id !== incId && i.sosId !== incId));
            setAlerts((prev) => prev.filter((a) => a.incidentId !== incId && a.sosId !== incId && a.id !== incId));
          }
        } catch {}
      });

      es.addEventListener("incident:updated", (evt) => {
        try {
          const d = JSON.parse(evt.data);
          if (d.incident) {
            const up = d.incident;
            if (up.status === "Resolved" || up.status === "False Alarm" || up.isQuarantined) {
              setIncidents((prev) => prev.filter((i) => i.id !== up.id && i.sosId !== up.sosId));
              setAlerts((prev) => prev.filter((a) => a.incidentId !== up.id && a.sosId !== up.sosId && a.id !== up.id));
            } else {
              setIncidents((prev) => [up, ...prev.filter((i) => i.id !== up.id)]);
            }
          }
        } catch {}
      });

      es.addEventListener("SOS_CLUSTER_UPDATED", (evt) => {
        try {
          const d = JSON.parse(evt.data);
          const up = d.incident || d.payload?.incident;
          if (up) {
            setIncidents((prev) => [up, ...prev.filter((i) => i.id !== up.id)]);
            notify(`🚨 SOS CLUSTER UPDATED: Incident ${up.id} now has ${up.reporter_count || 2} reports in 500m zone.`);
          }
        } catch {}
      });

      es.addEventListener("zones:synced", (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.zones) setZones(d.zones);
        } catch {}
      });
    } catch {
      // SSE not supported or offline
    }

    // Refresh immediately when tab gains focus or visibility
    const handleFocus = () => {
      loadInitialData();
    };
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (!document.hidden) loadInitialData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 20s polling fallback (drastically reduced from 4s to eliminate render/network thrashing)
    const pollTimer = setInterval(() => {
      loadInitialData();
    }, 20000);

    return () => {
      if (es) es.close();
      clearInterval(pollTimer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Weather Sync Action
  const syncWeather = async () => {
    setSyncing(true);
    try {
      const data = await apiFetch("/sync-weather", { method: "POST" });
      if (Array.isArray(data.zones)) setZones(data.zones);
      notify("Live Open-Meteo rainfall synchronized successfully.");
    } catch (err) {
      notify("Weather sync notice: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Incident Actions
  const handleAutoDispatch = async (incident) => {
    try {
      await apiFetch(`/incidents/${incident.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team: incident.recommendedTeam || "High-Volume Dewatering Pump Unit",
          reason: incident.cause || "High severity waterlogging"
        })
      });
      notify(`Auto-Dispatched ${incident.recommendedTeam || "Emergency Unit"} to ${incident.id}.`);
      loadInitialData();
    } catch (err) {
      notify("Auto-dispatch failed: " + err.message);
    }
  };

  const handleVerify = async (id) => {
    try {
      await apiFetch(`/incidents/${id}/verify`, { method: "POST" });
      notify(`Incident ${id} marked as verified.`);
      loadInitialData();
    } catch (err) {
      notify("Verification failed: " + err.message);
    }
  };

  const handleFalseAlarm = async (id) => {
    try {
      await apiFetch(`/incidents/${id}/false-alarm`, { method: "POST" });
      notify(`Incident ${id} marked as False Alarm. User trust score updated.`);
      setIncidents((prev) => prev.filter((i) => i.id !== id && i.sosId !== id));
      loadInitialData();
    } catch (err) {
      notify("Operation failed: " + err.message);
    }
  };

  const handleResolve = async (id) => {
    try {
      await apiFetch(`/incidents/${id}/resolve`, { method: "POST" });
      notify(`Incident / SOS ${id} marked as RESOLVED and cleared from active map.`);
      setIncidents((prev) => prev.filter((i) => i.id !== id && i.sosId !== id));
      setAlerts((prev) => prev.filter((a) => a.incidentId !== id && a.sosId !== id && a.id !== id));
      loadInitialData();
    } catch (err) {
      notify("Resolution failed: " + err.message);
    }
  };

  const handleResetReputation = async (identifier) => {
    try {
      await apiFetch(`/reputations/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      notify(`User trust score restored for ${identifier}. Account unbanned.`);
      loadInitialData();
    } catch (err) {
      notify("Failed to reset reputation: " + err.message);
    }
  };

  const handleOverrideSubmit = async (incidentId, team, rationale) => {
    try {
      await apiFetch(`/incidents/${incidentId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team, rationale })
      });
      notify(`Admin manual override executed for ${incidentId} → ${team}.`);
      setOverrideIncident(null);
      loadInitialData();
    } catch (err) {
      notify("Override failed: " + err.message);
    }
  };

  const handleGenerateReport = async () => {
    try {
      window.open(`${API}/chronic-blockages/report`, "_blank");
      notify("BMC Desilting Directives report opened.");
    } catch (err) {
      notify("Report generation failed: " + err.message);
    }
  };

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const dispatchedIncidentIds = new Set(
    incidents
      .filter((i) => i.status === "Dispatched" || i.status === "Resolved" || i.status === "RESOLVED" || i.dispatched || i.assignedTeam)
      .map((i) => i.id)
  );

  const activeSosIncidents = incidents.filter(
    (i) => (i.isSos || i.type === "SOS" || i.status === "ACTIVE_SOS" || i.causeCode === "SOS_EMERGENCY") &&
           i.status !== "Dispatched" && i.status !== "Resolved" && i.status !== "RESOLVED" && !i.dispatched && !i.assignedTeam
  );

  const activeAlerts = alerts.filter(
    (a) => !a.dispatched && !dispatchedIncidentIds.has(a.incidentId) && !dispatchedIncidentIds.has(a.sosId) &&
           !(a.isSos && (dispatchedIncidentIds.has(a.incidentId) || dispatchedIncidentIds.has(a.sosId) || activeSosIncidents.length === 0))
  );

  const hasActiveSos = activeSosIncidents.length > 0;
  const totalUnreadAlerts = activeAlerts.length + activeSosIncidents.length;

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} />
      <div className="main-wrapper">
        <Topbar
          onMenu={() => setSidebarOpen(!sidebarOpen)}
          alertCount={totalUnreadAlerts}
          onRefresh={loadInitialData}
          onToggleNotifications={() => setNotificationsOpen(!notificationsOpen)}
          hasActiveSos={hasActiveSos}
        />

        <NotificationsDrawer
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          alerts={alerts}
          incidents={incidents}
          onAutoDispatch={handleAutoDispatch}
          onClearAlerts={() => setAlerts([])}
          userLat={userLat}
          userLng={userLng}
        />

        {notification && (
          <div className="toast-notification">
            <Sparkles size={16} color="#38bdf8" />
            <span>{notification}</span>
            <button onClick={() => setNotification(null)}><X size={14} /></button>
          </div>
        )}

        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  zones={zones}
                  incidents={incidents}
                  alerts={alerts}
                  resources={resources}
                  chronicBlockages={chronicBlockages}
                  emergencyServices={emergencyServices}
                  shelters={shelters}
                  shelterLoading={shelterLoading}
                  shelterError={shelterError}
                  shelterStatus={shelterStatus}
                  selectedShelter={selectedShelter}
                  activeRoute={activeRoute}
                  loadingRoute={loadingRoute}
                  onSelectShelter={handleSelectShelter}
                  onClearRoute={handleClearRoute}
                  userLat={userLat}
                  userLng={userLng}
                  userLocationName={userLocationName}
                  locationMode={locationMode}
                  locationStatus={locationStatus}
                  onSelectLocation={handleSelectLocation}
                  onManualSearch={handleManualSearch}
                  onSelectPresetHub={handleSelectPresetHub}
                  onDetectGps={handleDetectGps}
                  onRetryShelters={() => fetchSheltersAndLocationData(userLat, userLng, userLocationName, locationMode)}
                  notify={notify}
                  syncWeather={syncWeather}
                  syncing={syncing}
                  onAutoDispatch={handleAutoDispatch}
                  onVerify={handleVerify}
                  onFalseAlarm={handleFalseAlarm}
                  onOpenOverride={setOverrideIncident}
                  onViewPhoto={(url, inc, isVideo) => setPhotoModal({ url, incident: inc, isVideo })}
                  onGenerateReport={handleGenerateReport}
                  onResetReputation={handleResetReputation}
                />
              }
            />
            <Route
              path="/alerts"
              element={
                <AlertsPage
                  alerts={alerts}
                  setAlerts={setAlerts}
                  userLat={userLat}
                  userLng={userLng}
                  userLocationName={userLocationName}
                  locationMode={locationMode}
                  locationStatus={locationStatus}
                  onDetectGps={handleDetectGps}
                  notify={notify}
                  onReloadAlerts={loadInitialData}
                />
              }
            />
            <Route
              path="/map"
              element={
                <RiskMap
                  zones={zones}
                  incidents={incidents}
                  resources={resources}
                  shelters={shelters}
                  shelterLoading={shelterLoading}
                  shelterError={shelterError}
                  shelterStatus={shelterStatus}
                  selectedShelter={selectedShelter}
                  activeRoute={activeRoute}
                  loadingRoute={loadingRoute}
                  onSelectShelter={handleSelectShelter}
                  onClearRoute={handleClearRoute}
                  userLat={userLat}
                  userLng={userLng}
                  userLocationName={userLocationName}
                  locationMode={locationMode}
                  locationStatus={locationStatus}
                  onSelectLocation={handleSelectLocation}
                  onManualSearch={handleManualSearch}
                  onSelectPresetHub={handleSelectPresetHub}
                  onDetectGps={handleDetectGps}
                  notify={notify}
                  onAutoDispatch={handleAutoDispatch}
                  onVerify={handleVerify}
                  onFalseAlarm={handleFalseAlarm}
                  onResolve={handleResolve}
                  onOpenOverride={setOverrideIncident}
                />
              }
            />
            <Route
              path="/incidents"
              element={
                <Incidents
                  incidents={incidents}
                  resources={resources}
                  notify={notify}
                  onReload={loadInitialData}
                  onAutoDispatch={handleAutoDispatch}
                  onVerify={handleVerify}
                  onFalseAlarm={handleFalseAlarm}
                  onResolve={handleResolve}
                  onOpenOverride={setOverrideIncident}
                  onViewPhoto={(url, inc, isVideo) => setPhotoModal({ url, incident: inc, isVideo })}
                  onResetReputation={handleResetReputation}
                />
              }
            />
            <Route
              path="/incidents/:id"
              element={
                <IncidentDetailPage
                  incidents={incidents}
                  resources={resources}
                  notify={notify}
                  onReload={loadInitialData}
                  onAutoDispatch={handleAutoDispatch}
                  onVerify={handleVerify}
                  onFalseAlarm={handleFalseAlarm}
                  onOpenOverride={setOverrideIncident}
                  onViewPhoto={(url, inc, isVideo) => setPhotoModal({ url, incident: inc, isVideo })}
                  onResetReputation={handleResetReputation}
                />
              }
            />
            <Route
              path="/zones/:id"
              element={
                <ZoneDetailPage
                  zones={zones}
                  incidents={incidents}
                  alerts={alerts}
                  resources={resources}
                  shelters={shelters}
                  chronicBlockages={chronicBlockages}
                  notify={notify}
                  onReload={loadInitialData}
                  onAutoDispatch={handleAutoDispatch}
                  onVerify={handleVerify}
                  onFalseAlarm={handleFalseAlarm}
                  onResolve={handleResolve}
                  onOpenOverride={setOverrideIncident}
                  onViewPhoto={(url, inc, isVideo) => setPhotoModal({ url, incident: inc, isVideo })}
                  onResetReputation={handleResetReputation}
                />
              }
            />
            <Route
              path="/dispatch"
              element={
                <Dispatch
                  incidents={incidents}
                  resources={resources}
                  notify={notify}
                  onReload={loadInitialData}
                  onAutoDispatch={handleAutoDispatch}
                />
              }
            />
            <Route
              path="/resources"
              element={
                <ResourcesPage
                  resources={resources}
                  setResources={setResources}
                  userLat={userLat}
                  userLng={userLng}
                  userLocationName={userLocationName}
                  notify={notify}
                  onReload={loadInitialData}
                />
              }
            />
            <Route
              path="/drainage"
              element={
                <Drainage
                  zones={zones}
                  incidents={incidents}
                  chronicBlockages={chronicBlockages}
                  notify={notify}
                  onGenerateReport={handleGenerateReport}
                />
              }
            />
            <Route
              path="/multi-agent"
              element={
                <MultiAgentOps
                  incidents={incidents}
                  resources={resources}
                  zones={zones}
                  notify={notify}
                  onReload={loadInitialData}
                />
              }
            />
            <Route path="/settings" element={<SettingsPage notify={notify} />} />
          </Routes>
        </main>
      </div>

      {overrideIncident && (
        <OverrideModal
          incident={overrideIncident}
          resources={resources}
          onClose={() => setOverrideIncident(null)}
          onSubmit={handleOverrideSubmit}
        />
      )}

      {photoModal && (
        <MediaLightboxModal
          mediaUrl={photoModal.url}
          incident={photoModal.incident}
          isVideo={photoModal.isVideo}
          onClose={() => setPhotoModal(null)}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
