import React, { useState } from "react";
import { Route as RouteIcon, MapPin, AlertOctagon, Check, X, Shield, Activity, Phone } from "lucide-react";
import { DispatchInteractiveMap } from "./DispatchInteractiveMap.jsx";
import { IncidentLifecycleTracker } from "./IncidentLifecycleTracker.jsx";
import { AiDispatchRecommendation } from "./AiDispatchRecommendation.jsx";
import { DynamicResourceSelector } from "./DynamicResourceSelector.jsx";
import { RoutePreviewCard } from "./RoutePreviewCard.jsx";
import { DispatchCommunicationNotes } from "./DispatchCommunicationNotes.jsx";
import { DuplicateIncidentAlert } from "./DuplicateIncidentAlert.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function IncidentDetailsPanel({
  incident,
  nearbyResources = [],
  selectedResource,
  onSelectResource,
  routeData,
  loadingRoute,
  searchRadius,
  setSearchRadius,
  activeCategory,
  setActiveCategory,
  loadingResources,
  errorResources,
  isOverride,
  setIsOverride,
  updatingProgress,
  onProgressStage,
  onOpenDispatchModal,
  onOpenEscalateModal,
  onReload,
  notify
}) {
  const [verifying, setVerifying] = useState(false);

  if (!incident) {
    return (
      <div className="sd-panel" style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
        <RouteIcon size={32} style={{ color: "#94a3b8", marginBottom: "8px" }} />
        <b style={{ fontSize: "14px", color: "#0B1B3A" }}>No Emergency Incident Selected</b>
        <p style={{ fontSize: "12px", margin: "4px 0 0" }}>Select an incident from the queue on the left to review telemetry and dispatch resources.</p>
      </div>
    );
  }

  const incLat = incident.lat != null ? Number(incident.lat) : (incident.liveLocation?.latitude != null ? Number(incident.liveLocation.latitude) : null);
  const incLng = incident.lng != null ? Number(incident.lng) : (incident.liveLocation?.longitude != null ? Number(incident.liveLocation.longitude) : null);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${API}/incidents/${incident.id}/verify`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to verify incident");
      if (notify) notify(`✓ Incident ${incident.id} marked as Verified.`);
      if (onReload) onReload();
    } catch (err) {
      if (notify) notify(`Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleFalseAlarm = async () => {
    if (!window.confirm(`Are you sure you want to mark ${incident.id} as a False Alarm?`)) return;
    try {
      const res = await fetch(`${API}/incidents/${incident.id}/false-alarm`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to update status");
      if (notify) notify(`Incident ${incident.id} flagged as False Alarm.`);
      if (onReload) onReload();
    } catch (err) {
      if (notify) notify(`Error: ${err.message}`);
    }
  };

  return (
    <div className="sd-panel" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Selected Incident Top Header Strip */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0B1B3A", margin: 0 }}>
              {incident.id}
            </h2>
            <span style={{
              fontSize: "11px",
              fontWeight: "700",
              padding: "2px 8px",
              borderRadius: "4px",
              background: incident.severity >= 80 ? "#fee2e2" : "#eff6ff",
              color: incident.severity >= 80 ? "#dc2626" : "#2563eb",
              border: incident.severity >= 80 ? "1px solid #fecaca" : "1px solid #bfdbfe"
            }}>
              Sev: {incident.severity}/100 {incident.isSos ? "🚨 SOS" : ""}
            </span>
            <span className={`status ${incident.status?.toLowerCase().replace(" ", "-")}`}>
              {incident.status || "Received"}
            </span>
          </div>

          <div style={{ fontSize: "13px", color: "#334155", fontWeight: "500", marginTop: "4px" }}>
            {incident.address || incident.zoneId}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Reporter: <b>{incident.reporter || "Citizen"}</b></span>
            <span>•</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <MapPin size={11} style={{ color: "#2563eb" }} />
              {incLat != null && incLng != null ? `${incLat.toFixed(5)}, ${incLng.toFixed(5)}` : "GPS unavailable"}
            </span>
          </div>
        </div>

        {/* Quick Triage Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            className="ghost small"
            onClick={onOpenEscalateModal}
            style={{ color: "#dc2626", borderColor: "#fecaca", background: "#fff5f5" }}
            title="Escalate incident priority"
          >
            <AlertOctagon size={12} />
            <span>Escalate</span>
          </button>

          {!incident.verified && incident.status !== "Resolved" && (
            <button
              className="ghost small"
              onClick={handleVerify}
              disabled={verifying}
              title="Mark incident verified by dispatch authority"
            >
              <Check size={12} />
              <span>Verify</span>
            </button>
          )}

          {incident.status !== "Resolved" && (
            <button
              className="ghost small"
              onClick={handleFalseAlarm}
              style={{ color: "#64748b" }}
              title="Flag as false alarm"
            >
              <X size={12} />
              <span>False Alarm</span>
            </button>
          )}
        </div>
      </div>

      {/* Duplicate Incident Warning Alert */}
      <DuplicateIncidentAlert
        incident={incident}
        onMergeSuccess={onReload}
        notify={notify}
      />

      {/* Multi-Stage Dispatch Lifecycle Tracker */}
      <IncidentLifecycleTracker
        incident={incident}
        updatingProgress={updatingProgress}
        onProgressStage={onProgressStage}
        onOpenDispatchModal={onOpenDispatchModal}
      />

      {/* Interactive Map & Route Preview */}
      <DispatchInteractiveMap
        incident={incident}
        nearbyResources={nearbyResources}
        selectedResource={selectedResource}
        routeData={routeData}
        loadingRoute={loadingRoute}
        onSelectResource={onSelectResource}
      />

      {/* AI Recommendation Module */}
      <AiDispatchRecommendation
        incident={incident}
        selectedResource={selectedResource}
        onSelectResource={onSelectResource}
      />

      {/* Dynamic Resource Selector with Conflict Warning */}
      <DynamicResourceSelector
        incident={incident}
        nearbyResources={nearbyResources}
        selectedResource={selectedResource}
        onSelectResource={onSelectResource}
        searchRadius={searchRadius}
        setSearchRadius={setSearchRadius}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        loadingResources={loadingResources}
        errorResources={errorResources}
        isOverride={isOverride}
        setIsOverride={setIsOverride}
      />

      {/* Route & Primary Dispatch Action Card */}
      {selectedResource && (
        <RoutePreviewCard
          incident={incident}
          selectedResource={selectedResource}
          routeData={routeData}
          loadingRoute={loadingRoute}
          onOpenConfirmModal={onOpenDispatchModal}
          sending={false}
        />
      )}

      {/* Dispatch Communication & Field Notes */}
      <DispatchCommunicationNotes
        incident={incident}
        onNoteAdded={onReload}
        notify={notify}
      />
    </div>
  );
}
