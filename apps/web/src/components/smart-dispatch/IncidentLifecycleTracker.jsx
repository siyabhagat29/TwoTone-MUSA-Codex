import React from "react";
import { Activity, Check, CheckCircle2, MapPin, Navigation, RotateCcw, Send, RefreshCw } from "lucide-react";

export function IncidentLifecycleTracker({
  incident,
  updatingProgress,
  onProgressStage,
  onOpenDispatchModal
}) {
  if (!incident) return null;

  const isDispatched = incident.status === "Dispatched" || incident.dispatchProgress === "en_route";
  const isOnScene = incident.status === "On Scene" || incident.dispatchProgress === "on_scene";
  const isResolved = incident.status === "Resolved" || incident.status === "RESOLVED";

  // Step Calculation: 1 = Triaged, 2 = En route, 3 = On scene, 4 = Resolved
  const currentStep = isResolved ? 4 : isOnScene ? 3 : isDispatched ? 2 : 1;
  const progressPercent = isResolved ? 100 : isOnScene ? 70 : isDispatched ? 35 : 0;

  return (
    <div className="dispatch-timeline-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <b style={{ fontSize: "12px", color: "#0B1B3A", display: "flex", alignItems: "center", gap: "6px" }}>
          <Activity size={14} style={{ color: "#2563eb" }} />
          <span>Dispatch & Mitigation Lifecycle</span>
        </b>
        <span style={{
          fontSize: "11px",
          fontWeight: "700",
          color: isResolved ? "#166534" : isOnScene ? "#047857" : isDispatched ? "#b45309" : "#64748b"
        }}>
          {isResolved
            ? "Stage 4: Mitigated & Cleared"
            : isOnScene
            ? "Stage 3: Squad On Scene"
            : isDispatched
            ? "Stage 2: Squad En Route"
            : "Stage 1: Triaged & Awaiting Dispatch"}
        </span>
      </div>

      {/* Stepper Bar */}
      <div className="dispatch-stepper" style={{ marginBottom: "14px" }}>
        <div className="dispatch-step-line">
          <div className="dispatch-step-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className={`dispatch-step-item ${currentStep >= 1 ? "completed" : ""}`}>
          <div className="dispatch-step-circle">📋</div>
          <span className="dispatch-step-label">1. Triaged</span>
        </div>

        <div className={`dispatch-step-item ${currentStep === 2 ? "current-en-route" : currentStep > 2 ? "completed" : ""}`}>
          <div className="dispatch-step-circle">🚗</div>
          <span className="dispatch-step-label">2. En Route</span>
        </div>

        <div className={`dispatch-step-item ${currentStep === 3 ? "current-on-scene" : currentStep > 3 ? "completed" : ""}`}>
          <div className="dispatch-step-circle">📍</div>
          <span className="dispatch-step-label">3. On Scene</span>
        </div>

        <div className={`dispatch-step-item ${currentStep === 4 ? "completed" : ""}`}>
          <div className="dispatch-step-circle">✅</div>
          <span className="dispatch-step-label">4. Mitigated</span>
        </div>
      </div>

      {/* Action Controls for Status Advancement */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {!isDispatched && !isOnScene && !isResolved && (
          <button
            className="primary small"
            onClick={onOpenDispatchModal}
            disabled={updatingProgress}
            style={{ flex: 1, padding: "9px 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            <Send size={13} />
            <span>Deploy Selected Response Unit</span>
          </button>
        )}

        {isDispatched && !isOnScene && !isResolved && (
          <>
            <button
              className="primary small"
              onClick={() => onProgressStage("on_scene")}
              disabled={updatingProgress}
              style={{ flex: 1, padding: "9px 14px", background: "#059669", borderColor: "#059669", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              {updatingProgress ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <MapPin size={13} />}
              <span>Mark Squad On Scene / Reached</span>
            </button>
            <button
              className="ghost small"
              onClick={() => onProgressStage("resolved")}
              disabled={updatingProgress}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <Check size={13} />
              <span>Fast Resolve</span>
            </button>
          </>
        )}

        {isOnScene && !isResolved && (
          <button
            className="primary small"
            onClick={() => onProgressStage("resolved")}
            disabled={updatingProgress}
            style={{ flex: 1, padding: "10px 16px", background: "#166534", borderColor: "#166534", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            {updatingProgress ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={15} />}
            <span>Hazard Mitigated — Mark Incident Resolved</span>
          </button>
        )}

        {isResolved && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "8px 12px", borderRadius: "8px" }}>
            <span style={{ fontSize: "12px", color: "#065f46", fontWeight: "700" }}>
              ✓ Cleared & Fully Resolved
            </span>
            <button
              className="ghost small"
              onClick={() => onProgressStage("en_route")}
              disabled={updatingProgress}
              style={{ fontSize: "11px", padding: "4px 8px" }}
            >
              <RotateCcw size={11} /> Re-open Response
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
