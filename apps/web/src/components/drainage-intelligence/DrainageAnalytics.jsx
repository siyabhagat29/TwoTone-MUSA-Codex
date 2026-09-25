import React from "react";
import { BarChart3, TrendingUp, CheckCircle2, Clock, Wrench, ShieldAlert } from "lucide-react";

export default function DrainageAnalytics({
  hotspots = [],
  workOrders = []
}) {
  const completedOrders = workOrders.filter((w) => w.status === "Completed").length;
  const inProgressOrders = workOrders.filter((w) => w.status === "In Progress" || w.status === "Awaiting Verification").length;
  const assignedOrders = workOrders.filter((w) => w.status === "Assigned").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Summary Banner */}
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
              <BarChart3 size={12} /> HISTORICAL DRAINAGE AUDIT
            </span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Monsoon Desilting Performance & Chronic Recurrence
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#0b1f41", fontWeight: 800 }}>
            Operational Performance & Recurrence Trends
          </h3>
        </div>

        <div style={{ fontSize: "12px", color: "#64748b" }}>
          Average Desilting Turnaround: <b style={{ color: "#16a34a" }}>28 Hours</b>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px"
        }}
      >
        {/* Card 1: Work Order Execution */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0b1f41" }}>
            Work Order Fulfillment Ratio
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>Completed & Verified</span>
                <b>{completedOrders} Orders ({workOrders.length ? Math.round((completedOrders / workOrders.length) * 100) : 0}%)</b>
              </div>
              <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    background: "#16a34a",
                    width: `${workOrders.length ? (completedOrders / workOrders.length) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span style={{ color: "#2563eb", fontWeight: 600 }}>In Progress / Field Action</span>
                <b>{inProgressOrders} Orders ({workOrders.length ? Math.round((inProgressOrders / workOrders.length) * 100) : 0}%)</b>
              </div>
              <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    background: "#2563eb",
                    width: `${workOrders.length ? (inProgressOrders / workOrders.length) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span style={{ color: "#ea580c", fontWeight: 600 }}>Assigned / Pending Dispatch</span>
                <b>{assignedOrders} Orders ({workOrders.length ? Math.round((assignedOrders / workOrders.length) * 100) : 0}%)</b>
              </div>
              <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    background: "#ea580c",
                    width: `${workOrders.length ? (assignedOrders / workOrders.length) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Root Obstructions Breakdown */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0b1f41" }}>
            Dominant Drainage Obstruction Causes
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 8px", background: "#f8fafc", borderRadius: "6px" }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>Solid Waste & Plastic Trash Racks</span>
              <span style={{ fontWeight: 700, color: "#dc2626" }}>45% of incidents</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 8px", background: "#f8fafc", borderRadius: "6px" }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>Silt & Sediment Trap Filling</span>
              <span style={{ fontWeight: 700, color: "#ea580c" }}>30% of incidents</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 8px", background: "#f8fafc", borderRadius: "6px" }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>Tree Roots & Underground Joints</span>
              <span style={{ fontWeight: 700, color: "#d97706" }}>15% of incidents</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 8px", background: "#f8fafc", borderRadius: "6px" }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>Tidal Inundation & Flap Gate Stagnation</span>
              <span style={{ fontWeight: 700, color: "#0284c7" }}>10% of incidents</span>
            </div>
          </div>
        </div>

        {/* Card 3: Ward-Wise Hotspot Concentration */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0b1f41" }}>
            Ward-Wise Hotspot Distribution
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span>Ward 72 (Andheri West / S.V. Road):</span>
              <b style={{ color: "#dc2626" }}>2 Chronic Sites (Avg Risk: 74)</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span>Ward 73 (Andheri East / Marol):</span>
              <b style={{ color: "#ea580c" }}>2 Chronic Sites (Avg Risk: 40)</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span>Ward K-West Coastal Belt:</span>
              <b style={{ color: "#2563eb" }}>1 Marine Outfall Corridor</b>
            </div>

            <div
              style={{
                marginTop: "6px",
                padding: "8px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "6px",
                fontSize: "11px",
                color: "#166534"
              }}
            >
              ✓ <b>Monsoon Readiness Target:</b> All critical culverts scheduled for mechanized desilting completion before June 1st.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
