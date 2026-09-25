import React from "react";
import { AlertCircle, Wrench, ChevronRight, MapPin, CheckCircle2 } from "lucide-react";

export default function HotspotCard({
  hotspot,
  isSelected,
  onSelect,
  onCreateWorkOrder
}) {
  const score = hotspot.riskScore || 50;
  const riskClass =
    score >= 75
      ? "di-risk-critical"
      : score >= 50
      ? "di-risk-high"
      : score >= 35
      ? "di-risk-moderate"
      : "di-risk-low";

  const riskLabel = hotspot.riskLevel || (score >= 75 ? "Critical" : score >= 50 ? "High" : "Moderate");

  return (
    <div
      className={`di-hotspot-card ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(hotspot)}
    >
      <div className="di-card-header">
        <div>
          <h4 className="di-card-title">{hotspot.name}</h4>
          <div className="di-card-meta">
            <span>{hotspot.ward}</span>
            <span>·</span>
            <span style={{ fontWeight: 600 }}>{hotspot.id}</span>
          </div>
        </div>
        <span className={`di-risk-badge ${riskClass}`}>
          <AlertCircle size={11} /> {riskLabel} · {score}
        </span>
      </div>

      <div className="di-card-cause">
        <b style={{ color: "#0f172a" }}>Cause:</b> {hotspot.primaryCause}
      </div>

      <div className="di-card-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: hotspot.status === "Desilting Required" ? "#dc2626" : hotspot.status === "Resolved" ? "#16a34a" : "#2563eb"
            }}
          >
            {hotspot.status}
          </span>
          <span style={{ color: "#94a3b8" }}>·</span>
          <span style={{ color: "#64748b", fontSize: "11px" }}>
            Flagged <b>{hotspot.flagCount}x</b>
          </span>
        </div>

        <div className="di-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="di-btn-sm"
            onClick={() => onSelect(hotspot)}
            title="Inspect Hotspot Details"
          >
            Inspect
          </button>
          <button
            className="di-btn-sm"
            style={{ background: "#0b1f41", color: "#fff", borderColor: "#0b1f41" }}
            onClick={() => onCreateWorkOrder && onCreateWorkOrder(hotspot)}
            title="Create Desilting Work Order"
          >
            + Order
          </button>
        </div>
      </div>
    </div>
  );
}
