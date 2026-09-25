import React, { useState } from "react";
import { Waves, ShieldCheck, AlertTriangle, ArrowUpRight, Gauge, Droplets, RefreshCw } from "lucide-react";

export default function OutfallCorridorPanel({
  outfalls = [],
  onUpdateOutfall,
  onSelectHotspotById
}) {
  const [updatingId, setUpdatingId] = useState(null);

  const handleToggleGate = async (outfall) => {
    if (!onUpdateOutfall) return;
    setUpdatingId(outfall.id);
    const newStatus =
      outfall.gateStatus === "Operational (Open)"
        ? "Restricted (Silt 45%)"
        : "Operational (Open)";
    try {
      await onUpdateOutfall(outfall.id, {
        gateStatus: newStatus,
        lastInspection: new Date().toISOString()
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span className="di-sim-badge" style={{ background: "#0284c7" }}>
              <Waves size={12} /> COASTAL DRAINAGE INFRASTRUCTURE
            </span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Tidal Discharges & Automated Sluice Gate Corridors
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#0b1f41", fontWeight: 800 }}>
            Mumbai Outfall Corridors & Tidal Discharge Monitoring
          </h3>
        </div>

        <div style={{ fontSize: "12px", color: "#64748b" }}>
          <b>{outfalls.length} Primary Coastal Outfalls</b> Monitored 24/7
        </div>
      </div>

      {/* Grid of outfall cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px"
        }}
      >
        {outfalls.map((o) => {
          const isWarning =
            o.gateStatus.includes("Restricted") || o.gateStatus.includes("Maintenance");

          return (
            <div
              key={o.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#0b1f41", fontWeight: 700 }}>
                    {o.name}
                  </h4>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    ID: <b>{o.id}</b> · {o.ward}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    background: isWarning ? "#ffedd5" : "#dcfce7",
                    color: isWarning ? "#ea580c" : "#16a34a",
                    border: `1px solid ${isWarning ? "#fed7aa" : "#bbf7d0"}`
                  }}
                >
                  {o.gateStatus}
                </span>
              </div>

              {/* Metrics grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  background: "#f8fafc",
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "11px"
                }}
              >
                <div>
                  <div style={{ color: "#64748b" }}>Tidal Level:</div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{o.tidalLevel}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Discharge Capacity:</div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{o.dischargeCapacity || "85 m³/s"}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Silt Sedimentation:</div>
                  <div style={{ fontWeight: 700, color: isWarning ? "#ea580c" : "#16a34a" }}>
                    {o.siltLevel || "Normal (20%)"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Sluice Gate Spec:</div>
                  <div style={{ fontWeight: 600, color: "#334155" }}>
                    {o.sluiceGateType || "Crest Flap Gate"}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Connected Drainage Catchment: <b style={{ color: "#1e293b" }}>{o.basin}</b>
              </div>

              {/* Linked Hotspots */}
              {o.linkedHotspots?.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                  <span style={{ color: "#64748b" }}>Linked Hotspots:</span>
                  {o.linkedHotspots.map((hId) => (
                    <button
                      key={hId}
                      style={{
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#2563eb",
                        borderRadius: "4px",
                        padding: "1px 6px",
                        fontWeight: 700,
                        fontSize: "10px",
                        cursor: "pointer"
                      }}
                      onClick={() => onSelectHotspotById && onSelectHotspotById(hId)}
                      title="Inspect linked hotspot"
                    >
                      {hId}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "10px",
                  marginTop: "auto"
                }}
              >
                <button
                  className="di-btn di-btn-secondary"
                  style={{ flex: 1, fontSize: "11px", padding: "6px" }}
                  onClick={() => handleToggleGate(o)}
                  disabled={updatingId === o.id}
                >
                  <RefreshCw size={12} className={updatingId === o.id ? "spin" : ""} />
                  {o.gateStatus === "Operational (Open)" ? "Flag Restriction" : "Set Operational"}
                </button>
                <button
                  className="di-btn di-btn-secondary"
                  style={{ fontSize: "11px", padding: "6px 10px" }}
                  onClick={() => alert(`Inspection scheduled for ${o.name} with Coastal Maintenance Wing.`)}
                >
                  Schedule Audit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
