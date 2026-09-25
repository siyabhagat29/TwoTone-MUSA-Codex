import React, { useState, useMemo } from "react";
import { Search, Filter, AlertOctagon, Flame, HeartPulse, Droplets, MapPin, Shield, CheckCircle2, ChevronRight } from "lucide-react";

export function IncidentQueue({
  incidents = [],
  selectedId,
  onSelectIncident,
  userLat = 19.132,
  userLng = 72.848
}) {
  const [filterStage, setFilterStage] = useState("all"); // all, critical, unassigned, en_route, on_scene, resolved
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("priority"); // priority, time, proximity

  // Distance helper
  const calcDist = (lat, lng) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
    const R = 6371;
    const dLat = ((lat - userLat) * Math.PI) / 180;
    const dLon = ((lng - userLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Filter & Sort
  const filteredList = useMemo(() => {
    let list = incidents.filter((i) => {
      const isResolved = i.status === "Resolved" || i.status === "RESOLVED";
      const isFalseAlarm = i.status === "False Alarm";
      const isEnRoute = i.status === "Dispatched" || i.dispatchProgress === "en_route";
      const isOnScene = i.status === "On Scene" || i.dispatchProgress === "on_scene";
      const isUnassigned = !isResolved && !isFalseAlarm && !isEnRoute && !isOnScene && !i.assignedTeam;
      const isCrit = (Number(i.severity) >= 80 || i.isSos) && !isResolved && !isFalseAlarm;

      if (filterStage === "critical") return isCrit;
      if (filterStage === "unassigned") return isUnassigned;
      if (filterStage === "en_route") return isEnRoute;
      if (filterStage === "on_scene") return isOnScene;
      if (filterStage === "resolved") return isResolved;
      // "all" shows active emergencies excluding false alarms
      return !isFalseAlarm;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => {
        const idMatch = (i.id || "").toLowerCase().includes(q);
        const addrMatch = (i.address || "").toLowerCase().includes(q);
        const repMatch = (i.reporter || "").toLowerCase().includes(q);
        const causeMatch = (i.cause || i.type || "").toLowerCase().includes(q);
        return idMatch || addrMatch || repMatch || causeMatch;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "priority") {
        const aCrit = a.isSos || a.severity >= 80 ? 1 : 0;
        const bCrit = b.isSos || b.severity >= 80 ? 1 : 0;
        if (aCrit !== bCrit) return bCrit - aCrit;
        return (Number(b.severity) || 0) - (Number(a.severity) || 0);
      }
      if (sortBy === "time") {
        return new Date(b.userTimestamp || b.createdAt || 0) - new Date(a.userTimestamp || a.createdAt || 0);
      }
      if (sortBy === "proximity") {
        const distA = calcDist(a.lat ?? a.liveLocation?.latitude, a.lng ?? a.liveLocation?.longitude) ?? 999;
        const distB = calcDist(b.lat ?? b.liveLocation?.latitude, b.lng ?? b.liveLocation?.longitude) ?? 999;
        return distA - distB;
      }
      return 0;
    });

    return list;
  }, [incidents, filterStage, searchQuery, sortBy, userLat, userLng]);

  const getPriorityInfo = (inc) => {
    const sev = Number(inc.severity) || 0;
    if (inc.isSos || sev >= 80) return { label: "Critical", class: "critical" };
    if (sev >= 60) return { label: "High", class: "high" };
    if (sev >= 30) return { label: "Medium", class: "medium" };
    return { label: "Low", class: "low" };
  };

  return (
    <div className="sd-panel" style={{ height: "calc(100vh - 200px)", minHeight: "560px" }}>
      {/* Panel Header */}
      <div className="sd-panel-header">
        <div>
          <b style={{ fontSize: "14px", color: "#0B1B3A" }}>Incident Queue</b>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            <b>{filteredList.length}</b> emergency events matching filters
          </div>
        </div>

        {/* Sort Selector */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "5px 10px",
            fontSize: "11px",
            fontWeight: "600",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#0f172a",
            cursor: "pointer"
          }}
        >
          <option value="priority">Sort: Highest Priority</option>
          <option value="time">Sort: Most Recent</option>
          <option value="proximity">Sort: Nearest to Datum</option>
        </select>
      </div>

      {/* Filter Chips Bar */}
      <div style={{
        padding: "8px 14px",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        gap: "6px",
        overflowX: "auto"
      }}>
        {[
          { key: "all", label: "All Active" },
          { key: "critical", label: "🚨 Critical / SOS" },
          { key: "unassigned", label: "Unassigned" },
          { key: "en_route", label: "En Route" },
          { key: "on_scene", label: "On Scene" },
          { key: "resolved", label: "Resolved" }
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilterStage(btn.key)}
            style={{
              padding: "4px 9px",
              fontSize: "11px",
              fontWeight: filterStage === btn.key ? "800" : "600",
              borderRadius: "6px",
              border: filterStage === btn.key ? "1px solid #0B1B3A" : "1px solid #cbd5e1",
              background: filterStage === btn.key ? "#0B1B3A" : "#f8fafc",
              color: filterStage === btn.key ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div style={{ padding: "8px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search by ID, address, or emergency type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 30px",
              fontSize: "12px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              boxSizing: "border-box",
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* Scrollable Incident Items List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredList.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
            No incidents found in this filter view.
          </div>
        ) : (
          filteredList.map((inc) => {
            const isSelected = selectedId === inc.id;
            const prio = getPriorityInfo(inc);
            const isDispatched = inc.status === "Dispatched" || inc.dispatchProgress === "en_route";
            const isOnScene = inc.status === "On Scene" || inc.dispatchProgress === "on_scene";
            const isResolved = inc.status === "Resolved" || inc.status === "RESOLVED";

            const lat = Number(inc.lat ?? inc.latitude ?? inc.liveLocation?.latitude);
            const lng = Number(inc.lng ?? inc.longitude ?? inc.liveLocation?.longitude);
            const dist = calcDist(lat, lng);

            return (
              <button
                key={inc.id}
                className={`sd-queue-item ${isSelected ? "active" : ""}`}
                onClick={() => onSelectIncident(inc.id)}
              >
                {/* Top Line: Priority badge, ID, Category, Severity */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className={`sd-priority-badge ${prio.class}`}>{prio.label}</span>
                    <b style={{ color: "#0B1B3A", fontSize: "13px" }}>{inc.id}</b>
                    {inc.isSos && (
                      <span style={{ fontSize: "10px", background: "#fee2e2", color: "#dc2626", padding: "1px 5px", borderRadius: "4px", fontWeight: "800" }}>
                        SOS
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: prio.class === "critical" ? "#dc2626" : "#475569" }}>
                    Sev: {inc.severity}/100
                  </div>
                </div>

                {/* Location / Address */}
                <div style={{ fontSize: "12px", color: "#334155", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {inc.address || "Mumbai Metropolitan Region"}
                </div>

                {/* Bottom Line: Status Pill, Assigned Unit, Distance */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: isResolved ? "#dcfce7" : isOnScene ? "#ecfdf5" : isDispatched ? "#fef3c7" : "#f1f5f9",
                      color: isResolved ? "#166534" : isOnScene ? "#047857" : isDispatched ? "#92400e" : "#475569"
                    }}>
                      {isResolved ? "Mitigated" : isOnScene ? "On Scene" : isDispatched ? "En Route" : "Triaged"}
                    </span>
                    {inc.assignedTeam && (
                      <span style={{ color: "#2563eb", fontWeight: "600", fontSize: "10px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🚒 {inc.assignedTeam}
                      </span>
                    )}
                  </div>

                  {dist != null && (
                    <span style={{ fontSize: "10px", color: "#64748b" }}>
                      📍 {dist} km
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
