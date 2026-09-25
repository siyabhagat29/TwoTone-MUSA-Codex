import React, { useState } from "react";
import { X, Wrench, Calendar, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function ResourceMaintenanceModal({
  resource,
  isOpen,
  onClose,
  onMaintenanceSuccess,
  notify
}) {
  const [status, setStatus] = useState(resource?.maintenance?.status || "Operational");
  const [assignedTeam, setAssignedTeam] = useState(resource?.maintenance?.assignedTeam || "Base Workshop Crew");
  const [lastInspectionDate, setLastInspectionDate] = useState(
    resource?.maintenance?.lastInspectionDate ? resource.maintenance.lastInspectionDate.split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [nextInspectionDate, setNextInspectionDate] = useState(
    resource?.maintenance?.nextInspectionDate ? resource.maintenance.nextInspectionDate.split("T")[0] : ""
  );
  const [notes, setNotes] = useState(resource?.maintenance?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !resource) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/resources/${resource.id}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assignedTeam,
          lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate).toISOString() : undefined,
          nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate).toISOString() : undefined,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record maintenance");

      if (notify) notify(`Maintenance status recorded for ${resource.name}: ${status}`);
      if (onMaintenanceSuccess) onMaintenanceSuccess(data.resource);
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
        <div className="tt-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Wrench size={16} />
            <b style={{ fontSize: "14px" }}>Record Maintenance & Inspection</b>
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

        <form onSubmit={handleSubmit} className="tt-modal-body">
          <div style={{ fontSize: "13px", color: "#475569" }}>
            Updating maintenance log for: <b style={{ color: "#0B1B3A" }}>{resource.name}</b>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#0B1B3A", marginBottom: "4px" }}>
              Maintenance Status:
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1"
              }}
            >
              <option value="Operational">Operational (Ready for Service)</option>
              <option value="Inspection Due">Inspection Due (Routine Checkup)</option>
              <option value="Maintenance Required">Maintenance Required (Non-Critical)</option>
              <option value="Under Maintenance">Under Maintenance (Offline / Servicing)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#0B1B3A", marginBottom: "4px" }}>
              Assigned Workshop / Technical Team:
            </label>
            <input
              type="text"
              value={assignedTeam}
              onChange={(e) => setAssignedTeam(e.target.value)}
              placeholder="e.g., Base Workshop Crew #2"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                Last Inspection Date:
              </label>
              <input
                type="date"
                value={lastInspectionDate}
                onChange={(e) => setLastInspectionDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                Next Inspection Due:
              </label>
              <input
                type="date"
                value={nextInspectionDate}
                onChange={(e) => setNextInspectionDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#0B1B3A", marginBottom: "4px" }}>
              Inspection Findings & Service Notes:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Engine oil changed, pneumatic water pumps pressure tested and certified..."
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: "12px", background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "6px" }}>
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
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Save Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
