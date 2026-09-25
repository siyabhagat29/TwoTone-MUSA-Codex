import React from "react";
import { Wrench, RefreshCw, FileText, PlusCircle, ShieldCheck } from "lucide-react";

export default function DrainageHeader({
  onRefresh,
  onExportReport,
  onCreateWorkOrder,
  refreshing = false
}) {
  return (
    <div className="di-header">
      <div className="di-header-left">
        <div className="di-eyebrow">
          <ShieldCheck size={14} />
          MUNICIPAL DRAINAGE COMMAND · PREVENTIVE OPS
        </div>
        <h1 className="di-title">Drainage Intelligence</h1>
        <p className="di-subtitle">
          Monitor chronic hotspots and prevent recurring flooding.
        </p>
      </div>

      <div className="di-header-actions">
        <button
          className="di-btn di-btn-secondary"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh drainage status"
        >
          <RefreshCw size={14} className={refreshing ? "spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

        <button
          className="di-btn di-btn-secondary"
          onClick={onExportReport}
          title="Export official BMC Desilting Directives"
        >
          <FileText size={14} />
          Export Directives
        </button>

        <button
          className="di-btn di-btn-primary"
          onClick={onCreateWorkOrder}
          title="Create a new desilting work order"
        >
          <PlusCircle size={15} />
          Create Work Order
        </button>
      </div>
    </div>
  );
}
