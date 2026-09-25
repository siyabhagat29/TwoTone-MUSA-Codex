import React from "react";
import { Activity, X } from "lucide-react";

export function ResourceReadinessOverview({
  resources = [],
  activeStatusFilter,
  onSelectStatusFilter
}) {
  const total = resources.length;
  if (total === 0) return null;

  const counts = {
    AVAILABLE: 0,
    DEPLOYED: 0,
    EN_ROUTE: 0,
    LIMITED: 0,
    MAINTENANCE: 0,
    OFFLINE: 0
  };

  resources.forEach((r) => {
    const s = (r.status || "").toUpperCase();
    if (s === "AVAILABLE" || s === "READY") counts.AVAILABLE++;
    else if (s === "DEPLOYED" || s === "ON-SITE" || s === "ON_SCENE" || s === "ALLOCATED" || s === "DISPATCHED") counts.DEPLOYED++;
    else if (s === "EN_ROUTE" || s === "EN ROUTE") counts.EN_ROUTE++;
    else if (s === "LIMITED") counts.LIMITED++;
    else if (s === "MAINTENANCE" || r.maintenance?.status === "Under Maintenance") counts.MAINTENANCE++;
    else counts.OFFLINE++;
  });

  const getPercent = (val) => (total > 0 ? (val / total) * 100 : 0);

  const statuses = [
    { key: "AVAILABLE", label: "Available", count: counts.AVAILABLE, color: "#16a34a", bg: "#dcfce7" },
    { key: "DEPLOYED", label: "Deployed / Active", count: counts.DEPLOYED, color: "#2563eb", bg: "#eff6ff" },
    { key: "EN_ROUTE", label: "En Route", count: counts.EN_ROUTE, color: "#9333ea", bg: "#f3e8ff" },
    { key: "LIMITED", label: "Limited Capacity", count: counts.LIMITED, color: "#d97706", bg: "#fef3c7" },
    { key: "MAINTENANCE", label: "Under Maintenance", count: counts.MAINTENANCE, color: "#dc2626", bg: "#fee2e2" },
    { key: "OFFLINE", label: "Offline / Standby", count: counts.OFFLINE, color: "#64748b", bg: "#f1f5f9" }
  ];

  return (
    <div className="tt-readiness-box">
      <div className="tt-readiness-header">
        <div className="tt-readiness-title">
          <Activity size={15} style={{ color: "#2563eb" }} />
          <span>Operational Readiness Distribution</span>
        </div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          Fleet Availability Index: <b style={{ color: "#0B1B3A" }}>{Math.round(getPercent(counts.AVAILABLE))}%</b>
          {activeStatusFilter !== "ALL" && (
            <button
              onClick={() => onSelectStatusFilter("ALL")}
              style={{
                marginLeft: "10px",
                background: "none",
                border: "none",
                color: "#2563eb",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px"
              }}
            >
              <X size={12} /> Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Stacked Bar */}
      <div className="tt-readiness-bar">
        {counts.AVAILABLE > 0 && (
          <div
            className="tt-readiness-seg available"
            style={{ width: `${getPercent(counts.AVAILABLE)}%` }}
            title={`Available: ${counts.AVAILABLE} (${Math.round(getPercent(counts.AVAILABLE))}%)`}
          />
        )}
        {counts.DEPLOYED > 0 && (
          <div
            className="tt-readiness-seg deployed"
            style={{ width: `${getPercent(counts.DEPLOYED)}%` }}
            title={`Deployed: ${counts.DEPLOYED} (${Math.round(getPercent(counts.DEPLOYED))}%)`}
          />
        )}
        {counts.EN_ROUTE > 0 && (
          <div
            className="tt-readiness-seg enroute"
            style={{ width: `${getPercent(counts.EN_ROUTE)}%` }}
            title={`En Route: ${counts.EN_ROUTE} (${Math.round(getPercent(counts.EN_ROUTE))}%)`}
          />
        )}
        {counts.LIMITED > 0 && (
          <div
            className="tt-readiness-seg limited"
            style={{ width: `${getPercent(counts.LIMITED)}%` }}
            title={`Limited: ${counts.LIMITED} (${Math.round(getPercent(counts.LIMITED))}%)`}
          />
        )}
        {counts.MAINTENANCE > 0 && (
          <div
            className="tt-readiness-seg maintenance"
            style={{ width: `${getPercent(counts.MAINTENANCE)}%` }}
            title={`Maintenance: ${counts.MAINTENANCE} (${Math.round(getPercent(counts.MAINTENANCE))}%)`}
          />
        )}
        {counts.OFFLINE > 0 && (
          <div
            className="tt-readiness-seg offline"
            style={{ width: `${getPercent(counts.OFFLINE)}%` }}
            title={`Offline: ${counts.OFFLINE} (${Math.round(getPercent(counts.OFFLINE))}%)`}
          />
        )}
      </div>

      {/* Interactive Status Breakdown Chips */}
      <div className="tt-readiness-chips">
        {statuses.map((s) => {
          const isActive = activeStatusFilter === s.key;
          return (
            <button
              key={s.key}
              className={`tt-readiness-chip ${isActive ? "active" : ""}`}
              onClick={() => onSelectStatusFilter(isActive ? "ALL" : s.key)}
              title={`Click to filter by ${s.label}`}
            >
              <span className="tt-readiness-dot" style={{ background: s.color }} />
              <span>{s.label}:</span>
              <b>{s.count}</b>
              <span style={{ fontSize: "10px", color: "#64748b" }}>
                ({Math.round(getPercent(s.count))}%)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
