import React from "react";
import { Search, Filter, RotateCcw, LayoutGrid, Table } from "lucide-react";

export function ResourceFilters({
  totalCount,
  filteredCount,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  countsByCategory = {}
}) {
  const hasActiveFilters = categoryFilter !== "ALL" || statusFilter !== "ALL" || searchQuery.trim() !== "";

  const handleReset = () => {
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  return (
    <div className="resource-filter-bar" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Top Row: Category Pills & View Switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        {/* Category Pills */}
        <div className="resource-filter-pills" style={{ flex: 1, minWidth: "260px" }}>
          <button
            className={`resource-filter-pill ${categoryFilter === "ALL" ? "active" : ""}`}
            onClick={() => setCategoryFilter("ALL")}
          >
            All ({totalCount})
          </button>
          <button
            className={`resource-filter-pill ${categoryFilter === "RESCUE" ? "active" : ""}`}
            onClick={() => setCategoryFilter("RESCUE")}
          >
            🚒 Rescue ({countsByCategory.RESCUE || 0})
          </button>
          <button
            className={`resource-filter-pill ${categoryFilter === "MEDICAL" ? "active" : ""}`}
            onClick={() => setCategoryFilter("MEDICAL")}
          >
            🚑 Medical ({countsByCategory.MEDICAL || 0})
          </button>
          <button
            className={`resource-filter-pill ${categoryFilter === "WATER" ? "active" : ""}`}
            onClick={() => setCategoryFilter("WATER")}
          >
            💧 Water ({countsByCategory.WATER || 0})
          </button>
          <button
            className={`resource-filter-pill ${categoryFilter === "FOOD" ? "active" : ""}`}
            onClick={() => setCategoryFilter("FOOD")}
          >
            🍱 Food ({countsByCategory.FOOD || 0})
          </button>
          <button
            className={`resource-filter-pill ${categoryFilter === "SHELTER" ? "active" : ""}`}
            onClick={() => setCategoryFilter("SHELTER")}
          >
            🛏️ Shelter ({countsByCategory.SHELTER || 0})
          </button>
        </div>

        {/* View Switcher: Cards vs Table */}
        <div style={{ display: "flex", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "2px" }}>
          <button
            style={{
              padding: "5px 10px",
              fontSize: "12px",
              fontWeight: "600",
              background: viewMode === "grid" ? "#ffffff" : "transparent",
              color: viewMode === "grid" ? "#0B1B3A" : "#64748b",
              boxShadow: viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid size={13} />
            <span>Cards</span>
          </button>
          <button
            style={{
              padding: "5px 10px",
              fontSize: "12px",
              fontWeight: "600",
              background: viewMode === "table" ? "#ffffff" : "transparent",
              color: viewMode === "table" ? "#0B1B3A" : "#64748b",
              boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
            onClick={() => setViewMode("table")}
          >
            <Table size={13} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Search Box & Status Filter Dropdown */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", flex: 1, maxWidth: "340px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search by resource, facility, location, or incident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "7px 12px 7px 32px",
                fontSize: "12px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
                width: "100%",
                outline: "none"
              }}
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              fontSize: "12px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              color: "#0f172a",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available Only</option>
            <option value="DEPLOYED">Deployed / On-Scene</option>
            <option value="EN_ROUTE">En Route</option>
            <option value="LIMITED">Limited Capacity</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#475569",
                fontSize: "12px",
                padding: "6px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div style={{ fontSize: "12px", color: "#64748b" }}>
          Showing <b>{filteredCount}</b> of <b>{totalCount}</b> resources
        </div>
      </div>
    </div>
  );
}
