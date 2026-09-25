import React, { useState, useEffect } from "react";
import { BrainCircuit, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Shield, Send, Loader2 } from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function AiResourceRecommendation({
  incidents = [],
  resources = [],
  onConfirmAssignment,
  notify
}) {
  // Filter active incidents
  const activeIncidents = incidents.filter(
    (i) => i.status !== "Resolved" && i.status !== "RESOLVED" && i.status !== "Dispatched" && !i.dispatched
  );

  const [selectedIncidentId, setSelectedIncidentId] = useState(activeIncidents[0]?.id || "");
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch AI recommendation whenever selected incident changes
  useEffect(() => {
    if (!selectedIncidentId) {
      setRecommendation(null);
      return;
    }

    let isMounted = true;
    const fetchRecommendation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/resources/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incidentId: selectedIncidentId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate recommendation");
        if (isMounted) setRecommendation(data);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecommendation();
    return () => { isMounted = false; };
  }, [selectedIncidentId]);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  return (
    <div className="tt-ai-panel">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <BrainCircuit size={16} />
            </div>
            <b style={{ fontSize: "16px", color: "#0B1B3A" }}>AI-Assisted Emergency Resource Allocation</b>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
            Explainable decision support engine evaluating proximity, vehicle suitability, capacity, and conflicting assignments.
          </p>
        </div>

        {/* Incident Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Select Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            style={{
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0B1B3A",
              maxWidth: "280px"
            }}
          >
            {activeIncidents.length === 0 ? (
              <option value="">No Active Undispatched Incidents</option>
            ) : (
              activeIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} — {inc.reporter || "Incident"} ({inc.address?.slice(0, 25) || "Active"}...)
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Selected Incident Context Strip */}
      {selectedIncident && (
        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "12px"
        }}>
          <div>
            <span style={{ color: "#64748b" }}>Location: </span>
            <b style={{ color: "#0B1B3A" }}>{selectedIncident.address || "Mumbai Operational Area"}</b>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>Type / Code: </span>
            <b style={{ color: "#2563eb" }}>{selectedIncident.type || selectedIncident.causeCode || "Flood Distress"}</b>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>Severity: </span>
            <b style={{ color: selectedIncident.severity >= 80 ? "#dc2626" : "#f59e0b" }}>
              {selectedIncident.severity}/100 {selectedIncident.isSos ? "🚨 SOS" : ""}
            </b>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#2563eb", marginBottom: "8px" }} />
          <div style={{ fontSize: "13px", fontWeight: "600" }}>Evaluating fleet proximity and capacity matches...</div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div style={{ padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px" }}>
          <AlertTriangle size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !recommendation && (
        <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
          Select an active incident above to generate explainable resource allocation recommendations.
        </div>
      )}

      {/* Recommendation Results */}
      {!loading && recommendation && recommendation.recommended && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* PRIMARY RECOMMENDATION CARD */}
          <div className="tt-ai-candidate recommended">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: "800",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.5px"
                }}>
                  BEST ALLOCATION MATCH
                </span>
                <span className="tt-score-badge">
                  <Sparkles size={11} /> Score: {recommendation.recommended.allocationScore}/100
                </span>
              </div>

              <div style={{ fontSize: "12px", color: "#64748b" }}>
                ETA: <b style={{ color: "#0B1B3A" }}>{recommendation.recommended.eta}</b>
                {recommendation.recommended.distanceKm != null && ` (${recommendation.recommended.distanceKm.toFixed(1)} km)`}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "28px" }}>{recommendation.recommended.resource.emoji || "🚒"}</span>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#0B1B3A" }}>
                    {recommendation.recommended.resource.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {recommendation.recommended.resource.agency || recommendation.recommended.resource.station} • {recommendation.recommended.resource.category}
                  </div>
                </div>
              </div>

              {/* Action Button: Dispatch with human confirmation */}
              <button
                className="primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#16a34a", borderColor: "#16a34a" }}
                onClick={() => onConfirmAssignment && onConfirmAssignment(recommendation.recommended.resource, selectedIncident)}
              >
                <CheckCircle2 size={15} />
                <span>Accept & Dispatch Unit</span>
              </button>
            </div>

            {/* Explainable Rationale */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#475569", marginBottom: "6px" }}>
                Why This Resource? (Explainable Allocation Audit)
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#334155", lineHeight: "1.6" }}>
                {recommendation.recommended.rationale?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>

              {recommendation.recommended.tradeOffs?.length > 0 && (
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#d97706" }}>Known Constraints / Trade-offs:</div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#b45309" }}>
                    {recommendation.recommended.tradeOffs.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ALTERNATIVE CANDIDATES */}
          {recommendation.alternatives?.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                Alternative Available Options
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {recommendation.alternatives.map((alt, idx) => (
                  <div
                    key={alt.resource.id || idx}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "18px" }}>{alt.resource.emoji || "🚚"}</span>
                      <div>
                        <b style={{ fontSize: "13px", color: "#0B1B3A" }}>{alt.resource.name}</b>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          Score: <b>{alt.allocationScore}/100</b> • ETA: <b>{alt.eta}</b> {alt.distanceKm != null ? `(${alt.distanceKm.toFixed(1)} km)` : ""}
                        </div>
                      </div>
                    </div>

                    <button
                      className="ghost small"
                      onClick={() => onConfirmAssignment && onConfirmAssignment(alt.resource, selectedIncident)}
                    >
                      Override with this unit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
