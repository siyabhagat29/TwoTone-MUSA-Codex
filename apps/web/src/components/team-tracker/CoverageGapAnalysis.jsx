import React, { useState, useEffect } from "react";
import { AlertOctagon, CheckCircle2, ShieldAlert, MapPin, RefreshCw, Loader2, Navigation } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function CoverageGapAnalysis({ onFocusMapSector, onOpenAssignModal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGaps = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/resources/coverage-gaps`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load coverage gaps");
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaps();
  }, []);

  const sectors = data?.sectors || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
        boxShadow: "0 1px 3px rgba(11, 27, 58, 0.04)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlert size={18} style={{ color: "#2563eb" }} />
            <b style={{ fontSize: "16px", color: "#0B1B3A" }}>Geospatial Coverage Gap Analysis</b>
            {data?.criticalGapsCount > 0 && (
              <span style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px" }}>
                {data.criticalGapsCount} CRITICAL GAPS
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
            Real-time supply vs active distress demand evaluation across Mumbai municipal wards.
          </p>
        </div>

        <button className="ghost small" onClick={fetchGaps} disabled={loading}>
          {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={13} />}
          <span>Refresh Analysis</span>
        </button>
      </div>

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#2563eb", marginBottom: "8px" }} />
          <div>Computing spatial proximity and sector demand metrics...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Grid of Sector Cards */}
      {!loading && sectors.length > 0 && (
        <div className="tt-gap-grid">
          {sectors.map((sec) => {
            const isCrit = sec.coverageStatus === "CRITICAL_GAP";
            const isLim = sec.coverageStatus === "LIMITED";
            const badgeClass = sec.coverageStatus.toLowerCase();

            return (
              <div key={sec.sectorId} className={`tt-gap-card ${isCrit ? "critical" : isLim ? "limited" : ""}`}>
                {/* Sector Title & Status Badge */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <div>
                    <b style={{ fontSize: "14px", color: "#0B1B3A" }}>{sec.sectorName}</b>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      ID: {sec.sectorId} • GPS: ({sec.coordinates?.lat}, {sec.coordinates?.lng})
                    </div>
                  </div>
                  <span className={`tt-gap-badge ${badgeClass}`}>
                    {sec.coverageStatus.replace("_", " ")}
                  </span>
                </div>

                {/* Metrics Matrix */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  background: "#f8fafc",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  textAlign: "center"
                }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>ACTIVE INCIDENTS</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: sec.activeIncidentsCount > 0 ? "#dc2626" : "#0B1B3A" }}>
                      {sec.activeIncidentsCount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>RESCUE UNITS</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb" }}>
                      {sec.rescueAvailable}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>MEDICAL UNITS</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a" }}>
                      {sec.medicalAvailable}
                    </div>
                  </div>
                </div>

                {/* Actionable Directive Recommendation */}
                <div style={{
                  fontSize: "12px",
                  color: isCrit ? "#991b1b" : "#334155",
                  background: isCrit ? "#fee2e2" : "#ffffff",
                  border: isCrit ? "1px solid #fecaca" : "1px solid #e2e8f0",
                  padding: "10px",
                  borderRadius: "8px",
                  lineHeight: "1.4"
                }}>
                  <b>Actionable Directive:</b> {sec.recommendation}
                </div>

                {/* Incidents in Sector list if any */}
                {sec.incidents?.length > 0 && (
                  <div style={{ fontSize: "11px", color: "#475569" }}>
                    <b>Active Sector Distress:</b>
                    <ul style={{ margin: "4px 0 0", paddingLeft: "16px" }}>
                      {sec.incidents.slice(0, 2).map((inc) => (
                        <li key={inc.id}>{inc.id} — {inc.reporter} ({inc.address})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
