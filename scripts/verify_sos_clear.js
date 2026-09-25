// Test SOS Lifecycle & Dynamic Map Removal
const API_BASE = "http://localhost:5001/api";

async function runTest() {
  console.log("=================================================");
  console.log("🔍 TESTING SOS LIFECYCLE & MAP REMOVAL");
  console.log("=================================================\n");

  try {
    // 1. Trigger a fresh SOS in Powai
    console.log("Step 1: Triggering new SOS emergency in Powai...");
    const sosRes = await fetch(`${API_BASE}/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: "Powai Market Vendor",
        userPhone: "+919869001892",
        role: "Shop Owner",
        lat: 19.1176,
        lng: 72.9060,
        address: "Hiranandani Galleria, Powai"
      })
    }).then((r) => r.json());

    console.log(`✓ SOS Created: ${sosRes.sos?.id || sosRes.incident?.id}`);
    const incidentId = sosRes.incident?.id || sosRes.id;
    console.log(`✓ Incident Record: ${incidentId} (Status: ${sosRes.incident?.status || "ACTIVE_SOS"})\n`);

    // 2. Verify it is in active incidents
    console.log("Step 2: Checking Active Incidents query...");
    const activeIncidents = await fetch(`${API_BASE}/incidents?status=active`).then((r) => r.json());
    const foundActive = activeIncidents.find((i) => i.id === incidentId || i.sosId === sosRes.sos?.id);
    if (!foundActive) {
      throw new Error(`Expected incident ${incidentId} to be active, but not found in active query!`);
    }
    console.log(`✓ Incident ${incidentId} is present in active incidents list.`);

    // 3. Resolve the SOS Incident
    console.log(`\nStep 3: Resolving Incident ${incidentId} via /api/incidents/${incidentId}/resolve...`);
    const resolveRes = await fetch(`${API_BASE}/incidents/${incidentId}/resolve`, {
      method: "POST"
    }).then((r) => r.json());

    if (!resolveRes.success || resolveRes.incident?.status !== "Resolved") {
      throw new Error(`Failed to resolve incident: ${JSON.stringify(resolveRes)}`);
    }
    console.log(`✓ Incident ${incidentId} resolved: Status = "${resolveRes.incident?.status}"`);

    // 4. Verify it is NO LONGER in active incidents / SOS alerts
    console.log("\nStep 4: Verifying SOS is removed from active map/incidents feed...");
    const activeAfterResolve = await fetch(`${API_BASE}/incidents?status=active`).then((r) => r.json());
    const foundAfter = activeAfterResolve.find((i) => i.id === incidentId || i.sosId === sosRes.sos?.id);
    if (foundAfter) {
      throw new Error(`Incident ${incidentId} is still present in active incidents after resolution!`);
    }
    console.log("✓ Verified: Incident is completely excluded from active map feed.");

    const sosAlerts = await fetch(`${API_BASE}/sos`).then((r) => r.json());
    const foundSos = sosAlerts.find((s) => s.id === sosRes.sos?.id || s.incidentId === incidentId);
    if (foundSos) {
      throw new Error(`SOS alert ${sosRes.sos?.id} is still in active SOS alerts list!`);
    }
    console.log("✓ Verified: SOS alert is completely cleared from active SOS stack.");

    console.log("\n=================================================");
    console.log("🎉 SUCCESS: SOS LIFECYCLE & MAP CLEARING VERIFIED!");
    console.log("=================================================");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  }
}

runTest();
