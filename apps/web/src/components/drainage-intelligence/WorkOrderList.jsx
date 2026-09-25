import React, { useState } from "react";
import { Wrench, Plus, CheckCircle2, Clock, AlertCircle, FileText, Check, ShieldCheck } from "lucide-react";

export default function WorkOrderList({
  workOrders = [],
  onCreateWorkOrder,
  onUpdateStatus,
  onSelectHotspotById
}) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const filteredOrders = workOrders.filter((w) => {
    const matchesStatus = filterStatus === "all" || w.status === filterStatus;
    const matchesPriority = filterPriority === "all" || w.priority === filterPriority;
    return matchesStatus && matchesPriority;
  });

  const getPriorityBadge = (p) => {
    if (p === "Critical") return "di-risk-critical";
    if (p === "High") return "di-risk-high";
    if (p === "Moderate") return "di-risk-moderate";
    return "di-risk-low";
  };

  const getStatusColor = (s) => {
    if (s === "Completed") return "#16a34a";
    if (s === "In Progress") return "#2563eb";
    if (s === "Awaiting Verification") return "#ea580c";
    return "#64748b";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top action bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "#ffffff",
          padding: "14px 18px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0"
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>FILTER:</span>
          <select
            className="di-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Awaiting Verification">Awaiting Verification</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            className="di-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>

          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            Showing {filteredOrders.length} of {workOrders.length} orders
          </span>
        </div>

        <button className="di-btn di-btn-primary" onClick={onCreateWorkOrder}>
          <Plus size={15} />
          Create Work Order
        </button>
      </div>

      {/* Orders Table */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}
      >
        <div className="di-table-wrap">
          <table className="di-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Hotspot & Ward</th>
                <th>Work Scope</th>
                <th>Priority</th>
                <th>Assigned Field Team</th>
                <th>Due Date</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    No work orders found matching filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: "#0b1f41" }}>{w.id}</span>
                    </td>
                    <td>
                      <div
                        style={{ cursor: "pointer", color: "#2563eb", fontWeight: 600 }}
                        onClick={() => onSelectHotspotById && onSelectHotspotById(w.hotspotId)}
                        title="Click to view hotspot"
                      >
                        {w.hotspotId} · {w.hotspotName}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{w.ward}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>{w.workType}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", maxWidth: "260px" }}>{w.notes}</div>
                    </td>
                    <td>
                      <span className={`di-risk-badge ${getPriorityBadge(w.priority)}`}>
                        {w.priority}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{w.assignedTeam}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#475569" }}>{w.dueDate}</span>
                    </td>
                    <td style={{ minWidth: "100px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            background: "#e2e8f0",
                            borderRadius: "3px",
                            overflow: "hidden"
                          }}
                        >
                          <div
                            style={{
                              width: `${w.progressPercent || 0}%`,
                              height: "100%",
                              background: w.status === "Completed" ? "#16a34a" : "#2563eb"
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                          {w.progressPercent || 0}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "12px",
                          color: getStatusColor(w.status)
                        }}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {w.status !== "Completed" && (
                          <button
                            className="di-btn-sm"
                            style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a" }}
                            onClick={() =>
                              onUpdateStatus && onUpdateStatus(w.id, { status: "Completed", progressPercent: 100 })
                            }
                            title="Verify and Mark Completed"
                          >
                            <Check size={11} /> Complete
                          </button>
                        )}
                        {w.status === "Assigned" && (
                          <button
                            className="di-btn-sm"
                            onClick={() =>
                              onUpdateStatus && onUpdateStatus(w.id, { status: "In Progress", progressPercent: 40 })
                            }
                            title="Mark In Progress"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
