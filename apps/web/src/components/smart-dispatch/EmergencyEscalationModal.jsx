import React, { useState } from "react";
import { AlertOctagon, X, ShieldAlert, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function EmergencyEscalationModal({
  incident,
  isOpen,
  onClose,
  onEscalationSuccess,
  notify
}) {
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("Critical");
  const [severity, setSeverity] = useState(95);
  const [author, setAuthor] = useState("Ward Commander");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !incident) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide an operational justification for escalation.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/incidents/${incident.id}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          priority,
          severity: Number(severity),
          author
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to escalate incident");

      if (notify) notify(`🚨 Incident ${incident.id} escalated to ${priority} (Severity: ${severity}).`);
      if (onEscalationSuccess) onEscalationSuccess(data.incident);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-box" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
        <div className="tt-modal-header" style={{ background: "#dc2626" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertOctagon size={16} />
            <b style={{ fontSize: "14px" }}>Emergency Incident Priority Escalation</b>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tt-modal-body">
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#991b1b" }}>
            Escalating will raise incident priority, prioritize allocation matching, and notify all active dispatch units.
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#0B1B3A", marginBottom: "4px" }}>
              Incident Target:
            </label>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
              {incident.id} • {incident.address}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                Target Priority Level:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="Critical">🚨 Critical (Life-Safety SOS)</option>
                <option value="High">⚠️ High Priority</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                Severity Rating:
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#0B1B3A", marginBottom: "4px" }}>
              Escalation Rationale & Justification:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Rising flood water reaching residential ground floors, trapped senior citizens..."
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
              style={{ background: "#dc2626", borderColor: "#dc2626", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {submitting ? (
                <>
                  <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Escalating...</span>
                </>
              ) : (
                "Confirm Escalation"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
