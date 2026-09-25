import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, Crosshair, MapPin, Wrench, Waves, Eye } from "lucide-react";

export default function DrainageInteractiveMap({
  hotspots = [],
  workOrders = [],
  outfalls = [],
  selectedHotspot,
  onSelectHotspot,
  onCreateWorkOrderForHotspot,
  wardFilter = "all",
  onWardFilterChange
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const [showHotspots, setShowHotspots] = useState(true);
  const [showWorkOrders, setShowWorkOrders] = useState(true);
  const [showOutfalls, setShowOutfalls] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [19.128, 72.848],
      zoom: 13,
      zoomControl: true
    });

    const GOOGLE_MAPS_KEY =
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyA5U1kvO3XeQxEGkQfuNyiMBvcik27VvKQ";

    L.tileLayer(
      `https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`,
      {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a> | VarshaRaksha SWD'
      }
    ).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    lg.clearLayers();

    // Filter by ward if selected
    const filterWard = (item) => {
      if (wardFilter === "all") return true;
      return (item.ward || "").toLowerCase().includes(wardFilter.toLowerCase());
    };

    // 1. Chronic Hotspots
    if (showHotspots) {
      hotspots.filter(filterWard).forEach((h) => {
        if (!h.lat || !h.lng) return;
        const isSelected = selectedHotspot?.id === h.id;
        const score = h.riskScore || 50;
        const color = score >= 75 ? "#dc2626" : score >= 50 ? "#ea580c" : score >= 35 ? "#d97706" : "#16a34a";

        // Risk Zone Buffer Circle
        if (showRiskZones && score >= 50) {
          const circleRadius = score >= 75 ? 320 : 200;
          L.circle([h.lat, h.lng], {
            radius: circleRadius,
            color: color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 1.5,
            dashArray: "4, 6"
          }).addTo(lg);
        }

        const iconHtml = `
          <div style="
            width: ${isSelected ? "34px" : "26px"};
            height: ${isSelected ? "34px" : "26px"};
            background: ${color};
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s;
            ${isSelected ? "transform: scale(1.15); outline: 3px solid #2563eb;" : ""}
          ">
            ${h.id.replace("BLK-0", "").replace("BLK-", "")}
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-hotspot-pin",
          iconSize: isSelected ? [34, 34] : [26, 26],
          iconAnchor: isSelected ? [17, 17] : [13, 13]
        });

        const marker = L.marker([h.lat, h.lng], { icon: customIcon }).addTo(lg);

        marker.on("click", () => {
          onSelectHotspot(h);
        });

        const popupContent = document.createElement("div");
        popupContent.style.fontFamily = "inherit";
        popupContent.style.minWidth = "220px";
        popupContent.innerHTML = `
          <div style="font-weight: 700; color: #0b1f41; font-size: 13px; margin-bottom: 2px;">${h.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${h.ward} · <b>${h.id}</b></div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
            <span>Risk Score: <b style="color: ${color};">${score}/100</b></span>
            <span>Flagged: <b>${h.flagCount}x</b></span>
          </div>
          <div style="font-size: 11px; color: #334155; background: #f8fafc; padding: 4px 6px; border-radius: 4px; margin-bottom: 8px;">
            ${h.primaryCause}
          </div>
          <div style="display: flex; gap: 6px;">
            <button id="btn-popup-inspect-${h.id}" style="
              flex: 1; background: #2563eb; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer;
            ">Inspect</button>
            <button id="btn-popup-order-${h.id}" style="
              flex: 1; background: #0f172a; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer;
            ">+ Work Order</button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on("popupopen", () => {
          const btnInspect = document.getElementById(`btn-popup-inspect-${h.id}`);
          if (btnInspect) {
            btnInspect.onclick = () => onSelectHotspot(h);
          }
          const btnOrder = document.getElementById(`btn-popup-order-${h.id}`);
          if (btnOrder) {
            btnOrder.onclick = () => {
              if (onCreateWorkOrderForHotspot) onCreateWorkOrderForHotspot(h);
            };
          }
        });
      });
    }

    // 2. Outfalls
    if (showOutfalls) {
      outfalls.forEach((o) => {
        if (!o.lat || !o.lng) return;
        const iconHtml = `
          <div style="
            width: 24px;
            height: 24px;
            background: #0284c7;
            border: 2px solid #ffffff;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            cursor: pointer;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12c3.5-3 6.5-3 10 0s6.5 3 10 0"/>
              <path d="M2 18c3.5-3 6.5-3 10 0s6.5 3 10 0"/>
            </svg>
          </div>
        `;
        const icon = L.divIcon({
          html: iconHtml,
          className: "custom-outfall-pin",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([o.lat, o.lng], { icon }).addTo(lg);
        marker.bindPopup(`
          <div style="font-family: inherit; min-width: 200px;">
            <div style="font-weight: 700; color: #0284c7; font-size: 13px;">${o.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Outfall ID: <b>${o.id}</b> · ${o.ward}</div>
            <div style="font-size: 11px; margin-bottom: 2px;">Gate Status: <b>${o.gateStatus}</b></div>
            <div style="font-size: 11px; margin-bottom: 2px;">Tidal Level: <b>${o.tidalLevel}</b></div>
            <div style="font-size: 11px; color: #334155;">Discharge: <b>${o.dischargeCapacity || "85 m³/s"}</b></div>
          </div>
        `);
      });
    }

    // 3. Work Orders
    if (showWorkOrders) {
      workOrders.filter((w) => w.status !== "Completed").forEach((w) => {
        // Link to hotspot coordinates
        const hotspot = hotspots.find((h) => h.id === w.hotspotId);
        if (!hotspot || !hotspot.lat || !hotspot.lng) return;

        // Offset slightly to prevent exact overlap
        const lat = hotspot.lat + 0.0012;
        const lng = hotspot.lng + 0.0012;

        const iconHtml = `
          <div style="
            width: 20px;
            height: 20px;
            background: #7c3aed;
            border: 2px solid #ffffff;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            cursor: pointer;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
        `;
        const icon = L.divIcon({
          html: iconHtml,
          className: "custom-wo-pin",
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(lg);
        marker.bindPopup(`
          <div style="font-family: inherit; min-width: 190px;">
            <div style="font-weight: 700; color: #7c3aed; font-size: 12px;">Active Order: ${w.id}</div>
            <div style="font-size: 11px; color: #0b1f41; font-weight: 600;">${w.workType}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Assigned: ${w.assignedTeam}</div>
            <div style="font-size: 11px;">Status: <b>${w.status} (${w.progressPercent || 0}%)</b></div>
          </div>
        `);
      });
    }
  }, [
    hotspots,
    workOrders,
    outfalls,
    selectedHotspot,
    showHotspots,
    showWorkOrders,
    showOutfalls,
    showRiskZones,
    wardFilter,
    onSelectHotspot,
    onCreateWorkOrderForHotspot
  ]);

  // Center map on selected hotspot
  useEffect(() => {
    if (!selectedHotspot || !selectedHotspot.lat || !selectedHotspot.lng) return;
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([selectedHotspot.lat, selectedHotspot.lng], 15, { animate: true });
    }
  }, [selectedHotspot]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([19.128, 72.848], 13, { animate: true });
    }
  };

  return (
    <div className="di-map-panel">
      <div className="di-map-topbar">
        <div className="di-map-toggles">
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Layers:
          </span>
          <button
            className={`di-chip ${showHotspots ? "active" : ""}`}
            onClick={() => setShowHotspots(!showHotspots)}
          >
            <MapPin size={12} /> Hotspots ({hotspots.length})
          </button>
          <button
            className={`di-chip ${showWorkOrders ? "active" : ""}`}
            onClick={() => setShowWorkOrders(!showWorkOrders)}
          >
            <Wrench size={12} /> Work Orders ({workOrders.filter((w) => w.status !== "Completed").length})
          </button>
          <button
            className={`di-chip ${showOutfalls ? "active" : ""}`}
            onClick={() => setShowOutfalls(!showOutfalls)}
          >
            <Waves size={12} /> Outfalls ({outfalls.length})
          </button>
          <button
            className={`di-chip ${showRiskZones ? "active" : ""}`}
            onClick={() => setShowRiskZones(!showRiskZones)}
          >
            <Eye size={12} /> Risk Buffers
          </button>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <select
            className="di-select"
            value={wardFilter}
            onChange={(e) => onWardFilterChange && onWardFilterChange(e.target.value)}
          >
            <option value="all">All Wards</option>
            <option value="Ward 72">Ward 72</option>
            <option value="Ward 73">Ward 73</option>
            <option value="Ward K-West">Ward K-West</option>
          </select>

          <button
            className="di-btn di-btn-secondary"
            style={{ padding: "5px 9px", fontSize: "12px" }}
            onClick={handleRecenter}
            title="Recenter Map on Ward 72/73"
          >
            <Crosshair size={13} />
          </button>
        </div>
      </div>

      <div ref={mapContainerRef} className="di-map-view" />

      <div className="di-map-legend">
        <span style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Legend:</span>
        <div className="di-legend-item">
          <span className="di-legend-dot" style={{ background: "#dc2626" }} />
          <span>Critical Hotspot (≥75)</span>
        </div>
        <div className="di-legend-item">
          <span className="di-legend-dot" style={{ background: "#ea580c" }} />
          <span>High Risk (50-74)</span>
        </div>
        <div className="di-legend-item">
          <span className="di-legend-dot" style={{ background: "#d97706" }} />
          <span>Moderate Risk (35-49)</span>
        </div>
        <div className="di-legend-item">
          <span className="di-legend-dot" style={{ background: "#0284c7" }} />
          <span>Outfall Sluice Gate</span>
        </div>
        <div className="di-legend-item">
          <span className="di-legend-dot" style={{ background: "#7c3aed" }} />
          <span>Active Desilting Work Order</span>
        </div>
      </div>
    </div>
  );
}
