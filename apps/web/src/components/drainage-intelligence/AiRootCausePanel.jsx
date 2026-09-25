import React, { useState } from "react";
import { Camera, CheckCircle2, XCircle, AlertCircle, Sparkles, Layers, Link as LinkIcon, Eye } from "lucide-react";

export default function AiRootCausePanel({
  evidenceClusters = [],
  hotspots = [],
  onVerifyEvidence,
  onSelectHotspotById
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState("evidence"); // "evidence" | "clustering"

  const duplicateGroups = [
    {
      id: "GRP-01",
      targetHotspotId: "BLK-02",
      targetHotspotName: "Market Lane Gutter Junction #4",
      reportCount: 3,
      reports: ["REP-1044", "REP-1047", "REP-1052"],
      distance: "18m to 45m radius",
      suggestedReason: "3 photos submitted within 40 minutes at Market Lane reporting blocked commercial stalls drain.",
      status: "Cluster Identified"
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Overview Card */}
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
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span className="di-sim-badge" style={{ background: "#2563eb" }}>
              <Sparkles size={12} /> AI OBSERVATION AGENT
            </span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Computer Vision & Multi-Source Ground Truth
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#0b1f41", fontWeight: 800 }}>
            Ground Truth Evidence & Incident Clustering
          </h3>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className={`di-chip ${activeTab === "evidence" ? "active" : ""}`}
            onClick={() => setActiveTab("evidence")}
          >
            <Camera size={13} /> Photographic Evidence ({evidenceClusters.length})
          </button>
          <button
            className={`di-chip ${activeTab === "clustering" ? "active" : ""}`}
            onClick={() => setActiveTab("clustering")}
          >
            <Layers size={13} /> Duplicate Incident Clusters (1)
          </button>
        </div>
      </div>

      {activeTab === "evidence" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px"
          }}
        >
          {evidenceClusters.map((ev) => (
            <div
              key={ev.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Photo Banner */}
              <div
                style={{
                  height: "170px",
                  background: "#1e293b",
                  position: "relative",
                  cursor: "pointer"
                }}
                onClick={() => setSelectedPhoto(ev.photoUrl)}
              >
                <img
                  src={ev.photoUrl}
                  alt={ev.visualAnalysis}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.85
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(11, 31, 65, 0.8)",
                    color: "#ffffff",
                    fontSize: "11px",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontWeight: 700
                  }}
                >
                  AI Confidence: {ev.aiConfidence}%
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "10px",
                    background: ev.status === "Verified" ? "rgba(22, 163, 74, 0.9)" : "rgba(234, 88, 12, 0.9)",
                    color: "#ffffff",
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontWeight: 800,
                    textTransform: "uppercase"
                  }}
                >
                  {ev.status}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#0b1f41",
                      cursor: "pointer"
                    }}
                    onClick={() => onSelectHotspotById && onSelectHotspotById(ev.hotspotId)}
                  >
                    {ev.hotspotId} · {ev.hotspotName}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Source: {ev.reporterType} · {new Date(ev.reportedAt).toLocaleDateString()}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#334155",
                    background: "#f8fafc",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    borderLeft: "3px solid #2563eb",
                    lineHeight: 1.4
                  }}
                >
                  <b style={{ color: "#0f172a" }}>AI Detection:</b> {ev.visualAnalysis}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                  <span>Silt Severity: <b>{ev.siltSeverity}</b></span>
                  <span style={{ color: "#64748b" }}>GPS: <b>{ev.coordinates}</b></span>
                </div>

                {ev.humanReviewedBy && (
                  <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 600 }}>
                    Verified by Municipal Officer: {ev.humanReviewedBy}
                  </div>
                )}

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: "10px",
                    marginTop: "auto"
                  }}
                >
                  {ev.status !== "Verified" ? (
                    <button
                      className="di-btn di-btn-primary"
                      style={{ flex: 1, padding: "6px", fontSize: "11px" }}
                      onClick={() => onVerifyEvidence && onVerifyEvidence(ev.id, "Verified")}
                    >
                      <CheckCircle2 size={12} /> Verify Evidence
                    </button>
                  ) : (
                    <button
                      className="di-btn di-btn-secondary"
                      style={{ flex: 1, padding: "6px", fontSize: "11px" }}
                      onClick={() => onVerifyEvidence && onVerifyEvidence(ev.id, "Pending Review")}
                    >
                      Mark Review
                    </button>
                  )}
                  <button
                    className="di-btn di-btn-secondary"
                    style={{ padding: "6px 10px", fontSize: "11px" }}
                    onClick={() => onSelectHotspotById && onSelectHotspotById(ev.hotspotId)}
                  >
                    View Hotspot
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Duplicate Clustering Section */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {duplicateGroups.map((grp) => (
            <div
              key={grp.id}
              style={{
                background: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="di-sim-badge" style={{ background: "#ea580c" }}>
                    Cluster {grp.id}
                  </span>
                  <h4 style={{ margin: 0, fontSize: "14px", color: "#0b1f41", fontWeight: 700 }}>
                    {grp.reportCount} Corroborating Reports Detected near {grp.targetHotspotId}
                  </h4>
                </div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>{grp.distance}</span>
              </div>

              <p style={{ margin: 0, fontSize: "12px", color: "#334155" }}>
                {grp.suggestedReason}
              </p>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "11px", color: "#64748b" }}>
                <span>Grouped Incident IDs:</span>
                {grp.reports.map((r) => (
                  <span
                    key={r}
                    style={{
                      background: "#f1f5f9",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      color: "#1e293b"
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <button
                  className="di-btn di-btn-primary"
                  style={{ fontSize: "11px", padding: "6px 12px" }}
                  onClick={() => alert(`Group ${grp.id} successfully linked to Hotspot ${grp.targetHotspotId}. Audit log updated.`)}
                >
                  <LinkIcon size={12} /> Confirm & Link to {grp.targetHotspotId}
                </button>
                <button
                  className="di-btn di-btn-secondary"
                  style={{ fontSize: "11px", padding: "6px 12px" }}
                  onClick={() => onSelectHotspotById && onSelectHotspotById(grp.targetHotspotId)}
                >
                  Inspect Target Hotspot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox for Photo */}
      {selectedPhoto && (
        <div
          className="di-modal-backdrop"
          onClick={() => setSelectedPhoto(null)}
          style={{ zIndex: 1100 }}
        >
          <div
            style={{
              maxWidth: "800px",
              width: "90vw",
              background: "#000",
              borderRadius: "8px",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selectedPhoto} alt="Full evidence view" style={{ width: "100%", display: "block" }} />
            <div style={{ padding: "10px", background: "#0f172a", textAlign: "right" }}>
              <button
                className="di-btn di-btn-secondary"
                style={{ fontSize: "11px" }}
                onClick={() => setSelectedPhoto(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
