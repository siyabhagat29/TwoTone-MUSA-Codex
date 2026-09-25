import React from "react";
import { Building2, MapPin, ExternalLink, Shield, Send, Eye, Wrench } from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

export function ResourceCardItem({
  team,
  userLat,
  userLng,
  onSelect,
  onAssign
}) {
  const statusUpper = (team.status || "AVAILABLE").toUpperCase();
  const isAvailable = statusUpper === "AVAILABLE" || statusUpper === "READY";
  const isLimited = statusUpper === "LIMITED";
  const isEnRoute = statusUpper === "EN_ROUTE" || statusUpper === "EN ROUTE";
  const isDispatched = statusUpper === "DISPATCHED" || statusUpper === "ALLOCATED";
  const isDeployed = statusUpper === "DEPLOYED" || statusUpper === "ON-SITE" || statusUpper === "ON_SCENE";
  const isMaint = statusUpper === "MAINTENANCE" || team.maintenance?.status === "Under Maintenance";

  let statusClass = "available";
  if (isLimited) statusClass = "limited";
  else if (isEnRoute) statusClass = "en-route";
  else if (isDispatched || isDeployed) statusClass = "deployed";
  else if (isMaint) statusClass = "maintenance";

  const category = (team.category || team.resource_type || "RESCUE").toUpperCase();
  const categoryLower = category.toLowerCase();
  const catInfo = getAuthorityResourceCategory(team);

  const lat = Number(team.latitude ?? team.lat);
  const lng = Number(team.longitude ?? team.lng);
  const mapLink = (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0)
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;

  return (
    <div className="resource-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {/* Header: Icon, Name, Category badge, Status */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0 }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "19px",
              flexShrink: 0
            }}>
              {team.emoji || catInfo.icon || "📦"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <b style={{ fontSize: "14px", color: "#0B1B3A", wordBreak: "break-word" }}>{team.name}</b>
                <span className={`resource-badge-category ${categoryLower}`}>{category}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                <Building2 size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {team.agency || team.station || "Emergency Response Depot"}
                </span>
              </div>
            </div>
          </div>
          <span className={`resource-status-pill ${statusClass}`}>{team.status}</span>
        </div>

        {/* Quantity & Capacity Display */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#f8fafc",
          padding: "10px 12px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "10px"
        }}>
          <div>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>
              Available Quantity
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>
              {team.availableQuantity != null
                ? `${team.availableQuantity} ${team.unit || "Units"}`
                : team.quantity != null
                ? `${team.quantity} ${team.unit || "Units"}`
                : (team.capacity || "Operational")}
            </div>
          </div>
          {team.capacity && (
            <div style={{ textAlign: "right", maxWidth: "160px" }}>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Capacity</div>
              <div style={{ fontSize: "11px", color: "#334155", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {team.capacity}
              </div>
            </div>
          )}
        </div>

        {/* Location & Map Link */}
        <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <MapPin size={12} style={{ color: "#2563eb", flexShrink: 0 }} />
              <span style={{ color: "#334155", fontWeight: "500" }}>{team.base_location || team.address || team.station || "Real Facility"}</span>
            </div>
            {mapLink && (
              <a
                href={mapLink}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#2563eb", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", fontWeight: "600", textDecoration: "none", flexShrink: 0 }}
                title="Open in Google Maps"
              >
                Maps <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Current Incident / Assignment */}
        <div style={{ fontSize: "11px", color: "#64748b", padding: "6px 0", borderTop: "1px solid #f1f5f9" }}>
          {team.currentIncidentId ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#2563eb", fontWeight: "700" }}>Assigned: {team.currentIncidentId}</span>
              {team.eta && <span style={{ color: "#7e22ce", fontWeight: "600" }}>ETA: {team.eta}</span>}
            </div>
          ) : isMaint ? (
            <span style={{ color: "#dc2626", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Wrench size={11} /> Under Maintenance
            </span>
          ) : (
            <span style={{ color: "#16a34a", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              ● Ready for Tasking
            </span>
          )}
        </div>
      </div>

      {/* Card Action Buttons */}
      <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "12px", marginTop: "6px" }}>
        <button
          className="ghost small"
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
          onClick={() => onSelect && onSelect(team)}
          title="Open complete telemetry and history drawer"
        >
          <Eye size={12} />
          <span>View Details</span>
        </button>
        <button
          className="primary small"
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            background: isMaint ? "#94a3b8" : "#2563eb",
            borderColor: isMaint ? "#94a3b8" : "#2563eb"
          }}
          onClick={() => onAssign && onAssign(team)}
          title="Dispatch or reassign to an incident"
        >
          <Send size={12} />
          <span>Assign</span>
        </button>
      </div>
    </div>
  );
}
