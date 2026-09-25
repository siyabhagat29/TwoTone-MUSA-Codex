import React, { useState } from "react";
import { Sparkles, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Shield, Radio, Loader2, MapPin } from "lucide-react";

export function TeamTrackerHeader({
  resources = [],
  simulationId,
  userLocationName,
  generating,
  clearing,
  lastUpdated,
  onGenerate,
  onClear,
  onRefresh
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="page-header" style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#0B1B3A", margin: 0, letterSpacing: "-0.5px" }}>
            Team Tracker
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
            fontWeight: "700",
            letterSpacing: "0.4px"
          }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
            LIVE TELEMETRY
          </div>

          {simulationId ? (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700"
            }}>
              <Sparkles size={12} style={{ color: "#2563eb" }} />
              <span>SIMULATION ACTIVE</span>
              <span style={{
                fontFamily: "ui-monospace, monospace",
                background: "#dbeafe",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "10px"
              }}>
                {simulationId}
              </span>
            </div>
          ) : resources.length > 0 ? (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "600"
            }}>
              <Shield size={12} style={{ color: "#64748b" }} />
              <span>REGISTERED FLEET</span>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", fontSize: "13px", color: "#64748b" }}>
          <span>Monitor emergency resources, readiness, and operational coverage.</span>
          {userLocationName && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#334155" }}>
              <MapPin size={12} style={{ color: "#2563eb" }} />
              <b>{userLocationName}</b>
            </span>
          )}
          {lastUpdated && (
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Synced: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {resources.length > 0 && (
          <button
            className="ghost"
            onClick={() => setShowClearConfirm(true)}
            disabled={clearing || generating}
            style={{ color: "#dc2626", borderColor: "#fecaca", background: "#fef2f2" }}
            title="Clear all generated simulation resources"
          >
            {clearing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
            <span>Clear Simulation</span>
          </button>
        )}

        <button className="ghost" onClick={onRefresh} disabled={generating || clearing} title="Refresh live readiness telemetry">
          <RefreshCw size={14} />
          <span>Refresh Status</span>
        </button>

        <button
          className="primary"
          onClick={onGenerate}
          disabled={generating || clearing}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0B1B3A", borderColor: "#0B1B3A" }}
        >
          {generating ? (
            <>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              <span>Discovering Facilities...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>{resources.length > 0 ? "Regenerate Simulation" : "Generate Simulations"}</span>
            </>
          )}
        </button>
      </div>

      {/* Confirmation Dialog for Clearing Simulation */}
      {showClearConfirm && (
        <div className="tt-modal-backdrop" onClick={() => setShowClearConfirm(false)}>
          <div className="tt-modal-box" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="tt-modal-header" style={{ background: "#dc2626" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={18} />
                <b style={{ fontSize: "14px" }}>Confirm Clear Simulation</b>
              </div>
            </div>
            <div className="tt-modal-body">
              <p style={{ fontSize: "13px", color: "#334155", margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to clear the simulated emergency resource inventory? All active assignments, status changes, and discovered facility units will be reset.
              </p>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#991b1b" }}>
                ⚠️ This action cannot be undone. You will need to regenerate facilities afterward.
              </div>
            </div>
            <div className="tt-modal-footer">
              <button className="ghost small" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button
                className="primary small"
                style={{ background: "#dc2626", borderColor: "#dc2626" }}
                onClick={() => {
                  setShowClearConfirm(false);
                  onClear();
                }}
              >
                Clear Resources
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
