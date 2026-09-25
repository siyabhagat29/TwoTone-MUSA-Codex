import React, { useState } from "react";
import {
  X, MapPin, Building2, Phone, Calendar, Clock, ShieldCheck,
  Send, Wrench, AlertTriangle, Layers, ExternalLink, Activity, Check, CheckCircle2
} from "lucide-react";
import { getAuthorityResourceCategory } from "../../resourceIconUtils.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function ResourceDetailDrawer({
  resource,
  isOpen,
  onClose,
  onUpdateResource,
  onOpenAssignModal,
  onOpenMaintenanceModal,
  notify
}) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, location, deployment, maintenance, history
  const [statusVal, setStatusVal] = useState(resource?.status || "AVAILABLE");
  const [statusNotes, setStatusNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Capacity form
  const [newAvailQty, setNewAvailQty] = useState(resource?.availableQuantity ?? resource?.quantity ?? "");
  const [updatingCapacity, setUpdatingCapacity] = useState(false);

  if (!isOpen || !resource) return null;

  const catInfo = getAuthorityResourceCategory(resource);
  const lat = Number(resource.latitude ?? resource.lat);
  const lng = Number(resource.longitude ?? resource.lng);
  const mapLink = (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0)
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;

  // Handle Lifecycle Status update
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API}/resources/${resource.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusVal, notes: statusNotes, user: "Command Dispatcher" })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update status");

      if (onUpdateResource) onUpdateResource(data.resource);
      if (notify) notify(`Resource status updated to ${statusVal}`);
      setStatusNotes("");
    } catch (err) {
      if (notify) notify(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Capacity Update
  const handleUpdateCapacity = async (e) => {
    e.preventDefault();
    const qty = Number(newAvailQty);
    if (isNaN(qty) || qty < 0) {
      if (notify) notify("Please enter a valid non-negative quantity");
      return;
    }

    setUpdatingCapacity(true);
    try {
      const res = await fetch(`${API}/resources/${resource.id}/capacity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableQuantity: qty })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update capacity");

      if (onUpdateResource) onUpdateResource(data.resource);
      if (notify) notify(`Available quantity updated to ${qty}`);
    } catch (err) {
      if (notify) notify(`Capacity update failed: ${err.message}`);
    } finally {
      setUpdatingCapacity(false);
    }
  };

  return (
    <div className="tt-drawer-backdrop" onClick={onClose}>
      <div className="tt-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="tt-drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "22px" }}>{resource.emoji || catInfo.icon || "📦"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {resource.name}
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>ID: {resource.id}</span>
                <span>•</span>
                <span>{resource.category || resource.resource_type || "Emergency Unit"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              borderRadius: "6px",
              padding: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Subheader: Quick Status Updater */}
        <div style={{ background: "#f1f5f9", padding: "12px 18px", borderBottom: "1px solid #e2e8f0" }}>
          <form onSubmit={handleUpdateStatus} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#475569" }}>
                Operational Lifecycle Status
              </span>
              <span className={`resource-status-pill ${resource.status?.toLowerCase() || "available"}`}>
                {resource.status}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a"
                }}
              >
                <option value="AVAILABLE">Available (Ready for tasking)</option>
                <option value="ASSIGNED">Assigned to Incident</option>
                <option value="EN_ROUTE">En Route to Incident</option>
                <option value="ON_SCENE">On Scene (Operating)</option>
                <option value="RETURNING">Returning to Base</option>
                <option value="LIMITED">Limited Capacity</option>
                <option value="MAINTENANCE">Under Maintenance</option>
                <option value="OFFLINE">Offline / Unavailable</option>
              </select>
              <button
                type="submit"
                className="primary small"
                disabled={updatingStatus || statusVal === resource.status}
                style={{ whiteSpace: "nowrap" }}
              >
                {updatingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>
          </form>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="tt-drawer-tabs">
          <button
            className={`tt-drawer-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview & Capacity
          </button>
          <button
            className={`tt-drawer-tab-btn ${activeTab === "location" ? "active" : ""}`}
            onClick={() => setActiveTab("location")}
          >
            Location
          </button>
          <button
            className={`tt-drawer-tab-btn ${activeTab === "deployment" ? "active" : ""}`}
            onClick={() => setActiveTab("deployment")}
          >
            Deployment
          </button>
          <button
            className={`tt-drawer-tab-btn ${activeTab === "maintenance" ? "active" : ""}`}
            onClick={() => setActiveTab("maintenance")}
          >
            Maintenance
          </button>
          <button
            className={`tt-drawer-tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            Audit Trail
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="tt-drawer-body">
          {/* TAB 1: OVERVIEW & CAPACITY */}
          {activeTab === "overview" && (
            <>
              <div className="tt-drawer-section">
                <div className="tt-drawer-section-title">
                  <Building2 size={13} /> Organization & Facility
                </div>
                <div className="tt-grid-2col">
                  <div>
                    <div className="tt-field-label">Agency / Authority</div>
                    <div className="tt-field-val">{resource.agency || resource.station || "Disaster Management Bureau"}</div>
                  </div>
                  <div>
                    <div className="tt-field-label">Facility Station</div>
                    <div className="tt-field-val">{resource.station || resource.base_location || "Regional Base"}</div>
                  </div>
                  <div>
                    <div className="tt-field-label">Contact / Phone</div>
                    <div className="tt-field-val">{resource.phone || "Radio Channel 4"}</div>
                  </div>
                  <div>
                    <div className="tt-field-label">Simulation Batch</div>
                    <div className="tt-field-val" style={{ fontFamily: "monospace", fontSize: "11px" }}>
                      {resource.simulation_id || "Live System"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Capacity & Inventory Management */}
              <div className="tt-drawer-section">
                <div className="tt-drawer-section-title">
                  <Layers size={13} /> Capacity & Inventory Control
                </div>
                <div className="tt-grid-2col" style={{ marginBottom: "12px" }}>
                  <div>
                    <div className="tt-field-label">Total Units / Fleet Size</div>
                    <div className="tt-field-val">
                      {resource.quantity != null ? `${resource.quantity} ${resource.unit || "Units"}` : "Operational"}
                    </div>
                  </div>
                  <div>
                    <div className="tt-field-label">Available Units</div>
                    <div className="tt-field-val" style={{ color: "#2563eb", fontSize: "15px" }}>
                      {resource.availableQuantity != null
                        ? `${resource.availableQuantity} ${resource.unit || "Units"}`
                        : resource.quantity != null
                        ? `${resource.quantity} ${resource.unit || "Units"}`
                        : "Ready"}
                    </div>
                  </div>
                </div>

                {resource.capacity && (
                  <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                    <b>Equipment Specifications:</b> {resource.capacity}
                  </div>
                )}

                {/* Form to update quantity */}
                <form onSubmit={handleUpdateCapacity} style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <div className="tt-field-label" style={{ fontWeight: "700" }}>Update Available Count:</div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <input
                      type="number"
                      min="0"
                      value={newAvailQty}
                      onChange={(e) => setNewAvailQty(e.target.value)}
                      placeholder="Enter available count"
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1"
                      }}
                    />
                    <button type="submit" className="ghost small" disabled={updatingCapacity}>
                      {updatingCapacity ? "Saving..." : "Save Count"}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* TAB 2: GEOGRAPHIC LOCATION */}
          {activeTab === "location" && (
            <div className="tt-drawer-section">
              <div className="tt-drawer-section-title">
                <MapPin size={13} /> Station Coordinates & Telemetry
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <div className="tt-field-label">Base Address</div>
                  <div className="tt-field-val">{resource.base_location || resource.address || "Mumbai Metropolitan Area"}</div>
                </div>
                <div className="tt-grid-2col">
                  <div>
                    <div className="tt-field-label">Latitude</div>
                    <div className="tt-field-val">{lat ? lat.toFixed(5) : "N/A"}</div>
                  </div>
                  <div>
                    <div className="tt-field-label">Longitude</div>
                    <div className="tt-field-val">{lng ? lng.toFixed(5) : "N/A"}</div>
                  </div>
                </div>
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "10px",
                      padding: "8px 12px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      color: "#1d4ed8",
                      fontSize: "12px",
                      fontWeight: "600",
                      textDecoration: "none"
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>View Coordinates on Google Maps</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DEPLOYMENT */}
          {activeTab === "deployment" && (
            <div className="tt-drawer-section">
              <div className="tt-drawer-section-title">
                <Send size={13} /> Active Incident Deployment
              </div>
              {resource.currentIncidentId ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#1e40af", fontWeight: "700" }}>ASSIGNED INCIDENT</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#1d4ed8", marginTop: "2px" }}>
                      {resource.currentIncidentId}
                    </div>
                    {resource.eta && (
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Estimated Transit Time: <b>{resource.eta}</b>
                      </div>
                    )}
                  </div>
                  <button
                    className="primary small"
                    onClick={() => onOpenAssignModal && onOpenAssignModal(resource)}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Reassign Unit
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <ShieldCheck size={28} style={{ color: "#16a34a", marginBottom: "8px" }} />
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>Unit is Free for Dispatch</div>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 16px" }}>
                    This resource has no active assignment and is in ready operational standby.
                  </p>
                  <button
                    className="primary small"
                    onClick={() => onOpenAssignModal && onOpenAssignModal(resource)}
                  >
                    Assign to Active Incident
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MAINTENANCE */}
          {activeTab === "maintenance" && (
            <div className="tt-drawer-section">
              <div className="tt-drawer-section-title">
                <Wrench size={13} /> Fleet Maintenance & Readiness
              </div>
              <div className="tt-grid-2col">
                <div>
                  <div className="tt-field-label">Service Status</div>
                  <div className="tt-field-val">
                    {resource.maintenance?.status || "Operational"}
                  </div>
                </div>
                <div>
                  <div className="tt-field-label">Assigned Crew</div>
                  <div className="tt-field-val">
                    {resource.maintenance?.assignedTeam || "Base Workshop"}
                  </div>
                </div>
                <div>
                  <div className="tt-field-label">Last Inspection</div>
                  <div className="tt-field-val">
                    {resource.maintenance?.lastInspectionDate
                      ? new Date(resource.maintenance.lastInspectionDate).toLocaleDateString()
                      : "Verified Recent"}
                  </div>
                </div>
                <div>
                  <div className="tt-field-label">Next Inspection Due</div>
                  <div className="tt-field-val">
                    {resource.maintenance?.nextInspectionDate
                      ? new Date(resource.maintenance.nextInspectionDate).toLocaleDateString()
                      : "In 14 Days"}
                  </div>
                </div>
              </div>

              {resource.maintenance?.notes && (
                <div style={{ background: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#334155" }}>
                  <b>Maintenance Log:</b> {resource.maintenance.notes}
                </div>
              )}

              <button
                className="ghost small"
                style={{ marginTop: "10px", alignSelf: "flex-start" }}
                onClick={() => onOpenMaintenanceModal && onOpenMaintenanceModal(resource)}
              >
                <Wrench size={12} /> Record Service / Inspection
              </button>
            </div>
          )}

          {/* TAB 5: AUDIT TRAIL */}
          {activeTab === "history" && (
            <div className="tt-drawer-section">
              <div className="tt-drawer-section-title">
                <Clock size={13} /> Operational History & Audit Trail
              </div>
              {Array.isArray(resource.history) && resource.history.length > 0 ? (
                <div className="tt-timeline">
                  {resource.history.map((h, i) => (
                    <div key={i} className="tt-timeline-item">
                      <div className="tt-timeline-dot" />
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#0B1B3A" }}>
                        {h.event || "STATUS_CHANGE"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569" }}>
                        {h.notes || h.maintenanceStatus || `Status: ${h.status || "Updated"}`}
                      </div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {h.timestamp ? new Date(h.timestamp).toLocaleString() : "Just now"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#64748b", padding: "10px 0" }}>
                  Unit initialized in good operational condition. Telemetry synchronized.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="tt-drawer-footer">
          <button className="ghost small" onClick={onClose}>
            Close
          </button>
          <button
            className="primary small"
            onClick={() => onOpenAssignModal && onOpenAssignModal(resource)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Send size={13} />
            <span>Assign Resource</span>
          </button>
        </div>
      </div>
    </div>
  );
}
