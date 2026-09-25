import React, { useState } from "react";
import { X, Send, AlertTriangle, CheckCircle2, Shield, Loader2 } from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function ResourceAssignmentModal({
  resource,
  initialIncident = null,
  incidents = [],
  isOpen,
  onClose,
  onAssignmentSuccess,
  notify
}) {
  const activeIncidents = incidents.filter(
    (i) => i.status !== "Resolved" && i.status !== "RESOLVED"
  );

  const [selectedIncId, setSelectedIncId] = useState(initialIncident?.id || activeIncidents[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [isOverride, setIsOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !resource) return null;

  const catInfo = getAuthorityResourceCategory(resource);
  const statusUpper = (resource.status || "").toUpperCase();
  const isBusy = statusUpper === "DEPLOYED" || statusUpper === "EN_ROUTE" || statusUpper === "MAINTENANCE";

  const selectedIncident = incidents.find((i) => i.id === selectedIncId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIncId) {
      setError("Please select an incident to assign.");
      return;
    }

    if (isBusy && !isOverride) {
      setError("Resource is currently deployed or under maintenance. You must check 'Supervisor Override' to reassign.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/resources/${resource.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: selectedIncId,
          notes,
          isOverride
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.conflict) {
          setError(data.message || "Conflict detected. Supervisor override required.");
          return;
        }
        throw new Error(data.error || "Failed to assign resource");
      }

      if (notify) notify(`Resource ${resource.name} dispatched to incident ${selectedIncId}!`);
      if (onAssignmentSuccess) onAssignmentSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="tt-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Send size={16} />
            <b style={{ fontSize: "14px" }}>Emergency Resource Dispatch & Assignment</b>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              borderRadius: "4px",
              padding: "4px",
              cursor: "pointer"
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="tt-modal-body">
          {/* Target Resource Summary */}
          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span style={{ fontSize: "24px" }}>{resource.emoji || catInfo.icon || "🚒"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <b style={{ fontSize: "14px", color: "#0B1B3A" }}>{resource.name}</b>
                <span className={`resource-status-pill ${resource.status?.toLowerCase() || "available"}`}>
                  {resource.status}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                {resource.agency || resource.station} • Capacity: {resource.capacity || "Operational"}
              </div>
            </div>
          </div>

          {/* Conflict Warning if Resource is Busy */}
          {isBusy && (
            <div style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#b45309", fontSize: "12px", fontWeight: "700" }}>
                <AlertTriangle size={15} />
                <span>Resource Conflict Detected</span>
              </div>
              <p style={{ fontSize: "11px", color: "#92400e", margin: 0 }}>
                This resource is currently marked as <b>{resource.status}</b>. Assigning it will divert the unit from its existing tasking.
              </p>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#b45309", cursor: "pointer", fontWeight: "600" }}>
                <input
                  type="checkbox"
                  checked={isOverride}
                  onChange={(e) => setIsOverride(e.target.checked)}
                />
                Authorize Supervisor Reassignment Override
              </label>
            </div>
          )}

          {/* Select Target Incident */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#0B1B3A", marginBottom: "6px" }}>
              Target Active Incident:
            </label>
            <select
              value={selectedIncId}
              onChange={(e) => setSelectedIncId(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a"
              }}
            >
              {activeIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} — {inc.reporter || "Incident"} ({inc.address?.slice(0, 30)}...) [Sev: {inc.severity}]
                </option>
              ))}
            </select>
          </div>

          {/* Incident Details Card */}
          {selectedIncident && (
            <div style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "11px",
              color: "#1e40af"
            }}>
              <div><b>Location:</b> {selectedIncident.address}</div>
              <div><b>Type / Code:</b> {selectedIncident.type || selectedIncident.causeCode || "Flood SOS"}</div>
              <div><b>Severity:</b> {selectedIncident.severity}/100 {selectedIncident.isSos ? "🚨 SOS ACTIVE" : ""}</div>
            </div>
          )}

          {/* Notes / Reason */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#0B1B3A", marginBottom: "6px" }}>
              Dispatch Reason & Instructions (Optional):
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Immediate water rescue and evacuation in flooded low-lying area..."
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
                outline: "none"
              }}
            />
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: "12px", background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "6px" }}>
              {error}
            </div>
          )}

          {/* Modal Footer */}
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
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Confirm Dispatch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
