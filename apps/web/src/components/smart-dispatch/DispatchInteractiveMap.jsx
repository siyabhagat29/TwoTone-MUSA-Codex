import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Crosshair, ZoomIn, ZoomOut, Layers, Route as RouteIcon, MapPin } from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyA5U1kvO3XeQxEGkQfuNyiMBvcik27VvKQ";

export function DispatchInteractiveMap({
  incident,
  nearbyResources = [],
  selectedResource,
  routeData,
  loadingRoute,
  onSelectResource
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const routeLayerRef = useRef(null);

  const incLat = incident?.lat != null ? Number(incident.lat) : (incident?.liveLocation?.latitude != null ? Number(incident.liveLocation.latitude) : 19.132);
  const incLng = incident?.lng != null ? Number(incident.lng) : (incident?.liveLocation?.longitude != null ? Number(incident.liveLocation.longitude) : 72.848);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [incLat, incLng],
      zoom: 14,
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

    const group = L.layerGroup().addTo(map);
    layersGroupRef.current = group;

    const routeGroup = L.layerGroup().addTo(map);
    routeLayerRef.current = routeGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Centering
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group || !incident) return;

    group.clearLayers();

    // 1. Incident Target Marker
    const isCrit = incident.isSos || incident.severity >= 80;
    const incMarkerColor = isCrit ? "#dc2626" : "#2563eb";

    const incidentIcon = L.divIcon({
      className: "sd-map-incident-marker",
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${incMarkerColor};
          border: 3px solid #ffffff;
          box-shadow: 0 0 14px ${incMarkerColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #ffffff;
          cursor: pointer;
        ">
          ${incident.isSos ? "🚨" : "📍"}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const incMarker = L.marker([incLat, incLng], { icon: incidentIcon }).addTo(group);
    incMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px;">
        <b style="color: #0B1B3A; font-size: 13px;">${incident.id} (Emergency Site)</b>
        <div style="color: #475569; margin-top: 2px;">${incident.address || "Active Area"}</div>
        <div style="color: #dc2626; font-weight: 700; margin-top: 4px;">Severity: ${incident.severity}/100</div>
      </div>
    `);

    // 2. Nearby Discovered Resources
    nearbyResources.forEach((res) => {
      const rLat = Number(res.lat ?? res.latitude);
      const rLng = Number(res.lng ?? res.longitude);
      if (isNaN(rLat) || isNaN(rLng) || rLat === 0 || rLng === 0) return;

      const isChosen = selectedResource?.id === res.id || selectedResource?.name === res.name;
      const catInfo = getAuthorityResourceCategory(res);

      const markerHtml = `
        <div style="
          width: ${isChosen ? "34px" : "28px"};
          height: ${isChosen ? "34px" : "28px"};
          border-radius: 8px;
          background: ${isChosen ? "#2563eb" : "#ffffff"};
          border: 2px solid ${isChosen ? "#0B1B3A" : "#2563eb"};
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isChosen ? "16px" : "14px"};
          color: ${isChosen ? "#ffffff" : "#0f172a"};
          cursor: pointer;
          transition: all 0.15s ease;
        ">
          ${res.icon || catInfo.icon || "🚒"}
        </div>
      `;

      const resIcon = L.divIcon({
        className: "sd-map-resource-marker",
        html: markerHtml,
        iconSize: isChosen ? [34, 34] : [28, 28],
        iconAnchor: isChosen ? [17, 17] : [14, 14]
      });

      const resMarker = L.marker([rLat, rLng], { icon: resIcon }).addTo(group);
      resMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 180px;">
          <b style="color: #0B1B3A; font-size: 13px;">${res.name}</b>
          <div style="color: #64748b; font-size: 11px;">${res.agency || res.station || "Emergency Depot"}</div>
          <div style="margin-top: 4px; font-weight: 700; color: #2563eb;">
            ${res.distanceKm != null ? `${res.distanceKm} km away` : ""}
          </div>
        </div>
      `);

      resMarker.on("click", () => {
        if (onSelectResource) onSelectResource(res);
      });
    });
  }, [incident, nearbyResources, selectedResource, incLat, incLng, onSelectResource]);

  // Update Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = routeLayerRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    if (routeData && Array.isArray(routeData.coordinates) && routeData.coordinates.length > 0) {
      // Draw road routing polyline
      const latlngs = routeData.coordinates.map(([lat, lng]) => [lat, lng]);
      const polyline = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.85,
        lineJoin: "round"
      }).addTo(routeGroup);

      // Fit map view to route bounds
      map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
    } else if (selectedResource && selectedResource.lat && selectedResource.lng) {
      // Straight line fallback if road routing is loading
      const rLat = Number(selectedResource.lat);
      const rLng = Number(selectedResource.lng);
      if (!isNaN(rLat) && !isNaN(rLng)) {
        const polyline = L.polyline([[rLat, rLng], [incLat, incLng]], {
          color: "#9333ea",
          weight: 3,
          dashArray: "6, 8",
          opacity: 0.65
        }).addTo(routeGroup);
        map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
      }
    }
  }, [routeData, selectedResource, incLat, incLng]);

  const handleCenterIncident = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([incLat, incLng], 15, { animate: true });
  };

  const handleFitRoute = () => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    const layers = routeLayerRef.current.getLayers();
    if (layers.length > 0 && layers[0].getBounds) {
      mapInstanceRef.current.fitBounds(layers[0].getBounds(), { padding: [40, 40] });
    } else {
      handleCenterIncident();
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "260px", background: "#e2e8f0", borderRadius: "10px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Floating Route Info Badge */}
      {routeData && (
        <div style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1000,
          background: "rgba(11, 27, 58, 0.9)",
          color: "#ffffff",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}>
          <Navigation size={12} style={{ color: "#38bdf8" }} />
          <span>Route: <b>{routeData.distanceKm} km</b></span>
          <span>•</span>
          <span>ETA: <b style={{ color: "#38bdf8" }}>{routeData.durationMin} min</b></span>
        </div>
      )}

      {/* Map Control Buttons */}
      <div style={{
        position: "absolute",
        bottom: "10px",
        left: "10px",
        zIndex: 1000,
        display: "flex",
        gap: "6px"
      }}>
        <button
          onClick={handleCenterIncident}
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "5px 9px",
            fontSize: "11px",
            fontWeight: "600",
            color: "#0B1B3A",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}
        >
          <Crosshair size={12} />
          <span>Center Incident</span>
        </button>

        {selectedResource && (
          <button
            onClick={handleFitRoute}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "5px 9px",
              fontSize: "11px",
              fontWeight: "600",
              color: "#2563eb",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}
          >
            <RouteIcon size={12} />
            <span>Fit Route</span>
          </button>
        )}
      </div>
    </div>
  );
}
