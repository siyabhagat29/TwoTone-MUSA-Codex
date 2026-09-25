import React, { useState, useMemo } from "react";
import { CloudRain, Sparkles, AlertTriangle, ArrowRight, Gauge, Droplets, ShieldCheck, RefreshCw } from "lucide-react";

export default function RainfallSimulationPanel({
  hotspots = [],
  onSelectHotspotById
}) {
  // Simulation Inputs
  const [rainfallMmH, setRainfallMmH] = useState(65);
  const [siltAccumulation, setSiltAccumulation] = useState(60);
  const [tideLevelM, setTideLevelM] = useState(3.4);
  const [isDesilted, setIsDesilted] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState("BLK-01");

  // Modeled calculations
  const simulationResults = useMemo(() => {
    // Baseline risk
    let baseline = 50;
    // Rainfall contribution (0 to 35)
    const rainFactor = (rainfallMmH / 120) * 35;
    // Silt obstruction contribution (0 to 30)
    const siltFactor = (siltAccumulation / 100) * 30;
    // High tide penalty (0 to 25)
    const tideFactor = (tideLevelM / 4.5) * 25;

    let modeledRisk = Math.min(100, Math.round(rainFactor + siltFactor + tideFactor));

    // If desilted, dramatic 45% reduction
    if (isDesilted) {
      modeledRisk = Math.max(15, Math.round(modeledRisk * 0.45));
    }

    // Water accumulation depth in cm
    const modeledWaterDepth = Math.round(
      (modeledRisk / 100) * (rainfallMmH > 80 ? 65 : 45)
    );

    let priorityAction = "Deploy standard routine patrol.";
    if (modeledRisk >= 80) {
      priorityAction = "URGENT: Deploy 150 HP diesel dewatering pump & initiate traffic diversions.";
    } else if (modeledRisk >= 60) {
      priorityAction = "Pre-position rapid suction truck and clear trash rack barriers 2 hours before peak tide.";
    } else if (modeledRisk >= 40) {
      priorityAction = "Inspect catchbasins and verify gravity flap gate discharge clearance.";
    }

    return {
      modeledRisk,
      riskDelta: isDesilted ? -45 : Math.round(modeledRisk - 55),
      modeledWaterDepth,
      priorityAction
    };
  }, [rainfallMmH, siltAccumulation, tideLevelM, isDesilted]);

  const targetHotspot = hotspots.find((h) => h.id === selectedHotspotId) || hotspots[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Rainfall Correlation Strip */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <CloudRain size={24} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Live Precipitation Correlation
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#0b1f41" }}>
              42 mm in Last 6 Hours · Elevated Surface Runoff
            </div>
            <div style={{ fontSize: "12px", color: "#334155" }}>
              Associated with <b>8 verified water accumulation reports</b> across Ward 72 & 73 culverts.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Spring Tide Peak:</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#ea580c" }}>4.2m at 14:15 IST</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Correlated Hotspots:</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626" }}>BLK-01 & BLK-02</div>
          </div>
        </div>
      </div>

      {/* What-If Simulation Box */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #0b1f41 0%, #1e3a8a 100%)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  background: "#7c3aed",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "4px"
                }}
              >
                SIMULATION MODE
              </span>
              <span style={{ fontSize: "11px", opacity: 0.85 }}>
                Modeled estimates for preventive planning (Not real-time predictions)
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
              Preventive What-If Scenario Modeler
            </h3>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="di-btn"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: "11px", padding: "6px 12px" }}
              onClick={() => {
                setRainfallMmH(40);
                setSiltAccumulation(20);
                setTideLevelM(1.8);
                setIsDesilted(true);
              }}
            >
              Post-Desilting Best Case
            </button>
            <button
              className="di-btn"
              style={{ background: "#dc2626", color: "#fff", fontSize: "11px", padding: "6px 12px" }}
              onClick={() => {
                setRainfallMmH(110);
                setSiltAccumulation(85);
                setTideLevelM(4.2);
                setIsDesilted(false);
              }}
            >
              Monsoon Deluge Worst Case
            </button>
          </div>
        </div>

        <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px" }}>
          {/* Sliders Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Configurable Simulation Parameters
            </h4>

            {/* Hotspot Target Selector */}
            <div className="di-form-group">
              <label className="di-form-label">Simulation Target Hotspot</label>
              <select
                className="di-select"
                value={selectedHotspotId}
                onChange={(e) => setSelectedHotspotId(e.target.value)}
              >
                {hotspots.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.id} — {h.name} ({h.ward})
                  </option>
                ))}
              </select>
            </div>

            {/* Slider 1: Rainfall */}
            <div className="di-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700 }}>
                <span>Rainfall Intensity:</span>
                <span style={{ color: "#2563eb" }}>{rainfallMmH} mm/hr</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="5"
                value={rainfallMmH}
                onChange={(e) => setRainfallMmH(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#2563eb" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                <span>Light (20mm)</span>
                <span>Heavy (65mm)</span>
                <span>Extreme Cloudburst (120mm)</span>
              </div>
            </div>

            {/* Slider 2: Silt Accumulation */}
            <div className="di-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700 }}>
                <span>Drain Silt & Debris Choke:</span>
                <span style={{ color: "#ea580c" }}>{siltAccumulation}% cross-section blocked</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={siltAccumulation}
                onChange={(e) => setSiltAccumulation(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#ea580c" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                <span>Clear (10%)</span>
                <span>Moderate (50%)</span>
                <span>Severe Choke (90%)</span>
              </div>
            </div>

            {/* Slider 3: Outfall Tide Level */}
            <div className="di-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700 }}>
                <span>Coastal Tide Level (Arabian Sea):</span>
                <span style={{ color: "#0284c7" }}>{tideLevelM} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.5"
                step="0.1"
                value={tideLevelM}
                onChange={(e) => setTideLevelM(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#0284c7" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                <span>Low Tide (0.5m)</span>
                <span>Mean Sea Level (2.5m)</span>
                <span>Spring High Tide (4.5m)</span>
              </div>
            </div>

            {/* Desilting status toggle */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                background: isDesilted ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${isDesilted ? "#bbf7d0" : "#fecaca"}`,
                borderRadius: "8px"
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: isDesilted ? "#16a34a" : "#dc2626" }}>
                  Desilting Completed Before Storm?
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  Simulates complete clearing of trash racks and culvert silt traps
                </div>
              </div>
              <button
                type="button"
                className={`di-btn ${isDesilted ? "di-btn-primary" : "di-btn-secondary"}`}
                style={{ fontSize: "11px", padding: "6px 12px" }}
                onClick={() => setIsDesilted(!isDesilted)}
              >
                {isDesilted ? "✓ Desilted" : "Not Desilted"}
              </button>
            </div>
          </div>

          {/* Results Column */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Modeled Impact on {targetHotspot?.id}
              </h4>
              <span className="di-sim-badge">Dynamic Output</span>
            </div>

            {/* Big Risk Display */}
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Projected Risk Score
                </div>
                <div
                  style={{
                    fontSize: "36px",
                    fontWeight: 900,
                    color: simulationResults.modeledRisk >= 75 ? "#dc2626" : simulationResults.modeledRisk >= 50 ? "#ea580c" : "#16a34a"
                  }}
                >
                  {simulationResults.modeledRisk} <span style={{ fontSize: "16px", color: "#64748b", fontWeight: 600 }}>/ 100</span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Risk Trend vs Baseline:</div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: simulationResults.riskDelta <= 0 ? "#16a34a" : "#dc2626"
                  }}
                >
                  {simulationResults.riskDelta > 0 ? `+${simulationResults.riskDelta}% Surge` : `${simulationResults.riskDelta}% Reduced`}
                </div>
              </div>
            </div>

            {/* Modeled Water Depth */}
            <div
              style={{
                background: "#ffffff",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Estimated Water Accumulation
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#0b1f41" }}>
                  {simulationResults.modeledWaterDepth} cm Stagnation Depth
                </div>
              </div>
              <Droplets size={24} color="#2563eb" />
            </div>

            {/* Action Directive */}
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                padding: "12px 14px"
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", marginBottom: "4px" }}>
                Recommended Operational Directive
              </div>
              <div style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: 600, lineHeight: 1.4 }}>
                {simulationResults.priorityAction}
              </div>
            </div>

            <button
              className="di-btn di-btn-secondary"
              style={{ fontSize: "12px", width: "100%", justifyContent: "center" }}
              onClick={() => onSelectHotspotById && onSelectHotspotById(targetHotspot?.id)}
            >
              Inspect {targetHotspot?.name} Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
