import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, Crosshair, ZoomIn, ZoomOut, MapPin, ExternalLink, Shield, Navigation } from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyA5U1kvO3XeQxEGkQfuNyiMBvcik27VvKQ";

export function ResourceMap({
  resources = [],
  userLat = 19.132,
  userLng = 72.848,
  selectedResource = null,
  onSelectResource,
  onAssignResource
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [mapFilter, setMapFilter] = useState("ALL"); // ALL, AVAILABLE, DEPLOYED, RESCUE, MEDICAL, WATER, SHELTER

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    let map = null;
    try {
      map = L.map(mapContainerRef.current, {
        center: [Number(userLat) || 19.132, Number(userLng) || 72.848],
        zoom: 13,
        zoomControl: false
      });

      L.tileLayer(
        `https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY}`,
        {
          subdomains: ["0", "1", "2", "3"],
          maxZoom: 20,
          attribution: '&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>'
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Command Center Marker
      const commandIcon = L.divIcon({
        className: "custom-command-center-marker",
        html: `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #0B1B3A;
            border: 3px solid #ffffff;
            box-shadow: 0 0 12px rgba(11, 27, 58, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            color: #ffffff;
          ">
            🏛️
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([Number(userLat) || 19.132, Number(userLng) || 72.848], { icon: commandIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <b style="color: #0B1B3A; font-size: 13px;">Authority Command Center</b><br/>
            <span style="color: #64748b;">GPS Operational Datum (${Number(userLat).toFixed(4)}, ${Number(userLng).toFixed(4)})</span>
          </div>
        `);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    } catch (err) {
      console.warn("Leaflet resource map initialization notice:", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [userLat, userLng]);

  // Update Markers based on resources and map filter
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const filtered = resources.filter((r) => {
      const lat = Number(r.latitude ?? r.lat);
      const lng = Number(r.longitude ?? r.lng);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return false;

      const s = (r.status || "").toUpperCase();
      const cat = (r.category || r.resource_type || "RESCUE").toUpperCase();

      if (mapFilter === "AVAILABLE") {
        return s === "AVAILABLE" || s === "READY";
      }
      if (mapFilter === "DEPLOYED") {
        return s === "DEPLOYED" || s === "EN_ROUTE" || s === "EN ROUTE" || s === "ON-SITE" || s === "ALLOCATED";
      }
      if (mapFilter === "RESCUE") return cat === "RESCUE" || cat === "FIRE";
      if (mapFilter === "MEDICAL") return cat === "MEDICAL";
      if (mapFilter === "WATER") return cat === "WATER";
      if (mapFilter === "SHELTER") return cat === "SHELTER";
      return true;
    });

    const bounds = [];

    filtered.forEach((r) => {
      const lat = Number(r.latitude ?? r.lat);
      const lng = Number(r.longitude ?? r.lng);
      bounds.push([lat, lng]);

      const catInfo = getAuthorityResourceCategory(r);
      const statusUpper = (r.status || "AVAILABLE").toUpperCase();
      const isAvail = statusUpper === "AVAILABLE" || statusUpper === "READY";
      const isEnRoute = statusUpper === "EN_ROUTE" || statusUpper === "EN ROUTE";
      const isMaint = statusUpper === "MAINTENANCE";

      const borderColor = isAvail ? "#16a34a" : isEnRoute ? "#9333ea" : isMaint ? "#dc2626" : "#2563eb";
      const bgColor = isAvail ? "#f0fdf4" : isEnRoute ? "#faf5ff" : isMaint ? "#fef2f2" : "#eff6ff";

      const icon = L.divIcon({
        className: "tt-resource-map-marker",
        html: `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: ${bgColor};
            border: 2px solid ${borderColor};
            box-shadow: 0 2px 8px rgba(0,0,0,0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.15s ease;
          ">
            ${r.emoji || catInfo.icon || "📦"}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(layer);

      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 210px; padding: 4px 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
            <b style="font-size: 13px; color: #0B1B3A;">${r.name}</b>
            <span style="font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${bgColor}; color: ${borderColor}; text-transform: uppercase;">
              ${r.status || "Available"}
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
            <b>Facility:</b> ${r.agency || r.station || "Emergency Depot"}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            <b>Capacity:</b> ${r.quantity != null ? `${r.quantity} ${r.unit || "Units"}` : (r.capacity || "Operational")}
          </div>
          ${r.currentIncidentId ? `
            <div style="font-size: 11px; color: #2563eb; background: #eff6ff; padding: 3px 6px; border-radius: 4px; margin-bottom: 8px;">
              <b>Incident:</b> ${r.currentIncidentId}
            </div>
          ` : ""}
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <button id="tt-marker-view-${r.id}" style="
              flex: 1;
              padding: 5px 8px;
              background: #0B1B3A;
              color: #ffffff;
              border: none;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
            ">
              View Details
            </button>
            <button id="tt-marker-assign-${r.id}" style="
              flex: 1;
              padding: 5px 8px;
              background: #2563eb;
              color: #ffffff;
              border: none;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
            ">
              Assign
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        const viewBtn = document.getElementById(`tt-marker-view-${r.id}`);
        const assignBtn = document.getElementById(`tt-marker-assign-${r.id}`);
        if (viewBtn) {
          viewBtn.onclick = () => {
            if (onSelectResource) onSelectResource(r);
            marker.closePopup();
          };
        }
        if (assignBtn) {
          assignBtn.onclick = () => {
            if (onAssignResource) onAssignResource(r);
            marker.closePopup();
          };
        }
      });
    });

    // If bounds exist and no specific selected resource, adjust view
    if (bounds.length > 0 && !selectedResource) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [resources, mapFilter, onSelectResource, onAssignResource]);

  // Center on selected resource if changed
  useEffect(() => {
    if (!selectedResource || !mapInstanceRef.current) return;
    const lat = Number(selectedResource.latitude ?? selectedResource.lat);
    const lng = Number(selectedResource.longitude ?? selectedResource.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
    }
  }, [selectedResource]);

  const fitAllBounds = () => {
    if (!mapInstanceRef.current) return;
    const valid = resources
      .map((r) => [Number(r.latitude ?? r.lat), Number(r.longitude ?? r.lng)])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0);
    if (valid.length > 0) {
      mapInstanceRef.current.fitBounds(valid, { padding: [30, 30], maxZoom: 15 });
    }
  };

  const centerCommand = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([Number(userLat) || 19.132, Number(userLng) || 72.848], 13, { animate: true });
  };

  return (
    <div className="tt-map-wrapper">
      <div className="tt-map-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={15} style={{ color: "#2563eb" }} />
          <b style={{ fontSize: "13px", color: "#0B1B3A" }}>Live Resource GIS Telemetry</b>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            ({resources.filter((r) => (r.latitude ?? r.lat) && (r.longitude ?? r.lng)).length} mapped units)
          </span>
        </div>

        {/* Map Quick Filter Pills */}
        <div className="tt-map-controls">
          <button
            className={`tt-map-pill ${mapFilter === "ALL" ? "active" : ""}`}
            onClick={() => setMapFilter("ALL")}
          >
            All
          </button>
          <button
            className={`tt-map-pill ${mapFilter === "AVAILABLE" ? "active" : ""}`}
            onClick={() => setMapFilter("AVAILABLE")}
          >
            Available
          </button>
          <button
            className={`tt-map-pill ${mapFilter === "DEPLOYED" ? "active" : ""}`}
            onClick={() => setMapFilter("DEPLOYED")}
          >
            Deployed
          </button>
          <button
            className={`tt-map-pill ${mapFilter === "RESCUE" ? "active" : ""}`}
            onClick={() => setMapFilter("RESCUE")}
          >
            🚒 Rescue
          </button>
          <button
            className={`tt-map-pill ${mapFilter === "MEDICAL" ? "active" : ""}`}
            onClick={() => setMapFilter("MEDICAL")}
          >
            🚑 Medical
          </button>
          <button
            className={`tt-map-pill ${mapFilter === "WATER" ? "active" : ""}`}
            onClick={() => setMapFilter("WATER")}
          >
            💧 Water
          </button>
          <button
            className={`tt-map-pill ${mapFilter === "SHELTER" ? "active" : ""}`}
            onClick={() => setMapFilter("SHELTER")}
          >
            🛏️ Shelter
          </button>

          <div style={{ width: "1px", height: "18px", background: "#cbd5e1", margin: "0 4px" }} />

          <button className="tt-map-pill" onClick={fitAllBounds} title="Fit all resources into view">
            Fit Bounds
          </button>
          <button className="tt-map-pill" onClick={centerCommand} title="Center on Command Center">
            <Crosshair size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Center
          </button>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "380px",
          background: "#e2e8f0"
        }}
      />
    </div>
  );
}
