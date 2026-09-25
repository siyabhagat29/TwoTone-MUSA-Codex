import React from "react";
import { RefreshCw, Radio, Shield, Send, CheckCircle2, Navigation, MapPin } from "lucide-react";

export function SmartDispatchHeader({
  incidents = [],
  onRefresh,
  loading = false
}) {
  const activeIncidents = incidents.filter(
    (i) => i.status !== "Resolved" && i.status !== "RESOLVED" && i.status !== "False Alarm"
  );
  const criticalCount = activeIncidents.filter((i) => i.severity >= 80 || i.isSos).length;
  const unassignedCount = activeIncidents.filter((i) => !i.dispatched && !i.assignedTeam).length;
  const enRouteCount = activeIncidents.filter((i) => i.status === "Dispatched" || i.dispatchProgress === "en_route").length;
  const onSceneCount = activeIncidents.filter((i) => i.status === "On Scene" || i.dispatchProgress === "on_scene").length;
  const resolvedCount = incidents.filter((i) => i.status === "Resolved" || i.status === "RESOLVED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "8px" }}>
      {/* Top Title & System Status Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#0B1B3A", margin: 0, letterSpacing: "-0.5px" }}>
              Smart Dispatch
            </h1>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700"
            }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              LIVE DISPATCH CONSOLE
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>
            Coordinate emergency response.
          </p>
        </div>

        <button
          className="ghost small"
          onClick={onRefresh}
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          title="Refresh live telemetry and active dispatches"
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Metrics Strip */}
      <div className="sd-header-metrics">
        <div className="sd-metric-pill" style={{ borderLeft: "3px solid #0B1B3A" }}>
          <span>Active Emergencies:</span>
          <b>{activeIncidents.length}</b>
          {criticalCount > 0 && (
            <span style={{ background: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: "10px", fontSize: "10px", fontWeight: "800" }}>
              {criticalCount} Critical
            </span>
          )}
        </div>

        <div className="sd-metric-pill" style={{ borderLeft: "3px solid #dc2626" }}>
          <span>Awaiting Assignment:</span>
          <b style={{ color: unassignedCount > 0 ? "#dc2626" : "#0B1B3A" }}>{unassignedCount}</b>
        </div>

        <div className="sd-metric-pill" style={{ borderLeft: "3px solid #f59e0b" }}>
          <span>En Route:</span>
          <b style={{ color: "#d97706" }}>{enRouteCount}</b>
        </div>

        <div className="sd-metric-pill" style={{ borderLeft: "3px solid #2563eb" }}>
          <span>On Scene / Operating:</span>
          <b style={{ color: "#2563eb" }}>{onSceneCount}</b>
        </div>

        <div className="sd-metric-pill" style={{ borderLeft: "3px solid #16a34a" }}>
          <span>Mitigated:</span>
          <b style={{ color: "#16a34a" }}>{resolvedCount}</b>
        </div>
      </div>
    </div>
  );
}
