import React, { useState, useEffect } from "react";
import { BrainCircuit, Sparkles, CheckCircle2, ChevronRight, Loader2, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function AiDispatchRecommendation({
  incident,
  onSelectResource,
  selectedResource
}) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!incident?.id) {
      setRecommendation(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`${API}/resources/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: incident.id })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Recommendation service offline");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setRecommendation(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [incident?.id]);

  if (!incident) return null;

  const rec = recommendation?.recommended;
  const isSelected = selectedResource?.id === rec?.resource?.id || selectedResource?.name === rec?.resource?.name;

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #bfdbfe",
      borderRadius: "12px",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.05)"
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <BrainCircuit size={15} style={{ color: "#2563eb" }} />
          <b style={{ fontSize: "12px", color: "#0B1B3A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            AI Dispatch Recommendation
          </b>
        </div>

        {rec && (
          <span style={{
            fontSize: "11px",
            fontWeight: "800",
            background: "#eff6ff",
            color: "#1d4ed8",
            padding: "2px 8px",
            borderRadius: "6px",
            border: "1px solid #bfdbfe",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <Sparkles size={11} /> Score: {rec.allocationScore}/100
          </span>
        )}
      </div>

      {loading && (
        <div style={{ padding: "14px", textAlign: "center", color: "#64748b", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: "#2563eb" }} />
          <span>Evaluating fleet readiness, proximity and category suitability...</span>
        </div>
      )}

      {error && !loading && (
        <div style={{ fontSize: "11px", color: "#991b1b", background: "#fef2f2", padding: "8px 10px", borderRadius: "6px" }}>
          <AlertCircle size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
          {error}
        </div>
      )}

      {!loading && rec && (
        <>
          {/* Top Recommendation Box */}
          <div style={{
            background: isSelected ? "#eff6ff" : "#f8fafc",
            border: isSelected ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>{rec.resource?.emoji || "🚒"}</span>
              <div>
                <b style={{ fontSize: "13px", color: "#0B1B3A" }}>{rec.resource?.name}</b>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                  {rec.resource?.agency || rec.resource?.station} • {rec.distanceKm != null ? `${rec.distanceKm.toFixed(1)} km away` : ""}
                  {rec.eta && ` • ETA ~${rec.eta}`}
                </div>
              </div>
            </div>

            <button
              className={isSelected ? "ghost small" : "primary small"}
              onClick={() => onSelectResource && onSelectResource(rec.resource)}
              style={{ fontSize: "11px", padding: "5px 10px" }}
            >
              {isSelected ? "✓ Selected" : "Select & Route"}
            </button>
          </div>

          {/* Explainable Rationale */}
          <div style={{ fontSize: "11px", color: "#334155", background: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
            <b style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Rationale:</b>
            <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.5" }}>
              {rec.rationale?.slice(0, 3).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Alternatives Preview if available */}
          {recommendation.alternatives?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
              <span>Alternatives:</span>
              {recommendation.alternatives.slice(0, 2).map((alt) => (
                <button
                  key={alt.resource.id}
                  onClick={() => onSelectResource && onSelectResource(alt.resource)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: "11px",
                    padding: 0
                  }}
                >
                  {alt.resource.name} ({alt.eta})
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
