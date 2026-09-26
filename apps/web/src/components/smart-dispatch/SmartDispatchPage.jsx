import React, { useState, useEffect } from "react";
import { SmartDispatchHeader } from "./SmartDispatchHeader.jsx";
import { IncidentQueue } from "./IncidentQueue.jsx";
import { IncidentDetailsPanel } from "./IncidentDetailsPanel.jsx";
import { DispatchConfirmationModal } from "./DispatchConfirmationModal.jsx";
import { EmergencyEscalationModal } from "./EmergencyEscalationModal.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function SmartDispatchPage({
  incidents = [],
  resources = [],
  setIncidents,
  setResources,
  setAlerts,
  userLat = 19.132,
  userLng = 72.848,
  notify,
  onReload,
  onAutoDispatch
}) {
  const [selectedId, setSelectedId] = useState(incidents[0]?.id || null);
  const [searchRadius, setSearchRadius] = useState(5);
  const [activeCategory, setActiveCategory] = useState("all");

  const [nearbyResources, setNearbyResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [errorResources, setErrorResources] = useState(null);

  const [selectedResource, setSelectedResource] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const [isOverride, setIsOverride] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [loading, setLoading] = useState(false);

  // Keep selectedId valid
  useEffect(() => {
    if (incidents.length > 0 && !incidents.some((i) => i.id === selectedId)) {
      setSelectedId(incidents[0].id);
    }
  }, [incidents, selectedId]);

  const selectedIncident = incidents.find((i) => i.id === selectedId) || incidents[0] || null;

  const incLat = selectedIncident?.lat != null ? Number(selectedIncident.lat) : (selectedIncident?.liveLocation?.latitude != null ? Number(selectedIncident.liveLocation.latitude) : null);
  const incLng = selectedIncident?.lng != null ? Number(selectedIncident.lng) : (selectedIncident?.liveLocation?.longitude != null ? Number(selectedIncident.liveLocation.longitude) : null);

  // 1. Dynamic Nearby Resource Discovery
  useEffect(() => {
    if (!selectedIncident) {
      setNearbyResources([]);
      setSelectedResource(null);
      return;
    }

    if (incLat == null || incLng == null || isNaN(incLat) || isNaN(incLng) || incLat === 0 || incLng === 0) {
      setNearbyResources([]);
      setSelectedResource(null);
      setErrorResources("Incident location unavailable. No valid GPS coordinates for this incident.");
      return;
    }

    let isMounted = true;
    setLoadingResources(true);
    setErrorResources(null);

    fetch(`${API}/incidents/${selectedIncident.id}/nearby-resources?radius_km=${searchRadius}&category=${activeCategory}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load nearby resources");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const resList = data.resources || [];
        setNearbyResources(resList);

        if (resList.length > 0) {
          const matched = selectedIncident.assignedTeam
            ? resList.find((r) => r.name === selectedIncident.assignedTeam) || resList[0]
            : resList[0];
          setSelectedResource(matched);
        } else {
          setSelectedResource(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorResources(err.message);
        setNearbyResources([]);
        setSelectedResource(null);
      })
      .finally(() => {
        if (isMounted) setLoadingResources(false);
      });

    return () => { isMounted = false; };
  }, [selectedIncident?.id, incLat, incLng, searchRadius, activeCategory]);

  // 2. Real Road Routing Calculation
  useEffect(() => {
    if (!selectedResource || !selectedResource.lat || !selectedResource.lng || incLat == null || incLng == null) {
      setRouteData(null);
      return;
    }

    let isMounted = true;
    setLoadingRoute(true);

    fetch(`${API}/route?fromLat=${selectedResource.lat}&fromLng=${selectedResource.lng}&toLat=${incLat}&toLng=${incLng}`)
      .then((res) => {
        if (!res.ok) throw new Error("Route calculation error");
        return res.json();
      })
      .then((route) => {
        if (!isMounted) return;
        if (route && route.success) {
          setRouteData(route);
        } else {
          setRouteData(null);
        }
      })
      .catch(() => {
        if (isMounted) setRouteData(null);
      })
      .finally(() => {
        if (isMounted) setLoadingRoute(false);
      });

    return () => { isMounted = false; };
  }, [selectedResource?.id, selectedResource?.lat, selectedResource?.lng, incLat, incLng]);

  // Handle Lifecycle progression
  const handleProgressStage = async (stage) => {
    if (!selectedIncident) return;
    setUpdatingProgress(true);
    try {
      if (stage === "resolved") {
        if (typeof setIncidents === "function") {
          setIncidents((prev) => prev.filter((i) => i.id !== selectedIncident.id && i.sosId !== selectedIncident.id));
        }
        if (typeof setAlerts === "function") {
          setAlerts((prev) => prev.filter((a) => a.incidentId !== selectedIncident.id && a.sosId !== selectedIncident.id && a.id !== selectedIncident.id));
        }
        if (selectedIncident.assignedTeam && typeof setResources === "function") {
          setResources((prev) => prev.map((r) => r.name === selectedIncident.assignedTeam || r.id === selectedIncident.assignedTeamId ? { ...r, status: "AVAILABLE", currentIncidentId: null } : r));
        }

        const res = await fetch(`${API}/incidents/${selectedIncident.id}/resolve`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to resolve incident");
        if (notify) notify(`✓ Incident ${selectedIncident.id} marked as Fully Resolved.`);
      } else {
        const isReached = stage === "on_scene" || stage === "reached";
        if (typeof setIncidents === "function") {
          setIncidents((prev) => prev.map((i) => {
            if (i.id === selectedIncident.id) {
              const origSev = i.originalSeverity || i.severity || 85;
              return {
                ...i,
                dispatchProgress: stage,
                status: isReached ? "On Scene" : "Dispatched",
                mitigationStatus: isReached ? "Squad On Scene / Operating" : "Resource Allocated",
                originalSeverity: origSev,
                severity: isReached ? Math.max(10, Math.round(Number(origSev) * 0.20)) : i.severity
              };
            }
            return i;
          }));
        }
        if (selectedIncident.assignedTeam && typeof setResources === "function") {
          setResources((prev) => prev.map((r) => r.name === selectedIncident.assignedTeam || r.id === selectedIncident.assignedTeamId ? { ...r, status: isReached ? "On scene" : "En route" } : r));
        }

        const res = await fetch(`${API}/incidents/${selectedIncident.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage })
        });
        if (!res.ok) throw new Error("Failed to update stage");
        if (stage === "on_scene") {
          if (notify) notify(`✓ Squad marked as On Scene at ${selectedIncident.id}.`);
        } else if (stage === "en_route") {
          if (notify) notify(`↺ Squad marked as En Route to ${selectedIncident.id}.`);
        }
      }
      if (onReload) onReload();
    } catch (err) {
      if (notify) notify(`Status update notice: ${err.message}`);
      if (onReload) onReload();
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    if (onReload) await onReload();
    setLoading(false);
  };

  return (
    <div className="content sd-container">
      {/* 1. Header with Live Status & Metric Strip */}
      <SmartDispatchHeader
        incidents={incidents}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* 2. Responsive Command Center Two-Column Layout */}
      <div className="sd-grid-layout">
        {/* Left Column: Prioritized Incident Queue */}
        <IncidentQueue
          incidents={incidents}
          selectedId={selectedId}
          onSelectIncident={(id) => setSelectedId(id)}
          userLat={userLat}
          userLng={userLng}
        />

        {/* Right Column: Selected Incident Workspace & Dispatch Coordination */}
        <IncidentDetailsPanel
          incident={selectedIncident}
          nearbyResources={nearbyResources}
          selectedResource={selectedResource}
          onSelectResource={(r) => setSelectedResource(r)}
          routeData={routeData}
          loadingRoute={loadingRoute}
          searchRadius={searchRadius}
          setSearchRadius={setSearchRadius}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          loadingResources={loadingResources}
          errorResources={errorResources}
          isOverride={isOverride}
          setIsOverride={setIsOverride}
          updatingProgress={updatingProgress}
          onProgressStage={handleProgressStage}
          onOpenDispatchModal={() => setShowDispatchModal(true)}
          onOpenEscalateModal={() => setShowEscalateModal(true)}
          onReload={onReload}
          notify={notify}
        />
      </div>

      {/* 3. Dispatch Confirmation Modal */}
      <DispatchConfirmationModal
        incident={selectedIncident}
        selectedResource={selectedResource}
        routeData={routeData}
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        onDispatchSuccess={(data) => {
          if (typeof setIncidents === "function" && selectedIncident) {
            if (data?.incident) {
              setIncidents((prev) => [data.incident, ...prev.filter((i) => i.id !== data.incident.id)]);
            } else {
              setIncidents((prev) => prev.map((i) => {
                if (i.id === selectedIncident.id) {
                  const origSev = i.originalSeverity || i.severity || 85;
                  return {
                    ...i,
                    status: "Dispatched",
                    dispatched: true,
                    assignedTeam: selectedResource?.name,
                    assignedTeamId: selectedResource?.id,
                    mitigationStatus: "Resource Allocated",
                    originalSeverity: origSev,
                    severity: Math.max(15, Math.round(Number(origSev) * 0.35))
                  };
                }
                return i;
              }));
            }
          }
          if (typeof setAlerts === "function" && selectedIncident) {
            setAlerts((prev) => prev.filter((a) => a.incidentId !== selectedIncident.id && a.sosId !== selectedIncident.id && a.id !== selectedIncident.id));
          }
          if (typeof setResources === "function" && selectedResource) {
            setResources((prev) => prev.map((r) => r.id === selectedResource.id ? { ...r, status: "En route", currentIncidentId: selectedIncident?.id } : r));
          }
          if (onReload) onReload();
        }}
        notify={notify}
      />

      {/* 4. Emergency Escalation Modal */}
      <EmergencyEscalationModal
        incident={selectedIncident}
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        onEscalationSuccess={(escInc) => {
          if (escInc && typeof setIncidents === "function") {
            setIncidents((prev) => [escInc, ...prev.filter((i) => i.id !== escInc.id)]);
          }
          if (onReload) onReload();
        }}
        notify={notify}
      />
    </div>
  );
}
