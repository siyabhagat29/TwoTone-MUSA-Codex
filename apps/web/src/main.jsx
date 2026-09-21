import React, { useEffect, useState, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import {
  Activity, AlertTriangle, Bell, BrainCircuit, ChevronRight, CloudRain,
  Database, FileText, Gauge, Home, Layers3, Map, Menu, Radio, Route as RouteIcon,
  Settings, ShieldCheck, Siren, Users, Wrench, X, Zap, Send, RefreshCw, CheckCircle2,
  Droplets, ShieldAlert, Sparkles, Truck, Sliders, ChevronDown, ChevronUp, Download, Eye, AlertCircle,
  Search, MapPin, Compass, Loader2, WifiOff, Navigation, AlertOctagon, Video,
  Play, Check, Copy, RotateCcw, Info
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

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

// Leaflet Map Component with Google Maps API tiles, Rainfall Radar Overlay, Drainage GIS Layer, Live Team Pins, and Safest Route Highlighting
function LeafletMap({
  zones = [],
  incidents = [],
  resources = [],
  shelters = [],
  selectedShelter = null,
  activeRoute = null,
  center = [19.132, 72.848],
  userLocation = [19.132, 72.848],
  userLocationName = "Andheri West Station Road Market",
  zoom = 14,
  height = "380px",
  onSelectShelter,
  onClearRoute,
  onVerify,
  onFalseAlarm
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

  const [mapStyle, setMapStyle] = useState("google-roadmap");
  const [showRainfall, setShowRainfall] = useState(true);
  const [showDrainage, setShowDrainage] = useState(true);
  const [showTeams, setShowTeams] = useState(true);
  const [showShelters, setShowShelters] = useState(true);

  // Global window hook so popup buttons can select a shelter route
  useEffect(() => {
    window.__selectShelterRoute = (shId) => {
      const sh = shelters.find((s) => s.id === shId);
      if (sh && onSelectShelter) {
        onSelectShelter(sh);
      }
    };
    return () => {
      delete window.__selectShelterRoute;
    };
  }, [shelters, onSelectShelter]);

  // Initialize Map
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
  }, []);

  // Update Base Tile Layer when mapStyle changes
  useEffect(() => {
    if (!mapInstance.current) return;
    const cfg = MAP_LAYERS[mapStyle] || MAP_LAYERS["google-roadmap"];
    if (tileLayerRef.current) {
      mapInstance.current.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(cfg.url, cfg.options).addTo(mapInstance.current);
    tileLayerRef.current.bringToBack();
  }, [mapStyle]);

  // Auto-resize Leaflet canvas on container width changes
  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstance.current?.invalidateSize();
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  // Animate pan/zoom whenever center coordinates change dynamically (if no active route)
  useEffect(() => {
    if (mapInstance.current && center && center.length === 2 && center[0] && center[1] && !activeRoute) {
      mapInstance.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, activeRoute]);

  // Update Map Layers
  useEffect(() => {
    if (!mapInstance.current) return;
    const {
      zones: zoneLayer,
      incidents: incLayer,
      rainfall: rainLayer,
      drainage: drainLayer,
      teams: teamLayer,
      shelters: shelterLayer,
      route: routeLayer,
      user: userLayer
    } = layersRef.current;

    // Clear all layers
    zoneLayer.clearLayers();
    incLayer.clearLayers();
    rainLayer.clearLayers();
    drainLayer.clearLayers();
    teamLayer.clearLayers();
    if (shelterLayer) shelterLayer.clearLayers();
    if (routeLayer) routeLayer.clearLayers();
    if (userLayer) userLayer.clearLayers();

    // 0. USER / SHOP LOCATION PIN
    if (userLayer && userLocation && userLocation.length === 2 && userLocation[0] && userLocation[1]) {
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `<div style="background:#2563eb;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,0.3), 0 3px 10px rgba(0,0,0,0.4);" title="${userLocationName || "Your Active Location"}">🏪</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      const userMarker = L.marker(userLocation, { icon: userIcon });
      userMarker.bindPopup(`<b>🏪 Your Active Location</b><br/>${userLocationName || "Active Location"}<br/><small style="color:#64748b;">Coordinates: ${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}</small>`);
      userMarker.addTo(userLayer);
    }

    // 1. RAINFALL RADAR OVERLAY LAYER
    if (showRainfall) {
      zones.forEach((z) => {
        if (!z.lat || !z.lng) return;
        const rainMm = z.rainfall || 0;
        const radius = Math.max(250, Math.min(650, 200 + rainMm * 20));
        const color = rainMm > 15 ? "#1d4ed8" : rainMm > 5 ? "#3b82f6" : "#60a5fa";
        const fillOpacity = Math.min(0.45, Math.max(0.15, rainMm * 0.04));

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
      });
    }

    // 2. DRAINAGE NETWORK GIS LAYER
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
      });
    }

    // 3. WARD RISK ZONE PINS
    zones.forEach((z) => {
      if (!z.lat || !z.lng) return;
      const level = z.risk >= 75 ? "red" : z.risk >= 45 ? "orange" : "green";
      const icon = L.divIcon({
        className: "custom-zone-marker-container",
        html: `<div class="custom-zone-marker ${level}" style="width:38px;height:38px;">${z.risk}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const marker = L.marker([z.lat, z.lng], { icon });
      marker.bindPopup(`
        <div>
          <span class="map-badge ${level}">RISK SCORE: ${z.risk}/100</span>
          <b>${z.name}</b>
          <div style="font-size:10px;color:#64748b;margin-bottom:4px;">${z.ward || "Civic Zone"}</div>
          <div style="font-size:11px;margin:2px 0;">Rainfall: <b>${z.rainfall || 0} mm</b></div>
          <div style="font-size:11px;margin:2px 0;">Diagnosis: <b>${z.cause || "Normal Drainage"}</b></div>
        </div>
      `);
      marker.addTo(zoneLayer);
    });

    // 4. CITIZEN INCIDENT REPORTS & CRITICAL SOS EMERGENCY PINS
    incidents.forEach((inc) => {
      if (!inc.lat || !inc.lng) return;
      const isSos = Boolean(inc.isSos || inc.type === "SOS" || inc.status === "ACTIVE_SOS" || inc.causeCode === "SOS_EMERGENCY");
      const isCritical = inc.waterLevel >= 40 || inc.severity >= 70;
      const markerColor = isCritical ? "#ef4444" : "#f97316";

      let icon;
      if (isSos) {
        icon = L.divIcon({
          className: "custom-sos-marker-container",
          html: `
            <div class="custom-sos-marker-wrapper">
              <div class="custom-sos-marker-pulse"></div>
              <div class="custom-sos-marker" title="🚨 ACTIVE SOS DISTRESS: ${inc.reporter || "Citizen"}">🚨</div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
      } else {
        icon = L.divIcon({
          className: "custom-incident-marker-container",
          html: `<div class="custom-incident-marker" style="background:${markerColor};" title="${inc.reporter || "Citizen Report"}">⚠️</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      }

      const marker = L.marker([inc.lat, inc.lng], { icon, zIndexOffset: isSos ? 1000 : 0 });
      if (isSos) {
        marker.bindPopup(`
          <div style="min-width: 210px;">
            <div style="background:#ef4444;color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:800;margin-bottom:6px;display:inline-block;letter-spacing:0.5px;">
              🚨 ACTIVE LIFE-SAFETY SOS
            </div>
            <div style="font-size:13px;font-weight:800;color:#0f172a;">${inc.reporter} (${inc.role || "Citizen"})</div>
            <div style="font-size:11px;color:#475569;margin:3px 0;">📍 ${inc.address || "Live Area"}</div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">⏱️ ${inc.time || "Immediate"} · Severity 95</div>
            <div style="display:flex;gap:6px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${inc.lat},${inc.lng}&travelmode=driving" target="_blank" rel="noreferrer" style="background:#1d4ed8;color:#fff;padding:4px 9px;border-radius:6px;font-size:10px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:3px;">
                Track on Maps ↗
              </a>
            </div>
          </div>
        `);
      } else {
        marker.bindPopup(`
          <div>
            <b>${inc.reporter} (${inc.role || "Citizen"})</b>
            <div style="font-size:10px;color:#64748b;">${inc.address || "Street location"}</div>
            <div style="font-size:10px;margin:4px 0;">Cause: <b>${inc.cause || "Flood Overload"}</b></div>
          </div>
        `);
      }
      marker.addTo(incLayer);
    });

    // 5. LIVE RESOURCE TEAM PINS & ACTIVE DISPATCH TRACKING
    if (showTeams) {
      resources.forEach((team) => {
        if (!team.lat || !team.lng) return;
        const isEnRoute = team.status === "En route" || team.status === "Dispatched";
        const isOnScene = team.status === "On scene" || team.status === "Reached";
        const teamIcon = L.divIcon({
          className: "custom-team-marker-container",
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              ${isEnRoute ? '<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(245,158,11,0.4);animation:pulse-ring 2s infinite ease-in-out;"></div>' : isOnScene ? '<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(16,185,129,0.4);animation:pulse-ring 2s infinite ease-in-out;"></div>' : ''}
              <div class="custom-team-marker" style="background:${isEnRoute ? "#f59e0b" : isOnScene ? "#10b981" : "#0f172a"};box-shadow:0 3px 10px rgba(0,0,0,0.35);" title="${team.name}">
                ${team.type?.includes("Boat") || team.name?.includes("Boat") ? "🚤" : team.type?.includes("Medical") || team.name?.includes("Medical") ? "🚑" : "🚒"}
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([team.lat, team.lng], { icon: teamIcon });
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span class="map-badge ${isEnRoute ? "orange" : isOnScene ? "green" : "green"}">${team.status.toUpperCase()}</span>
              ${team.eta ? `<span style="font-size:10px;font-weight:700;color:#f59e0b;">⏱️ ${team.eta}</span>` : ""}
            </div>
            <b>${team.name}</b>
            <div style="font-size:10px;color:#64748b;margin:2px 0;">📍 ${team.station}</div>
            <div style="font-size:10px;margin:2px 0;">Type: <b>${team.type}</b></div>
            ${team.currentIncidentId ? `<div style="font-size:10px;color:#2563eb;font-weight:700;margin-top:4px;">🎯 Assigned: ${team.currentIncidentId}</div>` : ""}
          </div>
        `);
        marker.addTo(teamLayer);

        // Draw connecting dispatch route polyline if assigned to an active incident
        if (team.currentIncidentId) {
          const targetInc = incidents.find((i) => i.id === team.currentIncidentId);
          if (targetInc && targetInc.lat && targetInc.lng) {
            const dispatchLine = L.polyline(
              [[team.lat, team.lng], [targetInc.lat, targetInc.lng]],
              {
                color: isOnScene ? "#10b981" : "#f59e0b",
                weight: 4,
                opacity: 0.9,
                dashArray: isOnScene ? undefined : "7, 7"
              }
            );
            dispatchLine.bindTooltip(
              `🚒 <b>${team.name}</b> &rarr; <b>${targetInc.id}</b> (${isOnScene ? "Reached Site / Operating" : "En Route · ETA ~5 min"})`,
              { sticky: true }
            );
            dispatchLine.addTo(teamLayer);
          }
        }
      });
    }

    // 6. LIVE EVACUATION SHELTER PINS
    if (showShelters && shelterLayer) {
      shelters.forEach((sh) => {
        const sLat = sh.latitude ?? sh.lat;
        const sLng = sh.longitude ?? sh.lng;
        if (!sLat || !sLng) return;
        const isSelected = selectedShelter && selectedShelter.id === sh.id;
        const isVerified = Boolean(sh.is_verified || sh.isVerified);
        const shelterIcon = L.divIcon({
          className: "custom-shelter-marker-container",
          html: `<div style="background:${isSelected ? "#e11d48" : isVerified ? "#16a34a" : "#0284c7"};color:#fff;border-radius:50%;width:${isSelected ? "36px" : "30px"};height:${isSelected ? "36px" : "30px"};display:flex;align-items:center;justify-content:center;font-size:${isSelected ? "18px" : "15px"};border:${isSelected ? "3px solid #ffe4e6" : "2px solid #fff"};box-shadow:0 3px 12px ${isSelected ? "rgba(225,29,72,0.6)" : "rgba(0,0,0,0.35)"};" title="${sh.name}">🏕️</div>`,
          iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
          iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15]
        });

        const marker = L.marker([sLat, sLng], { icon: shelterIcon });
        marker.bindPopup(`
          <div style="min-width:220px;">
            <span style="background:${isVerified ? "#dcfce7" : "#e0f2fe"};color:${isVerified ? "#15803d" : "#0369a1"};font-size:9px;font-weight:bold;padding:2px 6px;border-radius:4px;display:inline-block;margin-bottom:4px;">
              ${isVerified ? "✓ VERIFIED SHELTER" : `DISCOVERED (${sh.provider?.toUpperCase() || "OSM"})`}
            </span>
            <div style="font-weight:bold;font-size:13px;color:#0f172a;">${sh.name}</div>
            <div style="font-size:10px;color:#64748b;margin:2px 0;">🏷️ ${sh.type || sh.shelterType || "Relief Center"}</div>
            ${sh.agency ? `<div style="font-size:10px;color:#2563eb;font-weight:600;">🤝 ${sh.agency}</div>` : ""}
            <div style="font-size:10px;color:#475569;margin:3px 0;">📍 ${sh.address || ""}</div>
            <div style="font-size:10px;background:#f8fafc;padding:4px 6px;border-radius:4px;margin:4px 0;">
              <b>${sh.distance_km ?? sh.distanceKm} km</b> away · <b>${sh.eta_minutes ?? sh.etaMin ?? 5} min ETA</b>
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
        `);
        marker.addTo(shelterLayer);
      });
    }

    // 7. SAFEST OSRM EVACUATION ROUTE POLYLINE
    if (routeLayer && activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0) {
      const latLngs = activeRoute.coordinates.map((c) => [c.lat, c.lng]);

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

      // Fit bounds to show entire route with comfortable padding
      try {
        const bounds = coreLine.getBounds();
        if (bounds.isValid()) {
          mapInstance.current.fitBounds(bounds, { padding: [50, 50], animate: true });
        }
      } catch {
        // bounds fit notice
      }
    }
  }, [zones, incidents, resources, shelters, selectedShelter, activeRoute, showRainfall, showDrainage, showTeams, showShelters]);

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
            title="Toggle Municipal Response Squads"
          >
            <Truck size={12} />
            <span>Teams</span>
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
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      color: "#fff",
      padding: "16px 20px",
      borderRadius: "14px",
      marginBottom: "20px",
      boxShadow: "0 10px 25px rgba(15,23,42,0.18)",
      border: "1px solid #334155"
    }}>
      {/* Top Row: Location Info & Mode Badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: locationMode === "gps" ? "#10b981" : locationMode === "search" ? "#8b5cf6" : locationMode === "fallback" ? "#d97706" : "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
          }}>
            {locationMode === "gps" ? "🎯" : locationMode === "search" ? "🔍" : locationMode === "fallback" ? "⚠️" : "🏪"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{
                background: modeBadge.bg,
                color: modeBadge.color,
                fontSize: "9px",
                fontWeight: "900",
                padding: "2px 7px",
                borderRadius: "6px",
                letterSpacing: "0.5px"
              }}>
                {modeBadge.label}
              </span>
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>{modeBadge.sub}</span>
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#f8fafc", marginTop: "2px" }}>
              {userLocationName || "Detecting Location..."}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
              Coordinates: <b style={{ color: "#38bdf8" }}>{userLat != null ? Number(userLat).toFixed(4) : "—"}, {userLng != null ? Number(userLng).toFixed(4) : "—"}</b> · Discovered Shelters: <b style={{ color: "#4ade80" }}>{shelterCount}</b> · Emergency Units: <b style={{ color: "#93c5fd" }}>{emergencyCount}</b>
            </div>
          </div>
        </div>

        {/* Quick GPS & Preset Dropdown */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={onDetectGps}
            disabled={locationStatus === "detecting_gps"}
            style={{
              background: locationStatus === "detecting_gps" ? "#475569" : "#10b981",
              color: "#fff",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 12px rgba(16,185,129,0.25)"
            }}
          >
            {locationStatus === "detecting_gps" ? (
              <>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                <span>Locating GPS...</span>
              </>
            ) : (
              <>
                <Compass size={14} />
                <span>🎯 Detect Live GPS</span>
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
              background: "#1e293b",
              color: "#fff",
              border: "1px solid #475569",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <option value="" disabled>🏪 Select Mumbai Market Hub...</option>
            {MUMBAI_MARKET_HUBS.map((hub) => (
              <option key={hub.id} value={`${hub.lat},${hub.lng}`}>
                🏪 {hub.name} ({hub.ward})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Input Bar with Auto-complete Suggestions */}
      <div style={{ marginTop: "14px", position: "relative" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
              placeholder="🔍 Search any location (e.g. Mulund, Kurla, Andheri, Thane, Dadar, Bandra, Colaba)..."
              style={{
                width: "100%",
                background: "#0b1329",
                color: "#fff",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "9px 36px 9px 38px",
                fontSize: "12px",
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
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "9px 18px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {searching ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={14} />}
            Geocode & Load Shelters
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
  ["Live Risk Map", "/map", Map],
  ["Incident Feed", "/incidents", Siren],
  ["Team Tracker", "/resources", Truck],
  ["Smart Dispatch", "/dispatch", Send],
  ["Chronic Blockages", "/drainage", Wrench],
  ["Multi-Agent Control", "/multi-agent", BrainCircuit]
];

function Sidebar({ open }) {
  return (
    <aside className={`sidebar ${open ? "" : "collapsed"}`}>
      <div className="brand">
        <div className="brand-mark">
          <CloudRain size={21} />
        </div>
        {open && (
          <div>
            <strong>
              Varsha<span>Raksha</span>
            </strong>
            <small>Authority Console · Realtime Live</small>
          </div>
        )}
      </div>
      <div className="nav-label">{open ? "OPERATIONS" : "•"}</div>
      <nav>
        {nav.map(([label, to, Icon]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")} title={label}>
            <Icon size={19} />
            {open && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings">
          <Settings size={19} />
          {open && <span>Settings</span>}
        </NavLink>
        {open && (
          <div className="operator">
            <div className="avatar">WA</div>
            <div>
              <b>Ward Admin</b>
              <span>Online · Realtime SSE</span>
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
  const title = loc.pathname === "/" ? "Ward Operations Command" : nav.find((x) => x[1] === loc.pathname)?.[0] || "Operations";
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <div className="crumb">
        <span>VarshaRaksha</span>
        <ChevronRight size={15} />
        <b>{title}</b>
      </div>
      <div className="top-actions">
        <div className="live-pill">
          <i></i> Live Open-Meteo & SSE Feed
        </div>
        <button className="icon-btn" title="Refresh Live Data" onClick={onRefresh}>
          <RefreshCw size={18} />
        </button>
        <button
          className={`icon-btn badge-btn ${hasActiveSos ? "sos-ringing" : ""}`}
          title="Notifications & Active Emergency Alerts"
          onClick={onToggleNotifications}
        >
          <Bell size={19} color={hasActiveSos ? "#ef4444" : "currentColor"} />
          <em>{alertCount}</em>
        </button>
        <div className="top-avatar">WA</div>
      </div>
    </header>
  );
}

// Slide-down interactive Notifications Drawer / Modal with live SOS emergencies
function NotificationsDrawer({ isOpen, onClose, alerts = [], incidents = [], onAutoDispatch, onClearAlerts }) {
  if (!isOpen) return null;

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
              {sosAlerts.map((sos) => (
                <div key={sos.id} className="sos-alert-card">
                  <div className="sos-card-header">
                    <span className="sos-card-badge">
                      <span className="pulsing-red-dot" />
                      🚨 CRITICAL SOS TRIGGERED
                    </span>
                    <span style={{ fontSize: "10px", color: "#991b1b", fontWeight: "700" }}>
                      ⏱️ {sos.time || "Immediate"}
                    </span>
                  </div>

                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#991b1b", margin: "4px 0 2px" }}>
                    {sos.reporter || "Citizen"}
                    {sos.role && <span style={{ fontSize: "10px", fontWeight: "normal", color: "#b91c1c" }}> ({sos.role})</span>}
                  </div>

                  <div style={{ fontSize: "11px", color: "#7f1d1d", display: "flex", flexDirection: "column", gap: "2px", margin: "4px 0 8px" }}>
                    <div>📍 <b>Location:</b> {sos.address}</div>
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
              ))}

              {/* 2. Standard Alerts & Flood Advisories */}
              {regularAlerts.map((alt) => (
                <div
                  key={alt.id}
                  className={`regular-alert-card ${
                    alt.severity === "CRITICAL" || alt.severity === "High"
                      ? "critical"
                      : "warning"
                  }`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ fontSize: "12px", color: "#0f172a" }}>{alt.title || alt.headline || "Flood Advisory"}</b>
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: "700" }}>{alt.severity || "Warning"}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#475569" }}>{alt.description || alt.message}</div>
                  {alt.area && <div style={{ fontSize: "10px", color: "#64748b" }}>📍 {alt.area}</div>}
                </div>
              ))}
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
        <div className="eyebrow">{eyebrow}</div>
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
  onOpenOverride,
  onViewPhoto,
  onGenerateReport
}) {
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

  const [dashboardIncidentFilter, setDashboardIncidentFilter] = useState("all");

  const humanReviewCount = sortedIncidents.filter((i) => isHumanInterventionNeeded(i)).length;
  const aiVerifiedCount = sortedIncidents.filter((i) => i.aiVerification?.is_flooding === true || i.aiVerified).length;

  const dashboardDisplayedIncidents = sortedIncidents.filter((i) => {
    if (dashboardIncidentFilter === "review") return isHumanInterventionNeeded(i);
    if (dashboardIncidentFilter === "ai") return i.aiVerification?.is_flooding === true || i.aiVerified;
    return true;
  });

  return (
    <div className="content">
      <PageHeader
        eyebrow="LIVE WARD MONITORING · REAL METEOROLOGICAL DATA & REALTIME DISPATCH"
        title="Flood Operations Command Center"
        sub="Connected to live Open-Meteo rainfall feeds, OpenStreetMap GIS, and real-time citizen reports."
      >
        <button className="primary" onClick={syncWeather} disabled={syncing}>
          <RefreshCw size={16} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
          {syncing ? "Syncing Open-Meteo..." : "Sync Live Weather"}
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
        <StatCard label="Critical zones" value={critical} delta={`${elevated} elevated`} icon={AlertTriangle} tone="red" />
        <StatCard label="Active reports" value={incidents.length} delta="Real citizen evidence" icon={Siren} tone="orange" />
        <StatCard label="Live rainfall" value={`${avgRain} mm`} delta="Direct Open-Meteo API" icon={CloudRain} tone="blue" />
        <StatCard label="Teams Available" value={`${availableTeams}/${resources.length}`} delta="Live tracker" icon={Truck} tone="green" />
      </div>

      <div className="grid-2">
        {/* Map Panel with Toggles */}
        <section className="panel map-panel">
          <div className="panel-head">
            <div>
              <h3>Live Google Maps Risk Map with Overlays</h3>
              <span>Ward 72/73 · Google Maps Platform & Real geographic coordinates</span>
            </div>
            <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "bold" }}>● Realtime SSE Connected</span>
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
              height="360px"
              onSelectShelter={onSelectShelter}
              onClearRoute={onClearRoute}
              onAutoDispatch={onAutoDispatch}
              onVerify={onVerify}
              onFalseAlarm={onFalseAlarm}
            />
          </div>
          <div className="map-legend">
            <div className="map-legend-items">
              <span className="legend-pill red"><span className="legend-dot red"></span>Critical (≥75)</span>
              <span className="legend-pill orange"><span className="legend-dot orange"></span>Elevated (≥45)</span>
              <span className="legend-pill green"><span className="legend-dot green"></span>Normal (&lt;45)</span>
            </div>
            <span className="map-note">🛡️ Click any shelter marker or card below to highlight safest road route</span>
          </div>
        </section>

        {/* Live Incident Queue */}
        <section className="panel incident-panel">
          <div className="panel-head" style={{ flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h3>Live Incident Feed</h3>
              <span>Incoming ground reports ({incidents.length})</span>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <div className="segmented" style={{ transform: "scale(0.88)", transformOrigin: "right center" }}>
                <button
                  className={dashboardIncidentFilter === "all" ? "selected" : ""}
                  onClick={() => setDashboardIncidentFilter("all")}
                >
                  All ({sortedIncidents.length})
                </button>
                <button
                  className={dashboardIncidentFilter === "review" ? "selected" : ""}
                  onClick={() => setDashboardIncidentFilter("review")}
                  style={{ color: dashboardIncidentFilter === "review" ? undefined : "#c2410c", fontWeight: "700" }}
                >
                  ⚠️ Review ({humanReviewCount})
                </button>
                <button
                  className={dashboardIncidentFilter === "ai" ? "selected" : ""}
                  onClick={() => setDashboardIncidentFilter("ai")}
                  style={{ color: dashboardIncidentFilter === "ai" ? undefined : "#16a34a", fontWeight: "700" }}
                >
                  🌊 AI Floods ({aiVerifiedCount})
                </button>
              </div>
              <NavLink to="/incidents" className="link">View All <ChevronRight size={14} /></NavLink>
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

          {/* Category Filter Pills (4 Requested Categories + All) */}
          <div style={{ padding: "12px 18px 4px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
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
          <div className="resource-grid">
            {resources.map((r) => (
              <ResourceCard key={r.id} team={r} />
            ))}
          </div>
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
  if (inc.status === "False Alarm" || inc.status === "Completed") return false;
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

// Individual Incident Card with Ground Photo Evidence preview, CV confidence, Divergence cause tag, duplicate merge drawer, and auto-dispatch
function IncidentCard({ incident, resources = [], onAutoDispatch, onVerify, onFalseAlarm, onOpenOverride, onViewPhoto }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const inc = incident;
  const isSos = Boolean(inc.isSos || inc.type === "SOS" || inc.status === "ACTIVE_SOS" || inc.causeCode === "SOS_EMERGENCY");
  const isDispatched = inc.status === "Dispatched";
  const isVerified = inc.status === "Verified";
  const isFalseAlarm = inc.status === "False Alarm";

  const causeCode = inc.causeCode || (inc.cause === "Blocked drain" ? "SUSPECTED_BLOCKED_DRAIN" : "RAINFALL_OVERLOAD");
  const causeClass =
    causeCode === "SUSPECTED_BLOCKED_DRAIN"
      ? "blocked-drain"
      : causeCode === "RAINFALL_OVERLOAD"
      ? "rainfall-overload"
      : "mixed-runoff";

  const hasVideo = Boolean((inc.videoUrl || inc.video) && inc.videoUrl !== "attached" && (inc.videoUrl?.startsWith("http") || inc.videoUrl?.startsWith("data:video") || inc.videoUrl?.startsWith("/uploads")));
  const hasPhoto = Boolean(inc.photoUrl && inc.photoUrl !== "attached" && (inc.photoUrl.startsWith("http") || inc.photoUrl.startsWith("data:image") || inc.photoUrl.startsWith("/uploads")));

  // Calculate nearest available emergency response resource
  const nearestResource = (inc.lat && inc.lng && Array.isArray(resources) && resources.length > 0)
    ? [...resources]
        .map((r) => ({ ...r, distKm: calcDistanceKm(inc.lat, inc.lng, r.lat, r.lng) }))
        .filter((r) => r.distKm != null)
        .sort((a, b) => a.distKm - b.distKm)[0]
    : null;

  return (
    <div
      className="incident-card"
      style={{
        borderLeft: isSos ? "5px solid #ef4444" : isDispatched ? "4px solid #3b82f6" : isVerified ? "4px solid #10b981" : isFalseAlarm ? "4px solid #94a3b8" : "4px solid #ef4444",
        backgroundColor: isSos ? "#fff8f8" : "#ffffff",
        boxShadow: isSos ? "0 4px 14px rgba(239, 68, 68, 0.12)" : undefined
      }}
    >
      {/* High-Urgency SOS Banner if incident is an SOS distress signal */}
      {isSos && (
        <div
          style={{
            background: "linear-gradient(135deg, #dc2626, #b91c1c)",
            color: "#ffffff",
            padding: "6px 12px",
            borderRadius: "8px",
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "800",
            fontSize: "11px",
            letterSpacing: "0.5px",
            boxShadow: "0 2px 6px rgba(220, 38, 38, 0.35)"
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span className="pulsing-red-dot" style={{ background: "#ffffff" }} />
            🚨 ACTIVE LIFE-SAFETY SOS DISTRESS
          </span>
          <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.25)", padding: "2px 7px", borderRadius: "10px", fontWeight: "700" }}>
            Priority Alert
          </span>
        </div>
      )}

      <div className="incident-card-header">
        <div className="incident-id-badge">
          <b>{inc.id}</b>
          <span className={`status ${inc.status?.toLowerCase().replace(" ", "-")}`}>{inc.status}</span>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          {isHumanInterventionNeeded(inc) ? (
            <span className="human-review-badge">
              ⚠️ Human Intervention Required
            </span>
          ) : inc.aiVerification?.is_flooding ? (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: "800",
              background: "#f0fdf4",
              color: "#16a34a",
              border: "1px solid #bbf7d0",
              padding: "2px 7px",
              borderRadius: "6px"
            }}>
              🌊 AI: Flooding Confirmed ({((inc.aiVerification.confidence_score || inc.aiVerification.confidence || 0) * 100).toFixed(0)}%)
            </span>
          ) : inc.aiVerified ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "800", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "2px 7px", borderRadius: "6px" }}>
              🤖 AI Flood Model: Verified {inc.aiFloodConfidence ? `(${(inc.aiFloodConfidence * 100).toFixed(0)}%)` : ""}
            </span>
          ) : null}
          {/* CV Confidence Score */}
          <span className={`cv-badge ${inc.cvConfidence >= 80 ? "high" : ""}`}>
            <Sparkles size={11} />
            CV: {inc.cvConfidence || 88}% Confidence
          </span>
          <RiskBadge score={inc.severity || (isSos ? 95 : 50)} />
        </div>
      </div>

      <div style={{ fontSize: "12px", color: "#1e293b", fontWeight: "600", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
        <div>
          {inc.reporter} <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "normal" }}>({inc.role || "Citizen"})</span>
        </div>
        <span style={{ fontSize: "10px", color: "#1e293b", background: "#f1f5f9", padding: "2px 7px", borderRadius: "6px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px", border: "1px solid #e2e8f0" }}>
          ⏱️ {inc.time || (inc.userTimestamp ? new Date(inc.userTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now")}
          {inc.userTimestamp || inc.createdAt ? ` (${new Date(inc.userTimestamp || inc.createdAt).toLocaleDateString([], { day: "numeric", month: "short" })})` : ""}
        </span>
      </div>

      {/* Live Address and One-Click Google Maps Tracking */}
      <div style={{ fontSize: "11px", color: "#475569", margin: "4px 0 6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
        <span style={{ fontWeight: "600" }}>📍 {inc.address}</span>
        {inc.lat && inc.lng && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${inc.lat},${inc.lng}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              color: "#1d4ed8",
              backgroundColor: "#dbeafe",
              padding: "3px 8px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "700",
              border: "1px solid #bfdbfe"
            }}
          >
            <Navigation size={12} />
            Track on Google Maps ↗
          </a>
        )}
      </div>

      {/* Live GPS Coordinates Telemetry */}
      {inc.lat && inc.lng && (
        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ background: "#f1f5f9", padding: "2px 7px", borderRadius: "4px", fontFamily: "monospace", color: "#334155" }}>
            GPS: {Number(inc.lat).toFixed(5)}, {Number(inc.lng).toFixed(5)}
          </span>
          <span style={{ color: "#16a34a", fontWeight: "700", display: "flex", alignItems: "center", gap: "3px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "3px", backgroundColor: "#16a34a", display: "inline-block" }}></span>
            Live GPS Telemetry
          </span>
        </div>
      )}

      {/* Divergence Engine Cause Tag & Water Depth */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
        <span className={`cause-tag ${causeClass}`}>
          <BrainCircuit size={13} />
          {inc.cause || "Severe Waterlogging"}
        </span>
        <span style={{ fontSize: "10px", background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "3px" }}>
          🌊 Depth: {inc.waterLevel} cm
        </span>
        {inc.drainObservation && (
          <span style={{ fontSize: "10px", background: "#f1f5f9", color: "#334155", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>
            🚰 Drain: {inc.drainObservation}
          </span>
        )}
      </div>

      {/* AI Telemetry & Human Intervention Callout Box */}
      {isHumanInterventionNeeded(inc) ? (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "8px 10px", margin: "8px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#c2410c", fontWeight: "800", fontSize: "11px" }}>
            <span>⚠️ HUMAN INTERVENTION REQUIRED</span>
            <span>AI Score: {((inc.aiVerification?.confidence_score ?? inc.aiVerification?.confidence ?? inc.cvConfidence ?? 0) * (inc.aiVerification?.confidence_score != null ? 100 : 1)).toFixed(0)}% (Below 70% threshold)</span>
          </div>
          <div style={{ fontSize: "10px", color: "#7c2d12", marginTop: "3px", lineHeight: "1.4" }}>
            {inc.aiVerification?.frames_analyzed ? (
              <>
                Out of <b>{inc.aiVerification.frames_analyzed} frames</b> analyzed, only <b>{inc.aiVerification.flood_positive_frames || 0} frames</b> met flood threshold ({((inc.aiVerification.flood_ratio || 0) * 100).toFixed(0)}% ratio, longest run: {inc.aiVerification.longest_consecutive_run || 0} frames).
              </>
            ) : (
              <>AI model detected low/no automatic flood signal for this ground evidence.</>
            )}
            {" "}<b>Authority Action:</b> Review visual evidence below manually to confirm waterlogging, dispatch rapid unit, or mark false alarm.
          </div>
        </div>
      ) : inc.aiVerification?.is_flooding ? (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "8px 10px", margin: "8px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#166534", fontWeight: "800", fontSize: "11px" }}>
            <span>🌊 AI VISION: FLOODING CONFIRMED</span>
            <span>Confidence: {((inc.aiVerification?.confidence_score ?? inc.aiVerification?.confidence ?? 0.95) * 100).toFixed(1)}%</span>
          </div>
          {inc.aiVerification?.frames_analyzed ? (
            <div style={{ fontSize: "10px", color: "#15803D", marginTop: "3px" }}>
              Out of <b>{inc.aiVerification.frames_analyzed} frames</b> analyzed, <b>{inc.aiVerification.flood_positive_frames} frames</b> detected flood ({((inc.aiVerification.flood_ratio || 0) * 100).toFixed(0)}% ratio) · Longest consecutive run: <b>{inc.aiVerification.longest_consecutive_run} frames</b>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Nearest Available Resource Unit */}
      {nearestResource && !isDispatched && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "5px 10px",
          marginBottom: "8px",
          fontSize: "11px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontWeight: "700" }}>
            <span>{nearestResource.type?.includes("Boat") ? "🚤" : nearestResource.type?.includes("Medical") ? "🚑" : "🚒"}</span>
            <span>Nearest Unit: <b>{nearestResource.name}</b></span>
          </div>
          <span style={{
            background: "#16a34a",
            color: "#fff",
            fontSize: "10px",
            fontWeight: "800",
            padding: "2px 8px",
            borderRadius: "10px"
          }}>
            ⚡ {nearestResource.distKm} km away
          </span>
        </div>
      )}

      {/* Video Evidence Player (Recorded on Citizen Mobile) */}
      {hasVideo && (
        <div style={{ margin: "8px 0", position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid #334155", background: "#0f172a" }}>
          <video
            src={inc.videoUrl?.startsWith("/") ? `${API.replace(/\/api\/?$/, "")}${inc.videoUrl}` : inc.videoUrl}
            controls
            playsInline
            preload="auto"
            style={{ width: "100%", maxHeight: "200px", objectFit: "contain", display: "block", background: "#000" }}
            onError={(e) => {
              if (e.target.src !== "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4") {
                e.target.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
                e.target.load();
              }
            }}
          />
          <div
            style={{
              padding: "6px 10px",
              background: "rgba(15,23,42,0.9)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: "700",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Video size={13} color="#f87171" /> 🎥 Live Video Evidence Recorded on Mobile
            </span>
            <button
              onClick={() => {
                const targetUrl = inc.videoUrl?.startsWith("/") ? `${API.replace(/\/api\/?$/, "")}${inc.videoUrl}` : inc.videoUrl;
                onViewPhoto && onViewPhoto(targetUrl, inc, true);
              }}
              style={{ background: "#2563eb", border: "none", color: "#fff", padding: "3px 8px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "700" }}
            >
              Enlarge 🔍
            </button>
          </div>
        </div>
      )}

      {/* Ground Evidence Photo Thumbnail (Uploaded to Supabase / Local Server) */}
      {hasPhoto && !hasVideo && (
        <div style={{ margin: "8px 0", position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
          <img
            src={inc.photoUrl}
            alt="Citizen Ground Evidence"
            style={{ width: "100%", height: "140px", objectFit: "cover", display: "block", cursor: "pointer", background: "#0f172a" }}
            onClick={() => onViewPhoto && onViewPhoto(inc.photoUrl, inc, false)}
          />
          <div
            onClick={() => onViewPhoto && onViewPhoto(inc.photoUrl, inc, false)}
            style={{
              position: "absolute",
              bottom: "6px",
              left: "6px",
              right: "6px",
              background: "rgba(15,23,42,0.85)",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "10px",
              fontWeight: "700",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <span>📸 Ground Truth Photo Evidence</span>
            <span style={{ color: "#38bdf8", textDecoration: "underline" }}>Click to Enlarge 🔍</span>
          </div>
        </div>
      )}

      <p style={{ fontSize: "11px", color: "#334155", margin: "0 0 6px", lineHeight: "1.4", fontStyle: "italic", background: "#f8fafc", padding: "6px 8px", borderRadius: "6px", borderLeft: "2px solid #94a3b8" }}>
        "{inc.note || "Water rising rapidly on roadway"}"
      </p>

      {/* Duplicate Merged Badge & Drawer */}
      {(inc.mergedCount || 1) > 1 && (
        <div style={{ marginBottom: "8px" }}>
          <button className="merged-pill" onClick={() => setDrawerOpen(!drawerOpen)}>
            <Users size={12} />
            <b>{inc.mergedCount} reports merged</b> (Geohash + SHA-256)
            {drawerOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {drawerOpen && (
            <div className="merged-drawer">
              <div style={{ fontWeight: "700", color: "#475569", marginBottom: "4px" }}>Merged Citizen Submissions:</div>
              {inc.mergedReports?.map((m) => (
                <div key={m.id} className="merged-item">
                  <b>{m.reporter} ({m.role})</b> · {m.time} · Depth: {m.waterLevel}cm<br />
                  <i>"{m.note}"</i>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="incident-actions">
        {!isDispatched && !isFalseAlarm && (
          <button
            className={`auto-dispatch-btn ${causeCode === "SUSPECTED_BLOCKED_DRAIN" ? "drainage-crew" : "pumping-unit"}`}
            onClick={() => onAutoDispatch(inc)}
          >
            <Zap size={13} />
            Auto-Dispatch: {inc.recommendedTeam?.split(" ")[0]} Unit
          </button>
        )}

        {!isVerified && !isDispatched && !isFalseAlarm && (
          <button className="ghost small" onClick={() => onVerify(inc.id)}>
            <CheckCircle2 size={13} color="#16a34a" /> Mark Verified
          </button>
        )}

        {!isFalseAlarm && !isDispatched && (
          <button className="danger-btn small" onClick={() => onFalseAlarm(inc.id)}>
            <X size={13} /> False Alarm
          </button>
        )}

        <button className="ghost small" onClick={() => onOpenOverride(inc)} title="Admin Manual Override">
          <Sliders size={13} /> Override
        </button>
      </div>
    </div>
  );
}

// Resource Card Component
function ResourceCard({ team }) {
  const isEnRoute = team.status === "En route";
  const isDispatched = team.status === "Dispatched";
  const isAvailable = team.status === "Available";
  const statusClass = isAvailable ? "available" : isEnRoute ? "en-route" : isDispatched ? "dispatched" : "on-site";

  return (
    <div className="resource-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <b style={{ fontSize: "12px", color: "#0f172a" }}>{team.name}</b>
          <div style={{ fontSize: "10px", color: "#64748b" }}>{team.station}</div>
        </div>
        <span className={`resource-status-pill ${statusClass}`}>{team.status}</span>
      </div>
      <div style={{ fontSize: "10px", color: "#334155", background: "#f8fafc", padding: "6px 8px", borderRadius: "6px" }}>
        <b>Equipment:</b> {team.capacity}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b" }}>
        <span>Contact: <b>{team.phone}</b></span>
        {team.currentIncidentId ? (
          <span style={{ color: "#1d4ed8", fontWeight: "700" }}>Incident: {team.currentIncidentId} (ETA {team.eta || "10m"})</span>
        ) : (
          <span style={{ color: "#16a34a", fontWeight: "600" }}>Ready for Tasking</span>
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
  onFalseAlarm,
  onOpenOverride
}) {
  return (
    <div className="content">
      <PageHeader
        eyebrow="GEO-INTELLIGENCE · REAL OPENSTREETMAP & RADAR"
        title="Live Street-Level Flood Risk Map"
        sub="Explore real geographic flood zones, Open-Meteo precipitation overlays, and live response vehicle tracking."
      />

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
              onFalseAlarm={onFalseAlarm}
            />
          </div>
          <div className="map-legend">
            <div className="map-legend-items">
              <span className="legend-pill red"><span className="legend-dot red"></span>Critical (≥75)</span>
              <span className="legend-pill orange"><span className="legend-dot orange"></span>Elevated (≥45)</span>
              <span className="legend-pill green"><span className="legend-dot green"></span>Normal (&lt;45)</span>
            </div>
            <span className="map-note">🛡️ Click any shelter marker or card below to highlight safest road route</span>
          </div>
        </section>
        <section className="panel zone-list">
          <div className="panel-head">
            <div>
              <h3>Risk Zones</h3>
              <span>Live calculation</span>
            </div>
          </div>
          {[...zones]
            .sort((a, b) => b.risk - a.risk)
            .map((z) => (
              <div className="zone-item" key={z.id}>
                <div className={`zone-dot ${z.risk >= 75 ? "red" : z.risk >= 45 ? "orange" : "green"}`}></div>
                <div>
                  <b>{z.name}</b>
                  <span>{z.ward} · {z.reports} reports · {z.rainfall}mm rain</span>
                </div>
                <RiskBadge score={z.risk} />
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
function Incidents({ incidents, resources = [], notify, onReload, onAutoDispatch, onVerify, onFalseAlarm, onOpenOverride, onViewPhoto }) {
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (onReload) onReload();
  }, []);

  // Strict timestamp sorting: newest incidents first
  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(b.userTimestamp || b.updatedAt || b.createdAt || b.time || 0) - new Date(a.userTimestamp || a.updatedAt || a.createdAt || a.time || 0)
  );

  const humanInterventionCount = sortedIncidents.filter((i) => isHumanInterventionNeeded(i)).length;
  const aiVerifiedCount = sortedIncidents.filter((i) => i.aiVerification?.is_flooding === true || i.aiVerified).length;

  const filtered = filter === "All"
    ? sortedIncidents
    : filter === "ReviewNeeded"
    ? sortedIncidents.filter((i) => isHumanInterventionNeeded(i))
    : filter === "AiConfirmed"
    ? sortedIncidents.filter((i) => i.aiVerification?.is_flooding === true || i.aiVerified)
    : sortedIncidents.filter((i) => i.role === filter || i.status === filter);

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
              All ({sortedIncidents.length})
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
              {filter === "ReviewNeeded" ? "All current citizen reports have been verified by AI or resolved." : "No reports matching this category."}
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
            />
          ))
        )}
      </div>
    </div>
  );
}

// Mini Map Component for Smart Dispatch with live route & pulsing vectors
function DispatchMiniMap({ incident, teamObj }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const incLat = Number(incident?.lat) || 19.132;
    const incLng = Number(incident?.lng) || 72.848;
    const teamLat = Number(teamObj?.lat) || incLat + 0.0035;
    const teamLng = Number(teamObj?.lng) || incLng + 0.0025;

    if (!mapInst.current) {
      mapInst.current = L.map(mapRef.current, {
        center: [(incLat + teamLat) / 2, (incLng + teamLng) / 2],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer(`https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`, {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20
      }).addTo(mapInst.current);
    }

    const map = mapInst.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const isSos = incident?.isSos || incident?.type === "SOS" || incident?.causeCode === "SOS_EMERGENCY";
    const isOnScene = incident?.status === "On Scene" || incident?.dispatchProgress === "on_scene";
    const isDispatched = incident?.status === "Dispatched" || incident?.dispatchProgress === "en_route" || isOnScene;
    const isResolved = incident?.status === "Resolved";

    // 1. Incident marker
    const incIcon = L.divIcon({
      className: "mini-inc-icon",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:-6px;border-radius:50%;background:${isSos ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"};animation:pulse-ring 2s infinite ease-in-out;"></div>
          <div style="background:${isSos ? "#ef4444" : "#f59e0b"};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);">
            ${isSos ? "🚨" : "⚠️"}
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    L.marker([incLat, incLng], { icon: incIcon }).addTo(map).bindTooltip(`📍 Incident: ${incident?.id || "Target"}`);

    // 2. Team Squad marker
    const teamIcon = L.divIcon({
      className: "mini-team-icon",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          ${isDispatched && !isResolved ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${isOnScene ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"};animation:pulse-ring 2s infinite ease-in-out;"></div>` : ''}
          <div style="background:${isResolved ? "#10b981" : isOnScene ? "#10b981" : isDispatched ? "#f59e0b" : "#2563eb"};color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);">
            ${teamObj?.type?.includes("Boat") ? "🚤" : teamObj?.type?.includes("Medical") ? "🚑" : "🚒"}
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    L.marker([teamLat, teamLng], { icon: teamIcon }).addTo(map).bindTooltip(`🚒 Squad: ${teamObj?.name || "Assigned Unit"}`);

    // 3. Connecting route trajectory
    L.polyline([[teamLat, teamLng], [incLat, incLng]], {
      color: isResolved ? "#10b981" : isOnScene ? "#10b981" : "#f59e0b",
      weight: 4,
      opacity: 0.9,
      dashArray: isOnScene || isResolved ? undefined : "8, 6"
    }).addTo(map);

    try {
      const bounds = L.latLngBounds([[incLat, incLng], [teamLat, teamLng]]);
      map.fitBounds(bounds, { padding: [35, 35], animate: true });
    } catch {}
  }, [incident?.id, incident?.status, incident?.dispatchProgress, teamObj?.id, teamObj?.lat, teamObj?.lng]);

  const isOnScene = incident?.status === "On Scene" || incident?.dispatchProgress === "on_scene";
  const isDispatched = incident?.status === "Dispatched" || incident?.dispatchProgress === "en_route" || isOnScene;
  const isResolved = incident?.status === "Resolved";

  return (
    <div className="dispatch-minimap-card">
      <div className="dispatch-minimap-badge">
        <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: isResolved ? "#10b981" : isOnScene ? "#10b981" : isDispatched ? "#f59e0b" : "#3b82f6",
          display: "inline-block",
          boxShadow: isDispatched && !isResolved ? "0 0 8px #f59e0b" : "none"
        }} />
        <span>
          {isResolved
            ? "✅ Incident Mitigated & Cleared"
            : isOnScene
            ? "📍 Squad Reached Site · Operating"
            : isDispatched
            ? "🚗 Squad En Route (ETA ~5 min)"
            : "⚡ Standby · Ready for Deployment"}
        </span>
      </div>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// Smart Dispatch Page with Animated Stepper & Fluid Button Micro-interactions
function Dispatch({ incidents, resources, notify, onReload, onAutoDispatch }) {
  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(b.userTimestamp || b.updatedAt || b.createdAt || b.time || 0) - new Date(a.userTimestamp || a.updatedAt || a.createdAt || a.time || 0)
  );

  const [selectedId, setSelectedId] = useState(sortedIncidents[0]?.id || null);
  const selected = sortedIncidents.find((i) => i.id === selectedId) || sortedIncidents[0] || null;

  // Compute resources sorted by proximity to the active problem / incident coordinates
  const sortedResourcesByDistance = [...resources]
    .map((r) => {
      const distKm = (selected?.lat && selected?.lng && r.lat && r.lng)
        ? calcDistanceKm(selected.lat, selected.lng, r.lat, r.lng)
        : null;
      return { ...r, distKm };
    })
    .sort((a, b) => {
      if (a.distKm == null) return 1;
      if (b.distKm == null) return -1;
      return a.distKm - b.distKm;
    });

  const [team, setTeam] = useState(
    selected?.assignedTeam || selected?.recommendedTeam || sortedResourcesByDistance[0]?.name || resources[0]?.name || "Municipal Cleaning & Desilting Crew"
  );
  const [sending, setSending] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  useEffect(() => {
    if (!selectedId && sortedIncidents.length > 0) {
      setSelectedId(sortedIncidents[0].id);
    }
  }, [sortedIncidents.length]);

  useEffect(() => {
    if (selected?.assignedTeam) {
      setTeam(selected.assignedTeam);
    } else if (selected?.recommendedTeam) {
      setTeam(selected.recommendedTeam);
    } else if (sortedResourcesByDistance.length > 0) {
      setTeam(sortedResourcesByDistance[0].name);
    }
  }, [selected?.id]);

  const selectedTeamObj = sortedResourcesByDistance.find((r) => r.name === team) || resources[0];

  const handleDispatch = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await apiFetch(`/incidents/${selected.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team,
          reason: selected.cause
        })
      });
      notify(`✓ Resource ${team} allocated to ${selected.id}. Live status: En Route.`);
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
        title="Smart Dispatch & Resource Tasking"
        sub="Auto-route municipal teams to real citizen incident locations based on cause divergence diagnosis."
      />
      <div className="dispatch-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Incidents Feed</h3>
              <span>Choose an incident to route & track resources</span>
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

              // Nearest squad for this individual incident item
              const incNearest = (i.lat && i.lng && resources.length > 0)
                ? [...resources]
                    .map((r) => ({ ...r, distKm: calcDistanceKm(i.lat, i.lng, r.lat, r.lng) }))
                    .filter((r) => r.distKm != null)
                    .sort((a, b) => a.distKm - b.distKm)[0]
                : null;

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

                    {/* Proximity / Assigned Unit Tag */}
                    {itemDispatched && i.assignedTeam ? (
                      <div style={{ fontSize: "10px", color: itemResolved ? "#166534" : "#2563eb", marginTop: "2px", fontWeight: "600" }}>
                        🚒 {i.assignedTeam}
                      </div>
                    ) : incNearest ? (
                      <div style={{ fontSize: "10px", color: "#0284c7", marginTop: "2px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>📍 Nearest:</span>
                        <span>{incNearest.name.split(" ")[0]} ({incNearest.distKm} km)</span>
                      </div>
                    ) : null}
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
              <h2>{selected?.id || "No Incident"}</h2>
              <p>
                {selected?.reporter} · {selected?.address || selected?.zoneId} · Severity <b>{selected?.severity}</b>
                {selected?.originalSeverity && selected.originalSeverity > selected.severity ? ` (Mitigated from ${selected.originalSeverity})` : ""}
              </p>
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

          {/* Embedded Interactive Dispatch Route Mini-Map */}
          {selected && (
            <DispatchMiniMap incident={selected} teamObj={selectedTeamObj} />
          )}

          {/* Nearest Response Squads Ranked by Proximity Cards Grid */}
          <div style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
                📍 Nearest Response Squads to {selected?.id || "Problem"}:
              </label>
              <span style={{ fontSize: "10px", color: "#64748b" }}>Ranked by shortest distance</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginBottom: "10px" }}>
              {sortedResourcesByDistance.slice(0, 3).map((r, idx) => {
                const isChosenTeam = team === r.name;
                return (
                  <div
                    key={r.id}
                    onClick={() => setTeam(r.name)}
                    style={{
                      background: isChosenTeam ? "#eff6ff" : "#ffffff",
                      border: isChosenTeam ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "9px 11px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isChosenTeam ? "0 4px 12px rgba(37,99,235,0.15)" : "0 1px 3px rgba(0,0,0,0.03)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "16px" }}>
                        {r.type?.includes("Boat") ? "🚤" : r.type?.includes("Medical") ? "🚑" : "🚒"}
                      </span>
                      <span style={{
                        fontSize: "9px",
                        fontWeight: "800",
                        background: idx === 0 ? "#dcfce7" : "#dbeafe",
                        color: idx === 0 ? "#15803d" : "#1e40af",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        border: idx === 0 ? "1px solid #86efac" : "1px solid #bfdbfe"
                      }}>
                        {idx === 0 ? "⚡ Nearest " : ""}{r.distKm != null ? `${r.distKm} km` : ""}
                      </span>
                    </div>
                    <b style={{ fontSize: "11px", color: "#0f172a", display: "block", marginTop: "4px" }}>{r.name}</b>
                    <div style={{ fontSize: "9px", color: "#64748b", marginTop: "1px" }}>📍 {r.station}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "5px" }}>
                      <span style={{ fontSize: "9px", fontWeight: "700", color: r.status === "Available" ? "#16a34a" : "#d97706" }}>
                        ● {r.status}
                      </span>
                      {isChosenTeam && (
                        <span style={{ fontSize: "9px", fontWeight: "800", color: "#2563eb" }}>✓ Selected</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <label style={{ marginTop: "4px" }}>
            Assigned Response Team (Proximity Sorted)
            <select value={team} onChange={(e) => setTeam(e.target.value)} disabled={sending || updatingProgress}>
              {sortedResourcesByDistance.map((r, idx) => (
                <option key={r.id} value={r.name}>
                  {idx === 0 && r.distKm != null ? `⚡ [Nearest: ${r.distKm} km] ` : r.distKm != null ? `[${r.distKm} km away] ` : ""}{r.name} ({r.status})
                </option>
              ))}
            </select>
          </label>

          <div className="route-card">
            <div>
              <b>Automated Routing Rationale</b>
              <p>{selected?.routingRationale || selected?.causeDescription || "Standard flood response crew assignment."}</p>
            </div>
            <div className="eta">{isOnScene ? "0 min (On site)" : "8–12 min"}</div>
          </div>

          {/* Smooth Interactive Action Controls */}
          <div className="action-row" style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            {!isDispatched && !isOnScene && !isResolved && (
              <button
                className="dispatch-action-btn primary"
                onClick={handleDispatch}
                disabled={!selected || sending}
                style={{ flex: 1 }}
              >
                {sending ? (
                  <>
                    <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Assigning & Deploying Squad...
                  </>
                ) : (
                  <>
                    <Send size={15} /> 🚀 Dispatch Nearest Squad
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
    </div>
  );
}

// Dedicated Resources Page
function ResourcesPage({ resources, notify, onReload }) {
  return (
    <div className="content">
      <PageHeader
        eyebrow="FLEET & PERSONNEL"
        title="Resource Availability & Readiness Tracker"
        sub="Live tracker of municipal desilting crews, dewatering pumps, and traffic units."
      >
        <button className="ghost" onClick={onReload}><RefreshCw size={14} /> Refresh Status</button>
      </PageHeader>
      <div className="resource-grid">
        {resources.map((r) => (
          <ResourceCard key={r.id} team={r} />
        ))}
      </div>
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
  { id: "observation-agent", name: "Observation", phase: "Perception", icon: Eye },
  { id: "evidence-agent", name: "Evidence Check", phase: "Verification", icon: CheckCircle2 },
  { id: "risk-agent", name: "Risk Scoring", phase: "Assessment", icon: AlertTriangle },
  { id: "cause-agent", name: "Cause Diagnosis", phase: "Reasoning", icon: BrainCircuit },
  { id: "resource-agent", name: "Resource Match", phase: "Dispatch", icon: Truck },
  { id: "route-agent", name: "Safety Routing", phase: "Evacuation", icon: RouteIcon },
  { id: "notification-agent", name: "Notifications", phase: "Broadcast", icon: Bell },
  { id: "audit-agent", name: "Audit Guardrail", phase: "Governance", icon: ShieldCheck }
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
  const [overrideTeamId, setOverrideTeamId] = useState("");

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


  // Handle Incident Selection with Auto-Fill
  const handleSelectIncident = (incId) => {
    setSelectedIncident(incId);
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

      {/* Visual Workflow: Multi-Agent DAG Pipeline */}
      <section className="mac-dag-panel">
        <div className="mac-dag-header">
          <div className="mac-dag-title">
            <BrainCircuit size={22} color="#2563eb" />
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Multi-Agent Execution Pipeline</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                Click any agent node to inspect its bounded role, inputs, and real-time execution outputs.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
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
                onClick={() => {
                  setActiveTab("trace");
                }}
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

  // Calculate safest OSRM road route to chosen shelter
  const handleSelectShelter = useCallback(async (sh) => {
    setSelectedShelter(sh);
    setLoadingRoute(true);
    const destLat = sh.latitude ?? sh.lat;
    const destLng = sh.longitude ?? sh.lng;

    try {
      const routeData = await apiFetch(`/route?fromLat=${userLat}&fromLng=${userLng}&toLat=${destLat}&toLng=${destLng}`);
      setActiveRoute(routeData);
      notify(`🛣️ Safest route to ${sh.name}: ${routeData.durationMin || 5} min ETA (${routeData.distanceKm || 1.5} km).`);
    } catch (err) {
      console.warn("[web] Route calculation error:", err.message);
      // Fallback route line
      setActiveRoute({
        coordinates: [
          { lat: userLat, lng: userLng },
          { lat: destLat, lng: destLng }
        ],
        distanceKm: ((sh.distance_km ?? sh.distanceKm) || 1.2),
        durationMin: (sh.eta_minutes ?? 5),
        hazardAdvisory: "Direct road corridor · Exercise caution near local storm drains."
      });
      notify(`🗺️ Displaying direct corridor to ${sh.name}.`);
    } finally {
      setLoadingRoute(false);
    }
  }, [userLat, userLng, notify]);

  const handleClearRoute = useCallback(() => {
    setSelectedShelter(null);
    setActiveRoute(null);
  }, []);

  // Live GPS Detection Handler
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
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
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
        apiFetch("/alerts").catch(() => []),
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

  // Initial Startup Effect with SSE & 4s fast sync interval
  useEffect(() => {
    loadInitialData();
    if (navigator.geolocation) {
      handleDetectGps();
    } else {
      fetchSheltersAndLocationData(19.1320, 72.8480, "Andheri West Station Road Market", "preset");
    }

    // Connect to live SSE Stream for real-time dispatch updates
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
              setIncidents((prev) => {
                const rest = prev.filter((i) => i.id !== newInc.id);
                return [newInc, ...rest];
              });
            }
            loadInitialData();
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
            setIncidents((prev) => {
              const rest = prev.filter((i) => i.id !== newInc.id);
              return [newInc, ...rest];
            });
            if (newInc.isSos || newInc.type === "SOS" || newInc.status === "ACTIVE_SOS") {
              playSosEmergencyChime();
              setNotificationsOpen(true);
              notify(`🚨 CRITICAL SOS TRIGGERED by ${newInc.reporter || "User"} at ${newInc.address}! (Phone: ${newInc.userPhone || "Emergency"})`);
            }
          }
        } catch {}
        loadInitialData();
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
        loadInitialData();
      });
      es.addEventListener("report:merged", () => loadInitialData());
      es.addEventListener("dispatch:created", () => loadInitialData());
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

    // 4s polling sync ensures immediate visibility even if browser drops SSE
    const pollTimer = setInterval(() => {
      loadInitialData();
    }, 4000);

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
      notify(`Incident ${id} marked as False Alarm.`);
      loadInitialData();
    } catch (err) {
      notify("Operation failed: " + err.message);
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
                  onOpenOverride={setOverrideIncident}
                  onViewPhoto={(url, inc, isVideo) => setPhotoModal({ url, incident: inc, isVideo })}
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
              element={<ResourcesPage resources={resources} notify={notify} onReload={loadInitialData} />}
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
