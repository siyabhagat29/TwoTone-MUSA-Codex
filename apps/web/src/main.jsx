import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, BarChart3, Bell, BrainCircuit, ChevronRight, CloudRain,
  Database, FileText, Gauge, Home, Layers3, Map, Menu, Radio, Route as RouteIcon,
  Settings, ShieldCheck, Siren, Users, Wrench, X, Zap, Send, RefreshCw, CheckCircle2, Droplets
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Leaflet Map Component with real OpenStreetMap tiles
function LeafletMap({ zones = [], incidents = [], height = "360px", center = [19.128, 72.848], zoom = 14 }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: true
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      markersLayer.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
    }

    const map = mapInstance.current;
    const layer = markersLayer.current;
    layer.clearLayers();

    // Add Zone markers
    zones.forEach((z) => {
      if (!z.lat || !z.lng) return;
      const level = z.risk >= 75 ? "red" : z.risk >= 45 ? "orange" : "green";
      const icon = L.divIcon({
        className: "custom-zone-marker-container",
        html: `<div class="custom-zone-marker ${level}" style="width:36px;height:36px;">${z.risk}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([z.lat, z.lng], { icon });
      marker.bindPopup(`
        <div>
          <span class="map-badge ${level}">${level.toUpperCase()} RISK · ${z.risk}/100</span>
          <b>${z.name}</b>
          <div style="font-size:10px;color:#64748b;margin-bottom:6px;">${z.ward}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;background:#f8fafc;padding:6px;border-radius:6px;">
            <div>Rain: <b>${z.rainfall ?? 0} mm</b></div>
            <div>Water: <b>${z.waterLevel ?? 0} cm</b></div>
            <div>Reports: <b>${z.reports ?? 0}</b></div>
            <div>Cause: <b>${z.cause ?? "Normal"}</b></div>
          </div>
        </div>
      `);
      marker.addTo(layer);
    });

    // Add Incident markers
    incidents.forEach((inc) => {
      if (!inc.lat || !inc.lng) return;
      const icon = L.divIcon({
        className: "custom-incident-marker-container",
        html: `<div class="custom-incident-marker" title="${inc.id}">💧</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([inc.lat, inc.lng], { icon });
      marker.bindPopup(`
        <div>
          <span class="map-badge orange">${inc.id} · ${inc.status}</span>
          <b>${inc.reporter} (${inc.role})</b>
          <div style="font-size:10px;color:#64748b;">${inc.address || "Street location"}</div>
          <p style="font-size:10px;margin:4px 0 6px;">"${inc.note || "Water rising"}"</p>
          <div style="font-size:10px;background:#eef2ff;padding:4px 6px;border-radius:6px;">
            Water depth: <b>${inc.waterLevel} cm</b> · Severity: <b>${inc.severity}</b>
          </div>
        </div>
      `);
      marker.addTo(layer);
    });

    // Adjust bounds if zones exist
    if (zones.length > 0) {
      const validCoords = zones.filter((z) => z.lat && z.lng).map((z) => [z.lat, z.lng]);
      if (validCoords.length > 0) {
        map.setView(validCoords[0], zoom);
      }
    }
  }, [zones, incidents, zoom]);

  return <div ref={mapRef} style={{ width: "100%", height, borderRadius: "14px", overflow: "hidden" }} />;
}

