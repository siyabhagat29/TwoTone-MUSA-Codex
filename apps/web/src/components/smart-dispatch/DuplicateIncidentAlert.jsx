import React, { useState, useEffect } from "react";
import { AlertCircle, GitMerge, X, Check, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function DuplicateIncidentAlert({
  incident,
  onMergeSuccess,
  notify
}) {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!incident?.id) {
      setDuplicates([]);
      return;
    }

    let isMounted = true;
    fetch(`${API}/incidents/${incident.id}/duplicates`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.duplicates)) {
          setDuplicates(data.duplicates);
        }
      })
      .catch(() => {
        if (isMounted) setDuplicates([]);
      });

    return () => { isMounted = false; };
  }, [incident?.id]);

  if (!incident || duplicates.length === 0) return null;

  const handleMerge = async () => {
    if (!selectedDuplicate) return;
    setMerging(true);
    try {
      const res = await fetch(`${API}/incidents/${incident.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duplicateId: selectedDuplicate.id,
          notes: `Merged duplicate report ${selectedDuplicate.id} into ${incident.id}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to merge incidents");

      if (notify) notify(`Duplicate ${selectedDuplicate.id} successfully merged into ${incident.id}.`);
      if (onMergeSuccess) onMergeSuccess(data);
      setShowMergeModal(false);
      setSelectedDuplicate(null);
      // Remove from local list
      setDuplicates((prev) => prev.filter((d) => d.id !== selectedDuplicate.id));
    } catch (err) {
      if (notify) notify(`Merge failed: ${err.message}`);
    } finally {
      setMerging(false);
    }
  };

  const topDup = duplicates[0];

  return (
    <>
      {/* Warning Banner */}
      <div style={{
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: "10px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={16} style={{ color: "#d97706", flexShrink: 0 }} />
          <div style={{ fontSize: "12px", color: "#92400e" }}>
            <b>Potential Duplicate:</b> {topDup.id} reported nearby ({topDup.distanceKm != null ? `${topDup.distanceKm} km away` : "same vicinity"})
          </div>
        </div>

        <button
          className="ghost small"
          onClick={() => {
            setSelectedDuplicate(topDup);
            setShowMergeModal(true);
          }}
          style={{
            borderColor: "#d97706",
            color: "#b45309",
            background: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            padding: "4px 8px"
          }}
        >
          <GitMerge size={12} />
          <span>Compare & Merge</span>
        </button>
      </div>

      {/* Merge Confirmation Modal */}
      {showMergeModal && selectedDuplicate && (
        <div className="tt-modal-backdrop" onClick={() => setShowMergeModal(false)}>
          <div className="tt-modal-box" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="tt-modal-header" style={{ background: "#d97706" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GitMerge size={16} />
                <b style={{ fontSize: "14px" }}>Merge Duplicate Emergency Incident</b>
              </div>
              <button
                onClick={() => setShowMergeModal(false)}
                style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="tt-modal-body">
              <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>
                Merging resolves the duplicate incident and associates its citizen reports and telemetry with this primary operational record.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "8px", fontSize: "11px" }}>
                  <b style={{ color: "#1d4ed8" }}>Primary Incident: {incident.id}</b>
                  <div style={{ color: "#1e40af", marginTop: "2px" }}>{incident.address}</div>
                  <div style={{ color: "#64748b", marginTop: "4px" }}>Severity: {incident.severity}/100</div>
                </div>

                <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: "10px", borderRadius: "8px", fontSize: "11px" }}>
                  <b style={{ color: "#b45309" }}>Duplicate Incident: {selectedDuplicate.id}</b>
                  <div style={{ color: "#92400e", marginTop: "2px" }}>{selectedDuplicate.address}</div>
                  <div style={{ color: "#64748b", marginTop: "4px" }}>Reporter: {selectedDuplicate.reporter}</div>
                </div>
              </div>
            </div>

            <div className="tt-modal-footer">
              <button className="ghost small" onClick={() => setShowMergeModal(false)}>
                Cancel
              </button>
              <button
                className="primary small"
                onClick={handleMerge}
                disabled={merging}
                style={{ background: "#d97706", borderColor: "#d97706" }}
              >
                {merging ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Merging...
                  </span>
                ) : (
                  "Confirm Merge"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
