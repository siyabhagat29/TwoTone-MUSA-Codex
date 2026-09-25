import React from "react";
import { Route, Navigation, Send, Loader2 } from "lucide-react";

export function RoutePreviewCard({
  incident,
  selectedResource,
  routeData,
  loadingRoute,
  onOpenConfirmModal,
  sending
}) {
  if (!incident || !selectedResource) return null;

  const isDispatched = incident.status === "Dispatched" || incident.dispatchProgress === "en_route";
  const isOnScene = incident.status === "On Scene" || incident.dispatchProgress === "on_scene";
  const isResolved = incident.status === "Resolved" || incident.status === "RESOLVED";

  const etaDisplay = isOnScene
    ? "0 min (On scene)"
    : routeData?.durationMin
    ? `${routeData.durationMin} min`
    : selectedResource?.etaText || "8–12 min";

  const distDisplay = routeData?.distanceKm != null
    ? `${routeData.distanceKm} km`
    : selectedResource?.distanceKm != null
    ? `${selectedResource.distanceKm} km`
    : "Nearby";

  return (
    <div style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Navigation size={15} style={{ color: "#2563eb" }} />
          <b style={{ fontSize: "12px", color: "#0B1B3A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Calculated Route Corridor & ETA
          </b>
        </div>
        <div style={{
          fontSize: "12px",
          fontWeight: "800",
          background: "#eff6ff",
          color: "#1d4ed8",
          padding: "3px 10px",
          borderRadius: "6px",
          border: "1px solid #bfdbfe"
        }}>
          ETA: {etaDisplay} • Distance: {distDisplay}
        </div>
      </div>

      <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
        Safest road corridor calculated from <b>{selectedResource.name}</b> to <b>{incident.address || incident.id}</b>.
      </div>

      {!isDispatched && !isOnScene && !isResolved && (
        <button
          className="primary"
          onClick={onOpenConfirmModal}
          disabled={sending}
          style={{
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: "700",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "#2563eb",
            borderColor: "#2563eb"
          }}
        >
          {sending ? (
            <>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              <span>Deploying Unit...</span>
            </>
          ) : (
            <>
              <Send size={15} />
              <span>Confirm & Dispatch {selectedResource.name ? selectedResource.name.split(" ")[0] : "Unit"}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
