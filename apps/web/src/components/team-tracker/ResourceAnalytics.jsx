import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Layers, ShieldCheck, RefreshCw, Loader2, PieChart } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function ResourceAnalytics({ resources = [] }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/resources/analytics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load operational analytics");
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [resources]);

  const cats = analytics?.categories || {};
  const catKeys = Object.keys(cats);

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
            <BarChart3 size={18} style={{ color: "#2563eb" }} />
            <b style={{ fontSize: "16px", color: "#0B1B3A" }}>Operational Fleet Analytics & Readiness</b>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
            Live calculations derived from real-time dispatch events, capacity updates, and telemetry.
          </p>
        </div>

        <button className="ghost small" onClick={fetchAnalytics} disabled={loading}>
          {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={13} />}
          <span>Refresh Analytics</span>
        </button>
      </div>

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#2563eb", marginBottom: "8px" }} />
          <div>Aggregating fleet metrics...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* Key Rates Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(11, 27, 58, 0.04)" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>
                Fleet Availability Rate
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#16a34a", marginTop: "4px" }}>
                {analytics.availabilityRate}%
              </div>
              <div style={{ fontSize: "11px", color: "#15803d", marginTop: "2px" }}>
                {analytics.available} of {analytics.total} units available for dispatch
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(11, 27, 58, 0.04)" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>
                Active Fleet Utilization
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#2563eb", marginTop: "4px" }}>
                {analytics.utilizationRate}%
              </div>
              <div style={{ fontSize: "11px", color: "#1d4ed8", marginTop: "2px" }}>
                {analytics.deployed + analytics.enRoute} units engaged on active dispatches
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(11, 27, 58, 0.04)" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>
                Active Incident Dispatches
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#0B1B3A", marginTop: "4px" }}>
                {analytics.activeDispatchesCount}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Ongoing disaster response actions
              </div>
            </div>
          </div>

          {/* Category Breakdown Table / Distribution */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(11, 27, 58, 0.04)" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", color: "#0B1B3A", marginBottom: "14px" }}>
              Fleet Distribution By Resource Category
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {catKeys.map((catKey) => {
                const item = cats[catKey];
                const pct = analytics.total > 0 ? Math.round((item.total / analytics.total) * 100) : 0;
                return (
                  <div key={catKey} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                      <b style={{ color: "#334155" }}>{catKey}</b>
                      <span style={{ color: "#64748b" }}>
                        <b>{item.total} units</b> ({item.available} available, {item.deployed} deployed) • <b>{pct}%</b>
                      </span>
                    </div>
                    <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#2563eb", borderRadius: "4px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
