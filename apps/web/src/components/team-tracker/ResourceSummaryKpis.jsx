import React from "react";
import { ShieldCheck, Truck, Navigation, AlertCircle, Building2, Layers } from "lucide-react";

export function ResourceSummaryKpis({ resources = [], onSelectStatusFilter }) {
  const total = resources.length;

  const available = resources.filter((r) => {
    const s = (r.status || "").toUpperCase();
    return s === "AVAILABLE" || s === "READY";
  }).length;

  const deployed = resources.filter((r) => {
    const s = (r.status || "").toUpperCase();
    return s === "DEPLOYED" || s === "ON-SITE" || s === "ON_SCENE" || s === "ALLOCATED" || s === "DISPATCHED";
  }).length;

  const enRoute = resources.filter((r) => {
    const s = (r.status || "").toUpperCase();
    return s === "EN_ROUTE" || s === "EN ROUTE";
  }).length;

  const limitedMaint = resources.filter((r) => {
    const s = (r.status || "").toUpperCase();
    return s === "LIMITED" || s === "MAINTENANCE" || r.maintenance?.status === "Under Maintenance";
  }).length;

  const facilitiesSet = new Set(resources.map((r) => r.agency || r.station || r.base_location).filter(Boolean));
  const facilitiesCount = facilitiesSet.size;

  const availPercent = total > 0 ? Math.round((available / total) * 100) : 0;
  const deployedPercent = total > 0 ? Math.round(((deployed + enRoute) / total) * 100) : 0;

  return (
    <div className="tt-kpi-grid">
      {/* 1. TOTAL RESOURCES */}
      <div className="tt-kpi-card kpi-total">
        <div className="tt-kpi-header">
          <span className="tt-kpi-label">Total Resources</span>
          <div className="tt-kpi-icon" style={{ background: "#f1f5f9", color: "#0B1B3A" }}>
            <Layers size={14} />
          </div>
        </div>
        <div className="tt-kpi-value">{total}</div>
        <div className="tt-kpi-sub">Registered operational units</div>
      </div>

      {/* 2. AVAILABLE */}
      <div
        className="tt-kpi-card kpi-available"
        style={{ cursor: "pointer" }}
        onClick={() => onSelectStatusFilter && onSelectStatusFilter("AVAILABLE")}
        title="Filter by available units"
      >
        <div className="tt-kpi-header">
          <span className="tt-kpi-label">Available Now</span>
          <div className="tt-kpi-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <ShieldCheck size={14} />
          </div>
        </div>
        <div className="tt-kpi-value" style={{ color: "#16a34a" }}>{available}</div>
        <div className="tt-kpi-sub" style={{ color: "#15803d" }}>
          <b>{availPercent}%</b> fleet ready for dispatch
        </div>
      </div>

      {/* 3. DEPLOYED */}
      <div
        className="tt-kpi-card kpi-deployed"
        style={{ cursor: "pointer" }}
        onClick={() => onSelectStatusFilter && onSelectStatusFilter("DEPLOYED")}
        title="Filter by deployed units"
      >
        <div className="tt-kpi-header">
          <span className="tt-kpi-label">Deployed / Active</span>
          <div className="tt-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Truck size={14} />
          </div>
        </div>
        <div className="tt-kpi-value" style={{ color: "#2563eb" }}>{deployed}</div>
        <div className="tt-kpi-sub" style={{ color: "#1d4ed8" }}>
          <b>{deployedPercent}%</b> currently engaged
        </div>
      </div>

      {/* 4. EN ROUTE */}
      <div
        className="tt-kpi-card kpi-enroute"
        style={{ cursor: "pointer" }}
        onClick={() => onSelectStatusFilter && onSelectStatusFilter("EN_ROUTE")}
        title="Filter by units in transit"
      >
        <div className="tt-kpi-header">
          <span className="tt-kpi-label">En Route</span>
          <div className="tt-kpi-icon" style={{ background: "#f3e8ff", color: "#9333ea" }}>
            <Navigation size={14} />
          </div>
        </div>
        <div className="tt-kpi-value" style={{ color: "#9333ea" }}>{enRoute}</div>
        <div className="tt-kpi-sub">In transit to active scenes</div>
      </div>

      {/* 5. LIMITED / MAINT */}
      <div
        className="tt-kpi-card kpi-limited"
        style={{ cursor: "pointer" }}
        onClick={() => onSelectStatusFilter && onSelectStatusFilter("LIMITED")}
        title="Filter by restricted or maintenance units"
      >
        <div className="tt-kpi-header">
          <span className="tt-kpi-label">Limited / Maint.</span>
          <div className="tt-kpi-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <AlertCircle size={14} />
          </div>
        </div>
        <div className="tt-kpi-value" style={{ color: "#d97706" }}>{limitedMaint}</div>
        <div className="tt-kpi-sub">Reduced capacity or servicing</div>
      </div>

      {/* 6. FACILITIES */}
      <div className="tt-kpi-card kpi-facilities">
        <div className="tt-kpi-header">
          <span className="tt-kpi-label">Facilities</span>
          <div className="tt-kpi-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>
            <Building2 size={14} />
          </div>
        </div>
        <div className="tt-kpi-value" style={{ color: "#0284c7" }}>{facilitiesCount}</div>
        <div className="tt-kpi-sub">Bases, hospitals & depots</div>
      </div>
    </div>
  );
}
