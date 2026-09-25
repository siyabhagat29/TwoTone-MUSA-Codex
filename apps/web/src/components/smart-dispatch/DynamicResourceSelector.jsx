import React from "react";
import { Compass, Loader2, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

export function DynamicResourceSelector({
  incident,
  nearbyResources = [],
  selectedResource,
  onSelectResource,
  searchRadius,
  setSearchRadius,
  activeCategory,
  setActiveCategory,
  loadingResources,
  errorResources,
  isOverride,
  setIsOverride
}) {
  const isBusy = selectedResource && (
    (selectedResource.status || "").toUpperCase() === "DEPLOYED" ||
    (selectedResource.status || "").toUpperCase() === "EN_ROUTE" ||
    (selectedResource.status || "").toUpperCase() === "MAINTENANCE"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Search Radius & Category Bar */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#0B1B3A", textTransform: "uppercase" }}>
              Search Radius:
            </span>
            {[3, 5, 10, 15].map((r) => (
              <button
                key={r}
                onClick={() => setSearchRadius(r)}
                style={{
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: searchRadius === r ? "800" : "600",
                  borderRadius: "5px",
                  border: searchRadius === r ? "1px solid #2563eb" : "1px solid #cbd5e1",
                  background: searchRadius === r ? "#eff6ff" : "#ffffff",
                  color: searchRadius === r ? "#1d4ed8" : "#475569",
                  cursor: "pointer"
                }}
              >
                {r} km
              </button>
            ))}
          </div>

          <span style={{ fontSize: "11px", color: "#64748b" }}>
            {loadingResources ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Searching Maps API...
              </span>
            ) : (
              <span>Discovered: <b>{nearbyResources.length}</b> units</span>
            )}
          </span>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
          {[
            { id: "all", label: "All", icon: "🌐" },
            { id: "fire", label: "Rescue & Fire", icon: "🚒" },
            { id: "medical", label: "Medical", icon: "🏥" },
            { id: "police", label: "Police", icon: "👮" },
            { id: "shelter", label: "Shelters", icon: "🏠" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: "3px 8px",
                fontSize: "10px",
                fontWeight: activeCategory === cat.id ? "800" : "600",
                borderRadius: "14px",
                border: activeCategory === cat.id ? "1px solid #0B1B3A" : "1px solid #cbd5e1",
                background: activeCategory === cat.id ? "#0B1B3A" : "#ffffff",
                color: activeCategory === cat.id ? "#ffffff" : "#475569",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Conflict Warning Alert */}
      {isBusy && (
        <div className="sd-conflict-warning">
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#b45309", fontSize: "12px", fontWeight: "700" }}>
            <AlertTriangle size={15} />
            <span>Assignment Conflict: Unit Currently {selectedResource.status}</span>
          </div>
          <p style={{ fontSize: "11px", color: "#92400e", margin: 0, lineHeight: 1.4 }}>
            This resource is already deployed on an active incident. Overriding will divert this unit to the current incident.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#b45309", cursor: "pointer", fontWeight: "700" }}>
            <input
              type="checkbox"
              checked={isOverride}
              onChange={(e) => setIsOverride(e.target.checked)}
            />
            Authorize Supervisor Reassignment Override
          </label>
        </div>
      )}

      {/* Discovered Resources Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Nearby Response Units (Shortest Distance):
          </b>
        </div>

        {nearbyResources.length === 0 && !loadingResources && (
          <div style={{ padding: "20px", textAlign: "center", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", color: "#64748b", fontSize: "12px" }}>
            No emergency services discovered within {searchRadius} km. Expand radius above.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
          {nearbyResources.map((res, idx) => {
            const isSelected = selectedResource?.id === res.id || selectedResource?.name === res.name;
            const catInfo = getAuthorityResourceCategory(res);

            return (
              <div
                key={res.id || idx}
                onClick={() => onSelectResource(res)}
                style={{
                  background: isSelected ? "#eff6ff" : "#ffffff",
                  border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 2px 8px rgba(37, 99, 235, 0.12)" : "0 1px 2px rgba(0,0,0,0.03)"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                    <span style={{ fontSize: "18px" }}>{res.icon || catInfo.icon || "🚒"}</span>
                    <span style={{
                      fontSize: "9px",
                      fontWeight: "800",
                      background: idx === 0 ? "#dcfce7" : "#dbeafe",
                      color: idx === 0 ? "#15803d" : "#1e40af",
                      padding: "2px 6px",
                      borderRadius: "6px"
                    }}>
                      {idx === 0 ? "⚡ Nearest " : ""}{res.distanceKm != null ? `${res.distanceKm} km` : ""}
                    </span>
                  </div>
                  <b style={{ fontSize: "12px", color: "#0B1B3A", display: "block", marginTop: "4px", lineHeight: "1.3" }}>
                    {res.name}
                  </b>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                    {res.station || res.agency || "Emergency Depot"}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "10px", color: "#2563eb", fontWeight: "700" }}>
                    {res.etaText ? `ETA: ${res.etaText}` : "Available"}
                  </span>
                  {isSelected ? (
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#2563eb" }}>✓ Active</span>
                  ) : (
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Select</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
