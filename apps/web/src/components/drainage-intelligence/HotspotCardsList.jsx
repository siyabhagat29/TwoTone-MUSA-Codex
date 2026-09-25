import React, { useState, useMemo } from "react";
import HotspotCard from "./HotspotCard.jsx";
import { Search, Filter, AlertCircle } from "lucide-react";

export default function HotspotCardsList({
  hotspots = [],
  selectedHotspot,
  onSelectHotspot,
  onCreateWorkOrder
}) {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("risk");

  const filteredHotspots = useMemo(() => {
    return hotspots
      .filter((h) => {
        const query = search.toLowerCase();
        const matchesSearch =
          !query ||
          h.name?.toLowerCase().includes(query) ||
          h.id?.toLowerCase().includes(query) ||
          h.primaryCause?.toLowerCase().includes(query) ||
          h.ward?.toLowerCase().includes(query);

        const matchesWard =
          wardFilter === "all" ||
          (h.ward || "").toLowerCase() === wardFilter.toLowerCase();

        const score = h.riskScore || 50;
        let matchesRisk = true;
        if (riskFilter === "critical") matchesRisk = score >= 75;
        else if (riskFilter === "high") matchesRisk = score >= 50 && score < 75;
        else if (riskFilter === "moderate") matchesRisk = score < 50;

        return matchesSearch && matchesWard && matchesRisk;
      })
      .sort((a, b) => {
        if (sortBy === "risk") return (b.riskScore || 0) - (a.riskScore || 0);
        if (sortBy === "recurrence") return (b.flagCount || 0) - (a.flagCount || 0);
        return a.name.localeCompare(b.name);
      });
  }, [hotspots, search, wardFilter, riskFilter, sortBy]);

  return (
    <div className="di-list-panel">
      <div className="di-list-head">
        <div style={{ position: "relative" }}>
          <input
            type="text"
            className="di-search-input"
            placeholder="Search hotspots by name, ID, or root cause..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="di-filters-row">
          <select
            className="di-select"
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
          >
            <option value="all">All Wards</option>
            <option value="Ward 72">Ward 72</option>
            <option value="Ward 73">Ward 73</option>
          </select>

          <select
            className="di-select"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical (≥75)</option>
            <option value="high">High (50-74)</option>
            <option value="moderate">Moderate (&lt;50)</option>
          </select>

          <select
            className="di-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="risk">Highest Risk</option>
            <option value="recurrence">Most Recurring</option>
            <option value="name">Name (A-Z)</option>
          </select>

          <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "auto", fontWeight: 600 }}>
            {filteredHotspots.length} hotspots
          </span>
        </div>
      </div>

      <div className="di-hotspots-scroll">
        {filteredHotspots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
            <AlertCircle size={24} style={{ margin: "0 auto 8px auto", color: "#94a3b8" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No hotspots matching filters</p>
            <button
              className="di-btn di-btn-secondary"
              style={{ marginTop: "12px", fontSize: "11px" }}
              onClick={() => {
                setSearch("");
                setWardFilter("all");
                setRiskFilter("all");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredHotspots.map((h) => (
            <HotspotCard
              key={h.id}
              hotspot={h}
              isSelected={selectedHotspot?.id === h.id}
              onSelect={onSelectHotspot}
              onCreateWorkOrder={onCreateWorkOrder}
            />
          ))
        )}
      </div>
    </div>
  );
}