async function apiFetch(path, options = {}) {
  const r = await fetch(`${API}${path}`, options);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

function App() {
  const [sidebar, setSidebar] = useState(true);
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState("");
  const [syncing, setSyncing] = useState(false);

  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  };

  const loadData = async () => {
    try {
      const [z, i, a] = await Promise.all([
        apiFetch("/zones"),
        apiFetch("/incidents"),
        apiFetch("/alerts")
      ]);
      setZones(z);
      setIncidents(i);
      setAlerts(a);
    } catch (err) {
      console.warn("Failed to load live data:", err.message);
    }
  };

  const syncWeather = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch("/weather/sync", { method: "POST" });
      if (res.success) {
        setZones(res.zones);
        setAlerts(res.alerts);
        notify("Synced live weather from Open-Meteo across all ward zones.");
      }
    } catch (err) {
      notify("Weather sync failed: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-poll real data every 15 seconds
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar open={sidebar} />
      <main className={`main ${sidebar ? "" : "wide"}`}>
        <Topbar
          onMenu={() => setSidebar(!sidebar)}
          alertCount={alerts.length}
          onRefresh={() => {
            loadData();
            notify("Data refreshed from live server.");
          }}
        />
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                zones={zones}
                incidents={incidents}
                alerts={alerts}
                notify={notify}
                syncWeather={syncWeather}
                syncing={syncing}
              />
            }
          />
          <Route path="/map" element={<RiskMap zones={zones} incidents={incidents} notify={notify} />} />
          <Route path="/alerts" element={<Alerts alerts={alerts} notify={notify} />} />
          <Route
            path="/incidents"
            element={<Incidents incidents={incidents} notify={notify} onReload={loadData} />}
          />
          <Route
            path="/dispatch"
            element={<Dispatch incidents={incidents} notify={notify} onReload={loadData} />}
          />
          <Route path="/drainage" element={<Drainage zones={zones} incidents={incidents} notify={notify} />} />
          <Route path="/analytics" element={<Analytics zones={zones} incidents={incidents} />} />
          <Route path="/users" element={<UsersPage notify={notify} />} />
          <Route path="/sources" element={<Sources notify={notify} />} />
          <Route path="/settings" element={<SettingsPage notify={notify} />} />
          <Route
            path="*"
            element={
              <Dashboard
                zones={zones}
                incidents={incidents}
                alerts={alerts}
                notify={notify}
                syncWeather={syncWeather}
                syncing={syncing}
              />
            }
          />
        </Routes>
      </main>
      {toast && (
        <div className="toast">
          <ShieldCheck size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

const nav = [
  ["Overview", "/", Home],
  ["Live Risk Map", "/map", Map],
  ["Alerts", "/alerts", Bell],
  ["Incidents", "/incidents", Siren],
  ["Dispatch", "/dispatch", Send],
  ["Drainage", "/drainage", Wrench],
  ["Analytics", "/analytics", BarChart3],
  ["Users & Roles", "/users", Users],
  ["Data Sources", "/sources", Database]
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
            <small>Authority Console · Live Data</small>
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
              <span>Online · Real Data</span>
            </div>
            <span className="dot"></span>
          </div>
        )}
      </div>
    </aside>
  );
}

