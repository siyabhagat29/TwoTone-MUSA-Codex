import React, { useState, useMemo } from "react";
import {
  Layers3, Sparkles, AlertTriangle, RefreshCw, Loader2,
  Navigation, BrainCircuit, ShieldAlert, Wrench, BarChart3,
  MapPin, CheckCircle2, Filter
} from "lucide-react";

import { TeamTrackerHeader } from "./TeamTrackerHeader.jsx";
import { ResourceSummaryKpis } from "./ResourceSummaryKpis.jsx";
import { ResourceReadinessOverview } from "./ResourceReadinessOverview.jsx";
import { ResourceMap } from "./ResourceMap.jsx";
import { ResourceFilters } from "./ResourceFilters.jsx";
import { ResourceCardItem } from "./ResourceCardItem.jsx";
import { ResourceTableView } from "./ResourceTableView.jsx";
import { ResourceDetailDrawer } from "./ResourceDetailDrawer.jsx";
import { AiResourceRecommendation } from "./AiResourceRecommendation.jsx";
import { CoverageGapAnalysis } from "./CoverageGapAnalysis.jsx";
import { ResourceAssignmentModal } from "./ResourceAssignmentModal.jsx";
import { ResourceMaintenanceModal } from "./ResourceMaintenanceModal.jsx";
import { ResourceAnalytics } from "./ResourceAnalytics.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function TeamTrackerPage({
  resources = [],
  setResources,
  incidents = [],
  setIncidents,
  userLat = 19.132,
  userLng = 72.848,
  userLocationName = "Andheri / Mumbai Command Center",
  notify,
  onReload
}) {
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [simError, setSimError] = useState(null);
  const [lastGenMeta, setLastGenMeta] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Navigation Tabs: fleet, ai, coverage, maintenance, analytics
  const [activeTab, setActiveTab] = useState("fleet");

  // Drawer & Modal States
  const [selectedDrawerResource, setSelectedDrawerResource] = useState(null);
  const [assigningResource, setAssigningResource] = useState(null);
  const [assigningIncident, setAssigningIncident] = useState(null);
  const [maintenanceResource, setMaintenanceResource] = useState(null);

  // Trigger Dynamic Simulation generation via backend Maps API lookup
  const handleGenerateSimulations = async () => {
    setGenerating(true);
    setSimError(null);
    try {
      if (notify) notify("Generating emergency resource simulation...");
      const res = await fetch(`${API}/resources/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: userLat,
          longitude: userLng,
          radius_km: 6.0
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastGenMeta({
          simulation_id: data.simulation_id,
          count: data.count,
          facilities_count: data.facilities_count,
          categories_count: data.categories_count,
          center: data.center
        });
        if (typeof setResources === "function") {
          setResources(data.resources || []);
        }
        if (typeof onReload === "function") {
          onReload();
        }
        setLastUpdated(new Date().toISOString());
        if (notify) {
          notify(`Simulation generated: ${data.count} resources across ${data.facilities_count} nearby facilities in ${data.categories_count} categories.`);
        }
      } else {
        throw new Error(data?.error || "Unable to discover nearby facilities.");
      }
    } catch (err) {
      console.error("[Generate Simulations Error]:", err);
      setSimError(err.message || "Unable to discover nearby facilities.");
      if (notify) notify("Simulation generation failed: " + (err.message || "Maps API lookup failed"));
    } finally {
      setGenerating(false);
    }
  };

  // Clear simulated resource inventory
  const handleClearSimulation = async () => {
    setClearing(true);
    try {
      const res = await fetch(`${API}/resources/simulate`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear simulation");

      if (typeof setResources === "function") {
        setResources([]);
      }
      if (typeof onReload === "function") {
        onReload();
      }
      setLastGenMeta(null);
      setLastUpdated(new Date().toISOString());
      if (notify) notify("Resource simulation cleared successfully.");
    } catch (err) {
      if (notify) notify("Failed to clear simulation: " + err.message);
    } finally {
      setClearing(false);
    }
  };

  const simulationId = lastGenMeta?.simulation_id || resources[0]?.simulation_id;

  // Category counts
  const countsByCategory = useMemo(() => {
    const counts = { RESCUE: 0, MEDICAL: 0, FOOD: 0, WATER: 0, SHELTER: 0 };
    resources.forEach((r) => {
      const cat = (r.category || r.resource_type || "").toUpperCase();
      if (cat === "RESCUE" || cat === "FIRE") counts.RESCUE++;
      else if (cat === "MEDICAL" || cat === "HOSPITAL") counts.MEDICAL++;
      else if (cat === "FOOD" || cat === "NGO") counts.FOOD++;
      else if (cat === "WATER") counts.WATER++;
      else if (cat === "SHELTER") counts.SHELTER++;
    });
    return counts;
  }, [resources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const cat = (r.category || r.resource_type || "RESCUE").toUpperCase();
      if (categoryFilter !== "ALL") {
        if (categoryFilter === "RESCUE" && cat !== "RESCUE" && cat !== "FIRE") return false;
        if (categoryFilter === "MEDICAL" && cat !== "MEDICAL" && cat !== "HOSPITAL") return false;
        if (categoryFilter === "FOOD" && cat !== "FOOD" && cat !== "NGO") return false;
        if (categoryFilter === "WATER" && cat !== "WATER") return false;
        if (categoryFilter === "SHELTER" && cat !== "SHELTER") return false;
      }

      const status = (r.status || "AVAILABLE").toUpperCase();
      if (statusFilter !== "ALL") {
        if (statusFilter === "AVAILABLE" && (status !== "AVAILABLE" && status !== "READY")) return false;
        if (statusFilter === "LIMITED" && status !== "LIMITED") return false;
        if (statusFilter === "DEPLOYED" && (status !== "DEPLOYED" && status !== "ON-SITE" && status !== "ON_SCENE" && status !== "ALLOCATED" && status !== "DISPATCHED")) return false;
        if (statusFilter === "EN_ROUTE" && (status !== "EN_ROUTE" && status !== "EN ROUTE")) return false;
        if (statusFilter === "MAINTENANCE" && (status !== "MAINTENANCE" && r.maintenance?.status !== "Under Maintenance")) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (r.name || "").toLowerCase().includes(q);
        const matchAgency = (r.agency || r.station || "").toLowerCase().includes(q);
        const matchLoc = (r.base_location || r.address || "").toLowerCase().includes(q);
        const matchCap = (r.capacity || "").toLowerCase().includes(q);
        const matchCat = cat.toLowerCase().includes(q);
        const matchInc = (r.currentIncidentId || "").toLowerCase().includes(q);
        if (!matchName && !matchAgency && !matchLoc && !matchCap && !matchCat && !matchInc) return false;
      }
      return true;
    });
  }, [resources, categoryFilter, statusFilter, searchQuery]);

  // Handle local resource updates
  const handleUpdateResource = (updated) => {
    if (!updated || !setResources) return;
    setResources((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    if (selectedDrawerResource?.id === updated.id) {
      setSelectedDrawerResource(updated);
    }
  };

  // Handle Assignment success from modal or AI recommendation
  const handleAssignmentSuccess = (data) => {
    if (data.resource) {
      handleUpdateResource(data.resource);
    }
    if (typeof onReload === "function") {
      onReload();
    }
  };

  // Open assign modal from AI recommendation
  const handleAiConfirmAssignment = (resCandidate, incCandidate) => {
    setAssigningResource(resCandidate);
    setAssigningIncident(incCandidate);
  };

  const activeIncidentsCount = incidents.filter(
    (i) => i.status !== "Resolved" && i.status !== "RESOLVED" && i.status !== "Dispatched" && !i.dispatched
  ).length;

  return (
    <div className="content tt-container">
      {/* 1. Header */}
      <TeamTrackerHeader
        resources={resources}
        simulationId={simulationId}
        userLocationName={userLocationName}
        generating={generating}
        clearing={clearing}
        lastUpdated={lastUpdated}
        onGenerate={handleGenerateSimulations}
        onClear={handleClearSimulation}
        onRefresh={() => {
          if (onReload) onReload();
          setLastUpdated(new Date().toISOString());
        }}
      />

      {/* Generating Banner */}
      {generating && (
        <div style={{
          background: "#ffffff",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow: "0 2px 8px rgba(37, 99, 235, 0.06)"
        }}>
          <Loader2 size={22} style={{ color: "#2563eb", animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <div>
            <b style={{ fontSize: "14px", color: "#0B1B3A" }}>Discovering Real Municipal Facilities...</b>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "3px 0 0" }}>
              Querying Google Maps API for Fire Stations, Hospitals, Relief NGOs, and Emergency Shelters around {userLocationName}...
            </p>
          </div>
        </div>
      )}

      {/* Error State Banner */}
      {simError && !generating && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: "12px",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={18} style={{ color: "#dc2626" }} />
            <div>
              <b style={{ color: "#991b1b", fontSize: "13px" }}>{simError}</b>
              <div style={{ color: "#b91c1c", fontSize: "12px", marginTop: "2px" }}>
                Ensure your internet connection and Maps API key are active.
              </div>
            </div>
          </div>
          <button className="primary small" onClick={handleGenerateSimulations}>
            <RefreshCw size={12} /> Retry Simulation
          </button>
        </div>
      )}

      {/* 2. Resource Summary KPIs */}
      <ResourceSummaryKpis
        resources={resources}
        onSelectStatusFilter={(st) => {
          setStatusFilter(st);
          setActiveTab("fleet");
        }}
      />

      {/* 3. Resource Readiness Overview */}
      <ResourceReadinessOverview
        resources={resources}
        activeStatusFilter={statusFilter}
        onSelectStatusFilter={(st) => {
          setStatusFilter(st);
          setActiveTab("fleet");
        }}
      />

      {/* 4. Top Segmented Navigation Tabs */}
      <div className="tt-tab-nav">
        <button
          className={`tt-tab-btn ${activeTab === "fleet" ? "active" : ""}`}
          onClick={() => setActiveTab("fleet")}
        >
          <Navigation size={14} />
          <span>Fleet & Live Map</span>
          <span className="tt-tab-badge">{resources.length}</span>
        </button>

        <button
          className={`tt-tab-btn ${activeTab === "ai" ? "active" : ""}`}
          onClick={() => setActiveTab("ai")}
        >
          <BrainCircuit size={14} />
          <span>AI Dispatch & Allocation</span>
          {activeIncidentsCount > 0 && (
            <span className="tt-tab-badge" style={{ background: "#fee2e2", color: "#dc2626" }}>
              {activeIncidentsCount} active
            </span>
          )}
        </button>

        <button
          className={`tt-tab-btn ${activeTab === "coverage" ? "active" : ""}`}
          onClick={() => setActiveTab("coverage")}
        >
          <ShieldAlert size={14} />
          <span>Coverage Gaps</span>
          <span className="tt-tab-badge">Wards</span>
        </button>

        <button
          className={`tt-tab-btn ${activeTab === "maintenance" ? "active" : ""}`}
          onClick={() => setActiveTab("maintenance")}
        >
          <Wrench size={14} />
          <span>Fleet Maintenance</span>
        </button>

        <button
          className={`tt-tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          <BarChart3 size={14} />
          <span>Operational Analytics</span>
        </button>
      </div>

      {/* TAB CONTENT: TAB 1 (FLEET & LIVE MAP) */}
      {activeTab === "fleet" && (
        <>
          {/* Empty Inventory State */}
          {resources.length === 0 && !generating ? (
            <div className="resource-empty-state">
              <div className="resource-empty-icon">
                <Layers3 size={30} />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0B1B3A", marginBottom: "6px" }}>
                Emergency Resource Command Center
              </h2>
              <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "480px", marginBottom: "22px", lineHeight: "1.5" }}>
                The inventory is currently empty. Discover real nearby emergency facilities (Fire Stations, Hospitals, NGOs, Relief Shelters) from Google Maps around <b>{userLocationName}</b> and track live readiness.
              </p>
              <button
                className="primary"
                style={{ padding: "10px 22px", fontSize: "13px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "8px", background: "#0B1B3A", borderColor: "#0B1B3A" }}
                onClick={handleGenerateSimulations}
                disabled={generating}
              >
                <Sparkles size={16} />
                <span>Generate Simulations</span>
              </button>
            </div>
          ) : (
            <>
              {/* Interactive Live Resource Map */}
              <ResourceMap
                resources={resources}
                userLat={userLat}
                userLng={userLng}
                selectedResource={selectedDrawerResource}
                onSelectResource={(r) => setSelectedDrawerResource(r)}
                onAssignResource={(r) => {
                  setAssigningResource(r);
                  setAssigningIncident(null);
                }}
              />

              {/* Resource Filters & Search Bar */}
              <ResourceFilters
                totalCount={resources.length}
                filteredCount={filteredResources.length}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                viewMode={viewMode}
                setViewMode={setViewMode}
                countsByCategory={countsByCategory}
              />

              {/* Filter Results Empty State */}
              {filteredResources.length === 0 ? (
                <div style={{
                  padding: "40px",
                  textAlign: "center",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  margin: "10px 0"
                }}>
                  <Filter size={24} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#0B1B3A" }}>No matching resources found</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    No units match the selected category ("{categoryFilter}") or status filter ("{statusFilter}").
                  </div>
                  <button
                    className="ghost small"
                    style={{ marginTop: "12px" }}
                    onClick={() => {
                      setCategoryFilter("ALL");
                      setStatusFilter("ALL");
                      setSearchQuery("");
                    }}
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                /* GRID CARDS VIEW */
                <div className="resource-grid">
                  {filteredResources.map((r) => (
                    <ResourceCardItem
                      key={r.id}
                      team={r}
                      userLat={userLat}
                      userLng={userLng}
                      onSelect={(res) => setSelectedDrawerResource(res)}
                      onAssign={(res) => {
                        setAssigningResource(res);
                        setAssigningIncident(null);
                      }}
                    />
                  ))}
                </div>
              ) : (
                /* TABLE VIEW */
                <ResourceTableView
                  resources={filteredResources}
                  onSelectResource={(res) => setSelectedDrawerResource(res)}
                  onAssignResource={(res) => {
                    setAssigningResource(res);
                    setAssigningIncident(null);
                  }}
                />
              )}
            </>
          )}
        </>
      )}

      {/* TAB CONTENT: TAB 2 (AI DISPATCH & ALLOCATION) */}
      {activeTab === "ai" && (
        <AiResourceRecommendation
          incidents={incidents}
          resources={resources}
          onConfirmAssignment={handleAiConfirmAssignment}
          notify={notify}
        />
      )}

      {/* TAB CONTENT: TAB 3 (COVERAGE GAPS) */}
      {activeTab === "coverage" && (
        <CoverageGapAnalysis
          onFocusMapSector={() => setActiveTab("fleet")}
          onOpenAssignModal={(r) => {
            setAssigningResource(r);
            setAssigningIncident(null);
          }}
        />
      )}

      {/* TAB CONTENT: TAB 4 (FLEET MAINTENANCE) */}
      {activeTab === "maintenance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            boxShadow: "0 1px 3px rgba(11, 27, 58, 0.04)"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Wrench size={18} style={{ color: "#2563eb" }} />
                <b style={{ fontSize: "16px", color: "#0B1B3A" }}>Emergency Fleet Maintenance & Readiness Log</b>
              </div>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
                Track equipment inspection certifications, workshop servicing, and restricted deployment status.
              </p>
            </div>
          </div>

          <ResourceTableView
            resources={resources}
            onSelectResource={(res) => setSelectedDrawerResource(res)}
            onAssignResource={(res) => setMaintenanceResource(res)}
          />
        </div>
      )}

      {/* TAB CONTENT: TAB 5 (OPERATIONAL ANALYTICS) */}
      {activeTab === "analytics" && (
        <ResourceAnalytics resources={resources} />
      )}

      {/* 5. Resource Detail Drawer */}
      <ResourceDetailDrawer
        resource={selectedDrawerResource}
        isOpen={Boolean(selectedDrawerResource)}
        onClose={() => setSelectedDrawerResource(null)}
        onUpdateResource={handleUpdateResource}
        onOpenAssignModal={(r) => {
          setSelectedDrawerResource(null);
          setAssigningResource(r);
          setAssigningIncident(null);
        }}
        onOpenMaintenanceModal={(r) => {
          setSelectedDrawerResource(null);
          setMaintenanceResource(r);
        }}
        notify={notify}
      />

      {/* 6. Resource Assignment Modal */}
      <ResourceAssignmentModal
        resource={assigningResource}
        initialIncident={assigningIncident}
        incidents={incidents}
        isOpen={Boolean(assigningResource)}
        onClose={() => {
          setAssigningResource(null);
          setAssigningIncident(null);
        }}
        onAssignmentSuccess={handleAssignmentSuccess}
        notify={notify}
      />

      {/* 7. Resource Maintenance Modal */}
      <ResourceMaintenanceModal
        resource={maintenanceResource}
        isOpen={Boolean(maintenanceResource)}
        onClose={() => setMaintenanceResource(null)}
        onMaintenanceSuccess={(updated) => {
          handleUpdateResource(updated);
          if (notify) notify("Maintenance records updated successfully.");
        }}
        notify={notify}
      />
    </div>
  );
}
