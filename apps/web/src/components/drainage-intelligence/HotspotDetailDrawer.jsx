import React, { useState } from "react";
import {
  X,
  AlertCircle,
  Wrench,
  MapPin,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  Activity,
  ShieldCheck,
  Layers
} from "lucide-react";

export default function HotspotDetailDrawer({
  hotspot,
  onClose,
  onCreateWorkOrder,
  onUpdateStatus,
  workOrders = []
}) {
  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!hotspot) return null;

  const score = hotspot.riskScore || 50;
  const riskClass =
    score >= 75
      ? "di-risk-critical"
      : score >= 50
      ? "di-risk-high"
      : score >= 35
      ? "di-risk-moderate"
      : "di-risk-low";

  const handleCopyCoords = () => {
    const coords = `${hotspot.lat}, ${hotspot.lng}`;
    navigator.clipboard.writeText(coords);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linkedWorkOrders = workOrders.filter((w) => w.hotspotId === hotspot.id);

  const handleQuickStatus = async (newStatus) => {
    if (!onUpdateStatus) return;
    setUpdatingStatus(true);
    try {
      await onUpdateStatus(hotspot.id, {
        status: newStatus,
        auditNote: `Status updated to ${newStatus} by authority operator.`
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="di-drawer-backdrop" onClick={onClose}>
      <div className="di-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Head */}
        <div className="di-drawer-head">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className={`di-risk-badge ${riskClass}`}>
                <AlertCircle size={12} /> {hotspot.riskLevel || "Moderate"} Risk
              </span>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                {hotspot.id} · {hotspot.ward}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "17px", color: "#0b1f41", fontWeight: 800 }}>
              {hotspot.name}
            </h3>
          </div>
          <button
            className="di-btn di-btn-secondary"
            style={{ padding: "6px", borderRadius: "50%" }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="di-drawer-body">
          {/* Section 1: Summary & Risk Score Breakdown */}
          <div>
            <h5 className="di-section-title">
              <Activity size={13} />
              1. Drainage Risk Score Breakdown
            </h5>
            <div className="di-drawer-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: score >= 75 ? "#dc2626" : score >= 50 ? "#ea580c" : "#16a34a" }}>
                    {score} <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                    Location Risk Severity: <b>{hotspot.riskLevel || "Elevated"}</b>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "#0f172a", fontWeight: 700 }}>
                    Flagged {hotspot.flagCount} Times
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Status: <b style={{ color: "#2563eb" }}>{hotspot.status}</b>
                  </div>
                </div>
              </div>

              {/* Factor breakdown */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  Configured Scoring Factors:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                  <div style={{ background: "#ffffff", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b" }}>Recurrence Factor:</span> <b>35%</b>
                  </div>
                  <div style={{ background: "#ffffff", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b" }}>Silt Obstruction:</span> <b>25%</b>
                  </div>
                  <div style={{ background: "#ffffff", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b" }}>Rainfall Runoff:</span> <b>20%</b>
                  </div>
                  <div style={{ background: "#ffffff", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b" }}>Corridor Transit:</span> <b>20%</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Location & Drainage Asset */}
          <div>
            <h5 className="di-section-title">
              <MapPin size={13} />
              2. Infrastructure Asset & Location
            </h5>
            <div className="di-drawer-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Drainage Asset Identifier:</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0b1f41" }}>
                    {hotspot.assetId || "SWD-CULV-72-A"}
                  </div>
                </div>
                <button
                  className="di-btn di-btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                  onClick={handleCopyCoords}
                  title="Copy GPS coordinates"
                >
                  {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy GPS"}
                </button>
              </div>

              <div style={{ fontSize: "12px", color: "#334155" }}>
                <b>Landmark:</b> {hotspot.roadLandmark || hotspot.name}
              </div>

              <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#64748b" }}>
                <span>Type: <b>{hotspot.drainageType || "Box Culvert"}</b></span>
                <span>·</span>
                <span>Connected Outfall: <b>{hotspot.connectedOutfall || "OUTF-01 (Irla Nullah)"}</b></span>
              </div>
            </div>
          </div>

          {/* Section 3: AI Root-Cause Diagnosis */}
          <div>
            <h5 className="di-section-title">
              <ShieldCheck size={13} />
              3. AI-Assisted Root Cause Diagnosis
            </h5>
            <div className="di-drawer-card" style={{ borderLeft: "3px solid #2563eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                  Primary Cause: {hotspot.rootCauseCategory || "Solid Waste & Silt"}
                </span>
                <span className="di-sim-badge" style={{ background: "#2563eb" }}>
                  {hotspot.causeConfidence || 92}% Confidence
                </span>
              </div>

              <p style={{ margin: "4px 0", fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                {hotspot.primaryCause}
              </p>

              <div style={{ fontSize: "11px", color: "#64748b", background: "#ffffff", padding: "6px", borderRadius: "4px" }}>
                <b>Supporting Evidence:</b> {hotspot.supportingEvidence || "Documented across repeated monsoon drainage overflows."}
              </div>
            </div>
          </div>

          {/* Section 4: Recommended Action */}
          <div>
            <h5 className="di-section-title">
              <Wrench size={13} />
              4. Recommended Authority Action
            </h5>
            <div className="di-drawer-card" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e40af" }}>
                {hotspot.recommendedAction || "Schedule immediate mechanical desilting."}
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#3b82f6" }}>
                Automated recommendation based on historical recurrence and rainfall forecasts.
              </p>
            </div>
          </div>

          {/* Section 5: Linked Work Orders */}
          <div>
            <h5 className="di-section-title">
              <FileText size={13} />
              5. Linked Desilting Work Orders ({linkedWorkOrders.length})
            </h5>
            {linkedWorkOrders.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px" }}>
                No active work order. Click below to issue one.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {linkedWorkOrders.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      fontSize: "12px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0b1f41" }}>
                      <span>{w.id} · {w.workType}</span>
                      <span style={{ color: "#2563eb" }}>{w.status}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      Team: {w.assignedTeam} · Due: {w.dueDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Audit Trail */}
          <div>
            <h5 className="di-section-title">
              <Clock size={13} />
              6. Audit Trail & Verification History
            </h5>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(hotspot.auditTrail || []).map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                    fontSize: "12px",
                    borderLeft: "2px solid #cbd5e1",
                    paddingLeft: "10px",
                    marginLeft: "4px"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "#0b1f41" }}>{step.action}</div>
                    <div style={{ fontSize: "11px", color: "#334155" }}>{step.detail}</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                      {step.user} · {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="di-drawer-footer">
          <button
            className="di-btn di-btn-secondary"
            onClick={() => handleQuickStatus(hotspot.status === "Resolved" ? "Desilting Required" : "Resolved")}
            disabled={updatingStatus}
          >
            <CheckCircle2 size={14} />
            {hotspot.status === "Resolved" ? "Re-open Hotspot" : "Mark Resolved"}
          </button>

          <button
            className="di-btn di-btn-primary"
            onClick={() => {
              if (onCreateWorkOrder) onCreateWorkOrder(hotspot);
            }}
          >
            <Wrench size={14} />
            Create Work Order
          </button>
        </div>
      </div>
    </div>
  );
}