function Topbar({ onMenu, alertCount, onRefresh }) {
  const loc = useLocation();
  const title = loc.pathname === "/" ? "Ward Operations" : nav.find((x) => x[1] === loc.pathname)?.[0] || "Operations";
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
          <i></i> Live Open-Meteo & Ground Truth
        </div>
        <button className="icon-btn" title="Refresh Live Data" onClick={onRefresh}>
          <RefreshCw size={18} />
        </button>
        <button className="icon-btn badge-btn">
          <Bell size={19} />
          <em>{alertCount}</em>
        </button>
        <div className="top-avatar">WA</div>
      </div>
    </header>
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

function Dashboard({ zones, incidents, alerts, notify, syncWeather, syncing }) {
  const critical = zones.filter((z) => z.risk >= 75).length;
  const elevated = zones.filter((z) => z.risk >= 45 && z.risk < 75).length;
  const totalRain = zones.reduce((sum, z) => sum + (z.rainfall || 0), 0);
  const avgRain = zones.length > 0 ? (totalRain / zones.length).toFixed(1) : 0;

  return (
    <div className="content">
      <PageHeader
        eyebrow="LIVE WARD MONITORING · REAL METEOROLOGICAL DATA"
        title="Flood intelligence at street level"
        sub="Connected to live Open-Meteo rainfall feeds, OpenStreetMap GIS, and real-time citizen reports."
      >
        <button className="primary" onClick={syncWeather} disabled={syncing}>
          <RefreshCw size={16} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
          {syncing ? "Syncing Open-Meteo..." : "Sync Live Weather"}
        </button>
      </PageHeader>
      <div className="stats-grid">
        <StatCard label="Critical zones" value={critical} delta={`${elevated} elevated`} icon={AlertTriangle} tone="red" />
        <StatCard label="Active reports" value={incidents.length} delta="Real citizen evidence" icon={Siren} tone="orange" />
        <StatCard label="Live rainfall" value={`${avgRain} mm`} delta="Direct Open-Meteo API" icon={CloudRain} tone="blue" />
        <StatCard
          label="Active alerts"
          value={alerts.length}
          delta="Triggered by risk engine"
          icon={Bell}
          tone="green"
        />
      </div>
      <div className="grid-2">
        <section className="panel map-panel">
          <div className="panel-head">
            <div>
              <h3>Live OpenStreetMap risk map</h3>
              <span>Ward 72 · Real geographic coordinates</span>
            </div>
            <button className="ghost" onClick={() => notify("Map is displaying real OpenStreetMap tiles.")}>
              Layers <Layers3 size={15} />
            </button>
          </div>
          <div style={{ padding: "12px" }}>
            <LeafletMap zones={zones} incidents={incidents} height="320px" />
          </div>
          <div className="map-legend">
            <span>
              <i className="legend red"></i>Critical (≥75)
            </span>
            <span>
              <i className="legend orange"></i>Elevated (≥45)
            </span>
            <span>
              <i className="legend green"></i>Normal (&lt;45)
            </span>
            <span className="map-note">Click pins to inspect live rainfall & citizen evidence</span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Live active alerts</h3>
              <span>Threshold-triggered signal stream</span>
            </div>
            <NavLink to="/alerts" className="link">
              View all <ChevronRight size={14} />
            </NavLink>
          </div>
          <div className="alert-list">
            {alerts.length === 0 ? (
              <div style={{ padding: "28px", textAlign: "center", color: "#8a9ba8", fontSize: "12px" }}>
                No critical alerts currently active. All monitored ward zones are operating within safe flood thresholds.
              </div>
            ) : (
              alerts.map((a) => <AlertRow key={a.id} a={a} />)
            )}
          </div>
        </section>
      </div>
      <div className="grid-2 lower">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Citizen incident queue</h3>
              <span>Ground truth reported from mobile app</span>
            </div>
            <NavLink to="/incidents" className="link">
              Open queue <ChevronRight size={14} />
            </NavLink>
          </div>
          <IncidentTable incidents={incidents.slice(0, 5)} />
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Monitored Ward Zones</h3>
              <span>Live rainfall & ground water level</span>
            </div>
            <BrainCircuit size={19} />
          </div>
          <div style={{ padding: "14px 18px" }}>
            {zones.map((z) => (
              <div
                key={z.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #edf2f7"
                }}
              >
                <div>
                  <b style={{ fontSize: "12px", color: "#1e293b" }}>{z.name}</b>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    Rain: {z.rainfall ?? 0} mm · Water: {z.waterLevel ?? 0} cm · Reports: {z.reports ?? 0}
                  </div>
                </div>
                <RiskBadge score={z.risk} />
              </div>
            ))}
          </div>
          <div className="insight">
            <BrainCircuit size={18} />
            <div>
              <b>Real Data Engine</b>
              <p>Risk scores update automatically whenever new mobile citizen reports or Open-Meteo rainfall syncs arrive.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AlertRow({ a }) {
  return (
    <div className="alert-row">
      <div className={`alert-signal ${a.level.toLowerCase()}`}>
        <AlertTriangle size={16} />
      </div>
      <div className="alert-copy">
        <b>{a.title}</b>
        <span>{a.message}</span>
        <small>
          {a.zoneName || a.zoneId} · ETA {a.eta}
        </small>
      </div>
      <span className={`level ${a.level.toLowerCase()}`}>{a.level}</span>
    </div>
  );
}

function IncidentTable({ incidents }) {
  if (incidents.length === 0) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "#8a9ba8", fontSize: "12px" }}>
        No citizen reports submitted yet. Reports sent from the mobile app will show here instantly.
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Incident</th>
            <th>Reporter</th>
            <th>Severity</th>
            <th>Cause</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((x) => (
            <tr key={x.id}>
              <td>
                <b>{x.id}</b>
                <small>
                  {x.time} · {x.address || x.zoneId}
                </small>
              </td>
              <td>
                {x.reporter}
                <small>{x.role}</small>
              </td>
              <td>
                <span className="severity">
                  <i style={{ width: `${x.severity}%` }}></i>
                  {x.severity}
                </span>
              </td>
              <td>{x.cause}</td>
              <td>
                <span className="status">{x.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskMap({ zones, incidents, notify }) {
  return (
    <div className="content">
      <PageHeader
        eyebrow="GEO-INTELLIGENCE · OPENSTREETMAP"
        title="Live street-level risk map"
        sub="Explore real geographic flood zones, Open-Meteo precipitation, and GPS citizen report clusters."
      >
        <button className="ghost" onClick={() => notify("Map tiles reloaded from OpenStreetMap.")}>
          <Layers3 size={16} /> Refresh layers
        </button>
      </PageHeader>
      <div className="map-layout">
        <section className="panel full-map">
          <div style={{ height: "620px", position: "relative" }}>
            <LeafletMap zones={zones} incidents={incidents} height="620px" zoom={14} />
          </div>
        </section>
        <section className="panel zone-list">
          <div className="panel-head">
            <div>
              <h3>Risk zones</h3>
              <span>Sorted by current score</span>
            </div>
          </div>
          {[...zones]
            .sort((a, b) => b.risk - a.risk)
            .map((z) => (
              <div className="zone-item" key={z.id}>
                <div className={`zone-dot ${z.risk >= 75 ? "red" : z.risk >= 45 ? "orange" : "green"}`}></div>
                <div>
                  <b>{z.name}</b>
                  <span>
                    {z.ward} · {z.reports} reports · {z.rainfall}mm rain
                  </span>
                </div>
                <RiskBadge score={z.risk} />
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}

function Alerts({ alerts, notify }) {
  return (
    <div className="content">
      <PageHeader
        eyebrow="ALERT MANAGEMENT"
        title="Live alerts & notifications"
        sub="Real-time warnings generated automatically when risk thresholds (Score ≥ 45) are crossed."
      />
      <div className="alert-grid">
        {alerts.length === 0 ? (
          <div style={{ gridColumn: "1/-1", padding: "40px", textAlign: "center", color: "#8a9ba8", background: "#fff", borderRadius: "14px" }}>
            No active flood alerts. When rainfall increases or citizens submit flood reports, alerts trigger here automatically.
          </div>
        ) : (
          alerts.map((a) => (
            <div className="panel alert-card" key={a.id}>
              <div className="alert-card-top">
                <span className={`level ${a.level.toLowerCase()}`}>{a.level}</span>
                <span>{a.id}</span>
              </div>
              <h3>{a.title}</h3>
              <p>{a.message}</p>
              <div className="alert-meta">
                <span>
                  <Map size={14} />
                  {a.zoneName || a.zoneId}
                </span>
                <span>
                  <Gauge size={14} />
                  ETA {a.eta}
                </span>
              </div>
              <div className="channel-row">
                {a.channels.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <button className="ghost full" onClick={() => notify(`${a.id} acknowledged by ward admin.`)}>
                Acknowledge
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Incidents({ incidents, notify, onReload }) {
  const [filter, setFilter] = useState("All");
  const shown = filter === "All" ? incidents : incidents.filter((i) => i.role === filter);

  const verify = async (id) => {
    try {
      await apiFetch(`/incidents/${id}/verify`, { method: "POST" });
      notify(`Incident ${id} verified and updated in database.`);
      onReload();
    } catch (err) {
      notify("Verification failed: " + err.message);
    }
  };

  return (
    <div className="content">
      <PageHeader
        eyebrow="GROUND TRUTH · PERSISTENT DATABASE"
        title="Citizen incident reports"
        sub="Verified evidence submitted from mobile devices including GPS coordinates, water level, and photos."
      >
        <div className="segmented">
          {["All", "Resident", "Vendor"].map((x) => (
            <button className={filter === x ? "selected" : ""} onClick={() => setFilter(x)} key={x}>
              {x}
            </button>
          ))}
        </div>
      </PageHeader>
      <section className="panel">
        <IncidentTable incidents={shown} />
        {shown.length > 0 && (
          <div className="review-grid">
            {shown.slice(0, 3).map((i) => (
              <div className="review-card" key={i.id}>
                <div className="photo-placeholder">
                  <CloudRain size={30} />
                  <span>{i.photo ? "Photo Attached" : "No Photo"}</span>
                </div>
                <div className="review-info">
                  <b>
                    {i.id} · {i.reporter}
                  </b>
                  <p>{i.note || `${i.cause} suspected · water ${i.waterLevel} cm`}</p>
                  <div className="evidence">
                    <span>{i.gps ? "✓ GPS Verified" : "Manual Area"}</span>
                    <span>✓ Timestamp: {i.time}</span>
                    <span>Status: {i.status}</span>
                  </div>
                  {i.status !== "Verified" && i.status !== "Dispatched" && (
                    <button className="primary small" onClick={() => verify(i.id)}>
                      Verify report
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Dispatch({ incidents, notify, onReload }) {
  const [selected, setSelected] = useState(incidents[0] || null);
  const [team, setTeam] = useState("Municipal Drainage Crew");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!selected && incidents.length > 0) {
      setSelected(incidents[0]);
    }
  }, [incidents, selected]);

  const send = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await apiFetch("/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: selected.id,
          team,
          reason: selected.cause
        })
      });
      notify(`Dispatch assigned for ${selected.id} → ${team}.`);
      onReload();
    } catch (err) {
      notify("Dispatch failed: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="content">
      <PageHeader
        eyebrow="RESPONSE ORCHESTRATION"
        title="Smart dispatch"
        sub="Route municipal teams to real citizen incident locations based on verified cause and severity."
      />
      <div className="dispatch-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Open incidents</h3>
              <span>Choose an incident to route</span>
            </div>
          </div>
          {incidents.length === 0 ? (
            <div style={{ padding: "20px", color: "#8a9ba8", fontSize: "11px" }}>No incidents currently awaiting dispatch.</div>
          ) : (
            incidents.map((i) => (
              <button
                className={`dispatch-item ${selected?.id === i.id ? "chosen" : ""}`}
                key={i.id}
                onClick={() => setSelected(i)}
              >
                <div>
                  <b>{i.id}</b>
                  <span>
                    {i.address || i.zoneId} · {i.cause}
                  </span>
                </div>
                <RiskBadge score={i.severity} />
              </button>
            ))
          )}
        </section>
        <section className="panel dispatch-form">
          <div className="dispatch-hero">
            <div className="hero-icon">
              <RouteIcon />
            </div>
            <div>
              <span>Selected incident</span>
              <h2>{selected?.id || "No Incident"}</h2>
              <p>
                {selected?.reporter} · {selected?.address || selected?.zoneId} · Severity {selected?.severity} · Status:{" "}
                {selected?.status}
              </p>
            </div>
          </div>
          <label>
            Recommended response team
            <select value={team} onChange={(e) => setTeam(e.target.value)}>
              <option>Municipal Drainage Crew</option>
              <option>Pumping / High-Volume Extraction Team</option>
              <option>General Emergency Response Team</option>
              <option>Traffic Police & Route Diversion Crew</option>
            </select>
          </label>
          <div className="route-card">
            <div>
              <b>Routing rationale</b>
              <p>
                {selected?.cause === "Blocked drain"
                  ? "Potential blocked drain identified → Municipal cleaning and desilting crew."
                  : "High rainfall overload detected → High-capacity dewatering pumping crew."}
              </p>
            </div>
            <div className="eta">8–12 min</div>
          </div>
          <div className="action-row">
            <button className="primary" onClick={send} disabled={!selected || sending}>
              <Send size={16} /> {sending ? "Assigning..." : "Dispatch team"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Drainage({ zones, incidents, notify }) {
  const issues = zones.filter((z) => z.cause === "Blocked drain" || (z.waterLevel > 0 && z.rainfall < 10));

  const exportReport = () => {
    const data = {
      title: "VarshaRaksha Drainage & Chronic Waterlogging Maintenance Report",
      generatedAt: new Date().toISOString(),
      zones,
      incidents
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VarshaRaksha-Drainage-Report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    notify("Maintenance report exported to JSON successfully.");
  };

  return (
    <div className="content">
      <PageHeader
        eyebrow="PREVENTIVE MAINTENANCE"
        title="Drainage intelligence"
        sub="Persistent citizen evidence and low-rainfall water accumulation reveal chronic drainage bottlenecks."
      >
        <button className="primary" onClick={exportReport}>
          <FileText size={16} /> Export maintenance report
        </button>
      </PageHeader>
      <div className="stats-grid">
        <StatCard label="Drainage issues" value={issues.length} delta="Chronic hotspots" icon={Wrench} tone="orange" />
        <StatCard label="Evidence clusters" value={incidents.length} delta="From real GPS reports" icon={Layers3} tone="blue" />
        <StatCard label="Wards monitored" value="2" delta="Ward 72 & Ward 73" icon={Activity} tone="green" />
        <StatCard label="Pending actions" value={issues.length} delta="Desilting required" icon={FileText} tone="red" />
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Locations requiring desilting / maintenance</h3>
            <span>Identified from real ground reports and low-rain accumulation</span>
          </div>
        </div>
        {issues.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#8a9ba8", fontSize: "11px" }}>
            No drainage blockages detected. All drains functioning properly.
          </div>
        ) : (
          issues.map((z) => (
            <div className="maintenance-row" key={z.id}>
              <div className={`priority-dot ${z.risk >= 75 ? "red" : "orange"}`}></div>
              <div className="maintenance-main">
                <b>{z.name}</b>
                <span>
                  {z.ward} · {z.cause} · water {z.waterLevel} cm
                </span>
              </div>
              <div>
                <b>{z.reports}</b>
                <small>reports</small>
              </div>
              <div>
                <b>{z.risk}</b>
                <small>risk score</small>
              </div>
              <button className="ghost" onClick={() => notify(`Work order logged for desilting crew at ${z.name}.`)}>
                Create work order
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Analytics({ zones, incidents }) {
  return (
    <div className="content">
      <PageHeader eyebrow="DECISION SUPPORT" title="Flood analytics" sub="Track live risk, causes, and ground evidence." />
      <div className="analytics-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Ward Rainfall & Risk Distribution</h3>
              <span>Live values</span>
            </div>
          </div>
          <div style={{ padding: "20px" }}>
            {zones.map((z) => (
              <div key={z.id} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                  <span>
                    <b>{z.name}</b> ({z.ward})
                  </span>
                  <span>
                    Risk: <b>{z.risk}</b> · Rain: <b>{z.rainfall} mm</b>
                  </span>
                </div>
                <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(5, z.risk)}%`,
                      background: z.risk >= 75 ? "#ef4444" : z.risk >= 45 ? "#f59e0b" : "#10b981",
                      borderRadius: "8px"
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Operational Summary</h3>
              <span>Active dataset</span>
            </div>
          </div>
          <div className="big-number">{incidents.length}</div>
          <div style={{ padding: "0 20px 20px", fontSize: "11px", color: "#64748b" }}>
            Total real-time citizen reports stored in persistent database.
          </div>
        </section>
      </div>
    </div>
  );
}

function UsersPage({ notify }) {
  const users = [
    ["U-001", "Aarav Mehta", "Vendor", "Station Road", "Active"],
    ["U-002", "Neha Shah", "Resident", "Station Road", "Active"],
    ["U-003", "Ward Control Admin", "Authority", "Ward 72", "Admin"],
    ["U-004", "Response Team 4", "Emergency Crew", "Ward 72", "Active"]
  ];
  return (
    <div className="content">
      <PageHeader
        eyebrow="ACCESS CONTROL"
        title="Users & roles"
        sub="Role-based access for residents, vendors, ward administrators, and municipal crews."
      >
        <button className="primary" onClick={() => notify("Invite flow opened.")}>
          <Users size={16} /> Add user
        </button>
      </PageHeader>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Area</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u[0]}>
                  <td>
                    <b>{u[1]}</b>
                    <small>{u[0]}</small>
                  </td>
                  <td>
                    <span className="role-pill">{u[2]}</span>
                  </td>
                  <td>{u[3]}</td>
                  <td>
                    <span className="status">{u[4]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

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
        title="Live data sources & network health"
        sub="Real-time latency probes and connection health for Open-Meteo, OpenStreetMap, OSRM, and storage."
      >
        <button className="ghost" onClick={fetchSources} disabled={loading}>
          <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Testing..." : "Test connections"}
        </button>
      </PageHeader>
      <div className="source-grid">
        {sources.map((s) => (
          <div className="panel source-card" key={s.name}>
            <div className="source-icon">
              <Database size={18} />
            </div>
            <div>
              <b>{s.name}</b>
              <span>{s.kind}</span>
            </div>
            <em className="connected" style={{ background: s.status === "Live" || s.status === "Active" ? "#ebfaf4" : "#fef3c7" }}>
              {s.status}
            </em>
            <div className="source-line">
              <i style={{ background: s.status === "Live" || s.status === "Active" ? "#13b978" : "#f59e0b" }}></i>
              <small>
                Latency: <b>{s.latency}</b> · Last ping: {s.lastSync || "Just now"}
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage({ notify }) {
  return (
    <div className="content">
      <PageHeader eyebrow="CONTROL CENTER" title="System settings" sub="Configure risk score bands and notification channels." />
      <div className="settings-grid">
        <section className="panel form-panel">
          <h3>Risk thresholds</h3>
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
            Save changes
          </button>
        </section>
        <section className="panel form-panel">
          <h3>Notification channels</h3>
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

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
