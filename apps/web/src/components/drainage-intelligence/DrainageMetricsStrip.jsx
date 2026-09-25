import React from "react";
import { AlertCircle, Wrench, ShieldAlert, Waves, CheckCircle2 } from "lucide-react";

export default function DrainageMetricsStrip({
  hotspots = [],
  workOrders = [],
  outfalls = [],
  activeFilter = "all",
  onSelectFilter
}) {
  const totalHotspots = hotspots.length;
  const actionRequiredCount = hotspots.filter(
    (b) => b.status === "Desilting Required" || b.status === "Inspection Pending" || b.status === "Active Desilting Order"
  ).length;
  const openWorkOrdersCount = workOrders.filter(
    (w) => w.status !== "Completed" && w.status !== "Cancelled"
  ).length;
  const criticalRiskCount = hotspots.filter((b) => (b.riskScore || 0) >= 70).length;
  const monitoredOutfallsCount = outfalls.length || 4;

  const metrics = [
    {
      id: "all",
      label: "Chronic Hotspots",
      value: String(totalHotspots).padStart(2, "0"),
      trend: "Ward 72 & 73",
      icon: AlertCircle,
      tone: "#2563eb",
      bg: "#eff6ff"
    },
    {
      id: "action-required",
      label: "Action Required",
      value: String(actionRequiredCount).padStart(2, "0"),
      trend: "Immediate desilting",
      icon: Wrench,
      tone: "#dc2626",
      bg: "#fee2e2"
    },
    {
      id: "open-orders",
      label: "Open Work Orders",
      value: String(openWorkOrdersCount).padStart(2, "0"),
      trend: "Active field crews",
      icon: ShieldAlert,
      tone: "#ea580c",
      bg: "#ffedd5"
    },
    {
      id: "critical-zones",
      label: "Critical Risk Zones",
      value: String(criticalRiskCount).padStart(2, "0"),
      trend: "Score ≥ 70/100",
      icon: AlertCircle,
      tone: "#dc2626",
      bg: "#fee2e2"
    },
    {
      id: "outfalls",
      label: "Monitored Outfalls",
      value: String(monitoredOutfallsCount).padStart(2, "0"),
      trend: "Tidal discharge gates",
      icon: Waves,
      tone: "#0284c7",
      bg: "#e0f2fe"
    }
  ];

  return (
    <div className="di-metrics-grid">
      {metrics.map((m) => {
        const Icon = m.icon;
        const isActive = activeFilter === m.id;
        return (
          <div
            key={m.id}
            className={`di-metric-card ${isActive ? "active" : ""}`}
            onClick={() => onSelectFilter && onSelectFilter(m.id)}
            title={`Filter by ${m.label}`}
          >
            <div className="di-metric-info">
              <span className="di-metric-label">{m.label}</span>
              <span className="di-metric-value">{m.value}</span>
              <span className="di-metric-trend" style={{ color: m.tone }}>
                {m.trend}
              </span>
            </div>
            <div className="di-metric-icon" style={{ background: m.bg, color: m.tone }}>
              <Icon size={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
