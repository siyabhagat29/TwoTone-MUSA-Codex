import React, { useState, useEffect } from "react";
import DrainageHeader from "./DrainageHeader.jsx";
import DrainageMetricsStrip from "./DrainageMetricsStrip.jsx";
import DrainageTabsNav from "./DrainageTabsNav.jsx";
import DrainageInteractiveMap from "./DrainageInteractiveMap.jsx";
import HotspotCardsList from "./HotspotCardsList.jsx";
import HotspotDetailDrawer from "./HotspotDetailDrawer.jsx";
import WorkOrderList from "./WorkOrderList.jsx";
import CreateWorkOrderModal from "./CreateWorkOrderModal.jsx";
import AiRootCausePanel from "./AiRootCausePanel.jsx";
import OutfallCorridorPanel from "./OutfallCorridorPanel.jsx";
import RainfallSimulationPanel from "./RainfallSimulationPanel.jsx";
import DrainageAnalytics from "./DrainageAnalytics.jsx";

const API = "http://localhost:5001/api";

export default function DrainageIntelligencePage({
  zones = [],
  incidents = [],
  chronicBlockages = [],
  notify,
  onGenerateReport
}) {
  const [hotspots, setHotspots] = useState(chronicBlockages || []);
  const [workOrders, setWorkOrders] = useState([]);
  const [outfalls, setOutfalls] = useState([]);
  const [evidenceClusters, setEvidenceClusters] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [activeTab, setActiveTab] = useState("hotspots");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalInitialHotspot, setModalInitialHotspot] = useState(null);
  const [wardFilter, setWardFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Initial Fetch & Refresh
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [hRes, wRes, oRes, eRes] = await Promise.all([
        fetch(`${API}/chronic-blockages`).catch(() => null),
        fetch(`${API}/chronic-blockages/work-orders`).catch(() => null),
        fetch(`${API}/chronic-blockages/outfalls`).catch(() => null),
        fetch(`${API}/chronic-blockages/evidence`).catch(() => null)
      ]);

      if (hRes && hRes.ok) {
        const data = await hRes.json();
        if (Array.isArray(data) && data.length) setHotspots(data);
      }
      if (wRes && wRes.ok) {
        const data = await wRes.json();
        if (Array.isArray(data)) setWorkOrders(data);
      }
      if (oRes && oRes.ok) {
        const data = await oRes.json();
        if (Array.isArray(data)) setOutfalls(data);
      }
      if (eRes && eRes.ok) {
        const data = await eRes.json();
        if (Array.isArray(data)) setEvidenceClusters(data);
      }
    } catch (err) {
      console.warn("Could not fetch latest drainage intelligence data:", err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update hotspots if props change
  useEffect(() => {
    if (chronicBlockages?.length && (!hotspots || hotspots.length === 0)) {
      setHotspots(chronicBlockages);
    }
  }, [chronicBlockages]);

  // Actions
  const handleSelectHotspot = (hotspot) => {
    setSelectedHotspot(hotspot);
  };

  const handleSelectHotspotById = (id) => {
    const found = hotspots.find((h) => h.id === id);
    if (found) {
      setSelectedHotspot(found);
      setActiveTab("hotspots");
    }
  };

  const handleCloseDrawer = () => {
    setSelectedHotspot(null);
  };

  const handleOpenCreateModal = (hotspot = null) => {
    setModalInitialHotspot(hotspot || selectedHotspot || null);
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setModalInitialHotspot(null);
  };

  const handleSubmitWorkOrder = async (orderData) => {
    try {
      const res = await fetch(`${API}/chronic-blockages/work-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        const result = await res.json();
        if (result.workOrder) {
          setWorkOrders((prev) => [result.workOrder, ...prev]);
        }
        // Update target hotspot status
        setHotspots((prev) =>
          prev.map((h) =>
            h.id === orderData.hotspotId ? { ...h, status: "Work Order Created" } : h
          )
        );
        if (selectedHotspot && selectedHotspot.id === orderData.hotspotId) {
          setSelectedHotspot((prev) => ({ ...prev, status: "Work Order Created" }));
        }
        if (notify) notify(`Desilting work order ${result.workOrder?.id || ""} created successfully.`);
        fetchData();
      }
    } catch (err) {
      if (notify) notify("Failed to create work order: " + err.message);
    }
  };

  const handleUpdateWorkOrderStatus = async (orderId, updates) => {
    try {
      const res = await fetch(`${API}/chronic-blockages/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const result = await res.json();
        setWorkOrders((prev) =>
          prev.map((w) => (w.id === orderId ? { ...w, ...updates } : w))
        );
        if (notify) notify(`Work order ${orderId} updated to ${updates.status}.`);
        fetchData();
      }
    } catch (err) {
      if (notify) notify("Error updating work order: " + err.message);
    }
  };

  const handleUpdateHotspot = async (hotspotId, updates) => {
    try {
      const res = await fetch(`${API}/chronic-blockages/${hotspotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const result = await res.json();
        setHotspots((prev) =>
          prev.map((h) => (h.id === hotspotId ? { ...h, ...updates } : h))
        );
        if (selectedHotspot && selectedHotspot.id === hotspotId) {
          setSelectedHotspot((prev) => ({ ...prev, ...updates }));
        }
        if (notify) notify(`Hotspot ${hotspotId} status updated.`);
      }
    } catch (err) {
      if (notify) notify("Error updating hotspot: " + err.message);
    }
  };

  const handleUpdateOutfall = async (outfallId, updates) => {
    try {
      const res = await fetch(`${API}/chronic-blockages/outfalls/${outfallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setOutfalls((prev) =>
          prev.map((o) => (o.id === outfallId ? { ...o, ...updates } : o))
        );
        if (notify) notify(`Outfall ${outfallId} updated.`);
      }
    } catch (err) {
      if (notify) notify("Error updating outfall: " + err.message);
    }
  };

  const handleVerifyEvidence = async (evidenceId, status) => {
    try {
      const res = await fetch(`${API}/chronic-blockages/evidence/${evidenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewer: "Municipal Drainage Desk" })
      });
      if (res.ok) {
        setEvidenceClusters((prev) =>
          prev.map((e) => (e.id === evidenceId ? { ...e, status, humanReviewedBy: "Municipal Drainage Desk" } : e))
        );
        if (notify) notify(`Evidence ${evidenceId} marked as ${status}.`);
      }
    } catch (err) {
      if (notify) notify("Error verifying evidence: " + err.message);
    }
  };

  const handleExportReport = () => {
    if (onGenerateReport) {
      onGenerateReport();
    } else {
      window.open(`${API}/chronic-blockages/report`, "_blank");
      if (notify) notify("Opening BMC Desilting Directives report...");
    }
  };

  return (
    <div className="di-container">
      {/* 1. Header */}
      <DrainageHeader
        onRefresh={fetchData}
        onExportReport={handleExportReport}
        onCreateWorkOrder={() => handleOpenCreateModal()}
        refreshing={refreshing}
      />

      {/* 2. Top Metric Strip */}
      <DrainageMetricsStrip
        hotspots={hotspots}
        workOrders={workOrders}
        outfalls={outfalls}
        activeFilter="all"
        onSelectFilter={() => {}}
      />

      {/* 3. Segmented Navigation Tabs */}
      <DrainageTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          hotspots: hotspots.length,
          workOrders: workOrders.filter((w) => w.status !== "Completed").length,
          evidence: evidenceClusters.length,
          outfalls: outfalls.length
        }}
      />

      {/* 4. Active Tab Content */}
      {activeTab === "hotspots" && (
        <div className="di-main-grid">
          {/* GIS Interactive Map */}
          <DrainageInteractiveMap
            hotspots={hotspots}
            workOrders={workOrders}
            outfalls={outfalls}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={handleSelectHotspot}
            onCreateWorkOrderForHotspot={handleOpenCreateModal}
            wardFilter={wardFilter}
            onWardFilterChange={setWardFilter}
          />

          {/* Hotspot Cards List */}
          <HotspotCardsList
            hotspots={hotspots}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={handleSelectHotspot}
            onCreateWorkOrder={handleOpenCreateModal}
          />
        </div>
      )}

      {activeTab === "work-orders" && (
        <WorkOrderList
          workOrders={workOrders}
          onCreateWorkOrder={() => handleOpenCreateModal()}
          onUpdateStatus={handleUpdateWorkOrderStatus}
          onSelectHotspotById={handleSelectHotspotById}
        />
      )}

      {activeTab === "evidence" && (
        <AiRootCausePanel
          evidenceClusters={evidenceClusters}
          hotspots={hotspots}
          onVerifyEvidence={handleVerifyEvidence}
          onSelectHotspotById={handleSelectHotspotById}
        />
      )}

      {activeTab === "outfalls" && (
        <OutfallCorridorPanel
          outfalls={outfalls}
          onUpdateOutfall={handleUpdateOutfall}
          onSelectHotspotById={handleSelectHotspotById}
        />
      )}

      {activeTab === "simulation" && (
        <RainfallSimulationPanel
          hotspots={hotspots}
          onSelectHotspotById={handleSelectHotspotById}
        />
      )}

      {activeTab === "analytics" && (
        <DrainageAnalytics
          hotspots={hotspots}
          workOrders={workOrders}
        />
      )}

      {/* 5. Hotspot Detail Drawer */}
      {selectedHotspot && (
        <HotspotDetailDrawer
          hotspot={selectedHotspot}
          onClose={handleCloseDrawer}
          onCreateWorkOrder={handleOpenCreateModal}
          onUpdateStatus={handleUpdateHotspot}
          workOrders={workOrders}
        />
      )}

      {/* 6. Work Order Creation Modal */}
      {createModalOpen && (
        <CreateWorkOrderModal
          hotspots={hotspots}
          initialHotspot={modalInitialHotspot}
          onClose={handleCloseCreateModal}
          onSubmit={handleSubmitWorkOrder}
        />
      )}
    </div>
  );
}
