import React, { useState } from "react";
import { X, Wrench, Calendar, Users, AlertTriangle } from "lucide-react";

export default function CreateWorkOrderModal({
  hotspots = [],
  initialHotspot = null,
  onClose,
  onSubmit
}) {
  const [selectedHotspotId, setSelectedHotspotId] = useState(
    initialHotspot?.id || (hotspots[0]?.id || "")
  );

  const currentHotspot = hotspots.find((h) => h.id === selectedHotspotId) || initialHotspot;

  const [workType, setWorkType] = useState("Mechanical Desilting & Trash Rack Clearance");
  const [priority, setPriority] = useState(
    currentHotspot?.riskScore >= 75 ? "Critical" : "High"
  );
  const [assignedTeam, setAssignedTeam] = useState("BMC Ward 72 Stormwater Mech Unit 01");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(
    currentHotspot ? `Immediate maintenance required for ${currentHotspot.name}: ${currentHotspot.primaryCause}` : ""
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentHotspot) return;

    setSubmitting(true);
    try {
      await onSubmit({
        hotspotId: currentHotspot.id,
        hotspotName: currentHotspot.name,
        ward: currentHotspot.ward,
        workType,
        priority,
        assignedTeam,
        dueDate,
        notes,
        status: "Assigned"
      });
      onClose();
    } catch (err) {
      alert("Failed to create work order: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="di-modal-backdrop" onClick={onClose}>
      <div className="di-modal" onClick={(e) => e.stopPropagation()}>
        <div className="di-modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "#eff6ff", color: "#2563eb", padding: "6px", borderRadius: "6px" }}>
              <Wrench size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#0b1f41", fontWeight: 800 }}>
                Issue Desilting Work Order
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                Brihanmumbai Municipal Corporation Stormwater Division
              </p>
            </div>
          </div>
          <button
            className="di-btn di-btn-secondary"
            style={{ padding: "4px", borderRadius: "50%" }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="di-modal-body">
            {/* Hotspot Target */}
            <div className="di-form-group">
              <label className="di-form-label">Target Chronic Hotspot *</label>
              <select
                className="di-select"
                style={{ width: "100%", padding: "8px 12px" }}
                value={selectedHotspotId}
                onChange={(e) => {
                  setSelectedHotspotId(e.target.value);
                  const h = hotspots.find((x) => x.id === e.target.value);
                  if (h) {
                    setPriority(h.riskScore >= 75 ? "Critical" : "High");
                    setNotes(`Immediate maintenance required for ${h.name}: ${h.primaryCause}`);
                  }
                }}
                required
              >
                {hotspots.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.id} — {h.name} ({h.ward}) [Risk: {h.riskScore || 50}/100]
                  </option>
                ))}
              </select>
            </div>

            {/* Work Type */}
            <div className="di-form-group">
              <label className="di-form-label">Maintenance Work Scope *</label>
              <select
                className="di-select"
                style={{ width: "100%", padding: "8px 12px" }}
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
              >
                <option value="Mechanical Desilting & Trash Rack Clearance">
                  Mechanical Desilting & Trash Rack Clearance
                </option>
                <option value="Hydro-Jet Root Extraction & Pipe Relining">
                  Hydro-Jet Root Extraction & Pipe Relining
                </option>
                <option value="Debris Clearing & Silt Flushing">
                  Debris Clearing & Silt Flushing
                </option>
                <option value="Flap Gate Silt Dredging & Lubrication">
                  Flap Gate Silt Dredging & Lubrication
                </option>
                <option value="Catchbasin Inlet Excavation">
                  Catchbasin Inlet Excavation
                </option>
              </select>
            </div>

            {/* Priority & Due Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="di-form-group">
                <label className="di-form-label">Priority Level *</label>
                <select
                  className="di-select"
                  style={{ width: "100%", padding: "8px 12px" }}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Critical">Critical (Immediate)</option>
                  <option value="High">High (Within 24-48h)</option>
                  <option value="Moderate">Moderate (Standard)</option>
                  <option value="Low">Low (Scheduled)</option>
                </select>
              </div>

              <div className="di-form-group">
                <label className="di-form-label">Target Due Date *</label>
                <input
                  type="date"
                  className="di-form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Assigned Team */}
            <div className="di-form-group">
              <label className="di-form-label">Assigned Municipal Maintenance Team *</label>
              <select
                className="di-select"
                style={{ width: "100%", padding: "8px 12px" }}
                value={assignedTeam}
                onChange={(e) => setAssignedTeam(e.target.value)}
              >
                <option value="BMC Ward 72 Stormwater Mech Unit 01">
                  BMC Ward 72 Stormwater Mech Unit 01 (Suction Truck & Dredger)
                </option>
                <option value="Ward 72 Rapid Drainage Gang 04">
                  Ward 72 Rapid Drainage Gang 04 (Manual & Mechanical Jetting)
                </option>
                <option value="Specialized Trenchless Drain Techs">
                  Specialized Trenchless Drain Techs (Endoscopic / Root Cutters)
                </option>
                <option value="Coastal Sluice Maintenance Division">
                  Coastal Sluice Maintenance Division (Tidal Gate & Outfalls)
                </option>
              </select>
            </div>

            {/* Notes */}
            <div className="di-form-group">
              <label className="di-form-label">Operational Notes & Directives</label>
              <textarea
                className="di-form-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include access instructions, high tide timings, or machinery requirements..."
              />
            </div>
          </div>

          <div className="di-modal-foot">
            <button
              type="button"
              className="di-btn di-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="di-btn di-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Issuing Order..." : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
