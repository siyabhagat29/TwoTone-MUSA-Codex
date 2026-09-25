import React, { useState } from "react";
import { X, Send, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function DispatchConfirmationModal({
  incident,
  selectedResource,
  routeData,
  isOpen,
  onClose,
  onDispatchSuccess,
  notify
}) {
  const [submitting, setSubmitting] = useState(false);
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState(null);

  if (!isOpen || !incident || !selectedResource) return null;

  const catInfo = getAuthorityResourceCategory(selectedResource);
  const etaStr = routeData?.durationMin
    ? `${routeData.durationMin} min`
    : selectedResource.etaText || "8–12 min";

  const handleConfirm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/incidents/${incident.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team: selectedResource.name,
          teamId: selectedResource.id,
          reason: customReason || incident.cause || "Hyperlocal flood emergency tasking",
          eta: etaStr
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm dispatch");

      if (notify) {
        notify(`✓ Dispatched ${selectedResource.name} to ${incident.id}. ETA: ${etaStr}.`);
      }
      if (onDispatchSuccess) onDispatchSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-box" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
        <div className="tt-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Send size={16} />
            <b style={{ fontSize: "14px" }}>Confirm Emergency Dispatch Tasking</b>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="tt-modal-body">
          {/* Target Incident */}
          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
              Target Emergency Incident
            </div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#0B1B3A", marginTop: "2px" }}>
              {incident.id} • {incident.address}
            </div>
            <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
              Severity: <b>{incident.severity}/100</b> {incident.isSos ? "🚨 SOS DISTRESS" : ""}
            </div>
          </div>

          {/* Assigned Squad */}
          <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: "10px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase" }}>
              Assigned Emergency Response Unit
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "20px" }}>{selectedResource.icon || catInfo.icon || "🚒"}</span>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a8a" }}>
                  {selectedResource.name}
                </div>
                <div style={{ fontSize: "11px", color: "#1e40af" }}>
                  {selectedResource.station || selectedResource.agency}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "14px", marginTop: "8px", fontSize: "11px", fontWeight: "700", color: "#1e3a8a" }}>
              <span>Distance: <b>{selectedResource.distanceKm != null ? `${selectedResource.distanceKm} km` : "Nearby"}</b></span>
              <span>•</span>
              <span>Estimated ETA: <b style={{ color: "#2563eb" }}>{etaStr}</b></span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#0B1B3A", marginBottom: "4px" }}>
              Dispatch Directive / Notes:
            </label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="e.g., Deploy water suction pumps and high-clearance rescue vehicle..."
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: "12px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
              {error}
            </div>
          )}

          <div className="tt-modal-footer" style={{ margin: "8px -20px -20px -20px" }}>
            <button type="button" className="ghost small" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary small"
              disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {submitting ? (
                <>
                  <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Deploying Squad...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Confirm & Deploy Squad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
