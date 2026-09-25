import React from "react";
import { MapPin, Wrench, Camera, Waves, Sparkles, BarChart3 } from "lucide-react";

export default function DrainageTabsNav({
  activeTab,
  onTabChange,
  counts = {}
}) {
  const tabs = [
    { id: "hotspots", label: "Hotspots & Live Map", icon: MapPin, count: counts.hotspots },
    { id: "work-orders", label: "Desilting Work Orders", icon: Wrench, count: counts.workOrders },
    { id: "evidence", label: "AI Evidence & Clusters", icon: Camera, count: counts.evidence },
    { id: "outfalls", label: "Outfall Corridors", icon: Waves, count: counts.outfalls },
    { id: "simulation", label: "Rainfall & Simulation", icon: Sparkles, badge: "Modeled" },
    { id: "analytics", label: "Historical Analytics", icon: BarChart3 }
  ];

  return (
    <div className="di-tabs-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`di-tab-btn ${isActive ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="di-tab-badge">{tab.count}</span>
            )}
            {tab.badge && (
              <span className="di-sim-badge" style={{ fontSize: "9px", padding: "1px 5px" }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
