import React from "react";
import { MapPin, ExternalLink, Eye, Send, Wrench } from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

export function ResourceTableView({
  resources = [],
  onSelectResource,
  onAssignResource
}) {
  return (
    <div style={{
      overflowX: "auto",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      boxShadow: "0 1px 3px rgba(11, 27, 58, 0.04)"
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
        <thead>
          <tr style={{
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            color: "#64748b",
            textTransform: "uppercase",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.5px"
          }}>
            <th style={{ padding: "12px 16px" }}>Resource</th>
            <th style={{ padding: "12px 16px" }}>Category</th>
            <th style={{ padding: "12px 16px" }}>Agency / Facility</th>
            <th style={{ padding: "12px 16px" }}>Available Qty</th>
            <th style={{ padding: "12px 16px" }}>Location</th>
            <th style={{ padding: "12px 16px" }}>Status</th>
            <th style={{ padding: "12px 16px" }}>Assignment</th>
            <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => {
            const cat = (r.category || r.resource_type || "RESCUE").toUpperCase();
            const catInfo = getAuthorityResourceCategory(r);
            const statusUpper = (r.status || "AVAILABLE").toUpperCase();
            const isAvail = statusUpper === "AVAILABLE" || statusUpper === "READY";
            const isLim = statusUpper === "LIMITED";
            const isEnRoute = statusUpper === "EN_ROUTE" || statusUpper === "EN ROUTE";
            const isMaint = statusUpper === "MAINTENANCE" || r.maintenance?.status === "Under Maintenance";

            let pillClass = "available";
            if (isLim) pillClass = "limited";
            else if (isEnRoute) pillClass = "en-route";
            else if (isMaint) pillClass = "maintenance";
            else if (!isAvail) pillClass = "deployed";

            const lat = Number(r.latitude ?? r.lat);
            const lng = Number(r.longitude ?? r.lng);
            const mapLink = (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0)
              ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
              : null;

            return (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}>
                {/* Resource Name */}
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>{r.emoji || catInfo.icon || "📦"}</span>
                    <div>
                      <b style={{ color: "#0B1B3A", fontSize: "13px" }}>{r.name}</b>
                      {r.capacity && <div style={{ fontSize: "11px", color: "#64748b" }}>{r.capacity}</div>}
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td style={{ padding: "12px 16px" }}>
                  <span className={`resource-badge-category ${cat.toLowerCase()}`}>{cat}</span>
                </td>

                {/* Facility */}
                <td style={{ padding: "12px 16px", color: "#334155", fontWeight: "600" }}>
                  {r.agency || r.station || "Disaster Command"}
                </td>

                {/* Available Quantity */}
                <td style={{ padding: "12px 16px" }}>
                  <b style={{ color: "#2563eb", fontSize: "13px" }}>
                    {r.availableQuantity != null
                      ? `${r.availableQuantity} ${r.unit || "Units"}`
                      : r.quantity != null
                      ? `${r.quantity} ${r.unit || "Units"}`
                      : "Operational"}
                  </b>
                </td>

                {/* Base Location */}
                <td style={{ padding: "12px 16px", color: "#64748b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={12} style={{ color: "#2563eb", flexShrink: 0 }} />
                    <span style={{ color: "#334155" }}>{r.base_location || r.address || r.station || "Real Facility"}</span>
                    {mapLink && (
                      <a href={mapLink} target="_blank" rel="noreferrer" style={{ color: "#2563eb", marginLeft: "4px" }} title="Open in Maps">
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td style={{ padding: "12px 16px" }}>
                  <span className={`resource-status-pill ${pillClass}`}>
                    {r.status || "AVAILABLE"}
                  </span>
                </td>

                {/* Assignment */}
                <td style={{ padding: "12px 16px" }}>
                  {r.currentIncidentId ? (
                    <span style={{ color: "#2563eb", fontWeight: "700", background: "#eff6ff", padding: "3px 8px", borderRadius: "4px" }}>
                      {r.currentIncidentId}
                    </span>
                  ) : isMaint ? (
                    <span style={{ color: "#dc2626", fontWeight: "600", fontSize: "11px" }}>
                      Maintenance
                    </span>
                  ) : (
                    <span style={{ color: "#16a34a", fontWeight: "600", fontSize: "11px" }}>
                      Ready
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "6px" }}>
                    <button
                      className="ghost small"
                      onClick={() => onSelectResource && onSelectResource(r)}
                      title="View Details"
                      style={{ padding: "4px 8px" }}
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      className="primary small"
                      onClick={() => onAssignResource && onAssignResource(r)}
                      title="Assign Resource"
                      style={{ padding: "4px 8px" }}
                    >
                      <Send size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
