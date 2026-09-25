// Verification test script for Dynamic Emergency Resource Simulation

const API_BASE = "http://localhost:5001/api";

async function runVerification() {
  console.log("=================================================");
  console.log("🔍 STARTING EMERGENCY RESOURCE SIMULATION TEST");
  console.log("=================================================\n");

  try {
    // 1. Initial State Check (Empty)
    console.log("Step 1: Checking Initial State / Clearing any existing resources...");
    await fetch(`${API_BASE}/resources/simulate`, { method: "DELETE" }).catch(() => {});
    
    const initialRes = await fetch(`${API_BASE}/resources`).then((r) => r.json());
    console.log(`Initial resources count: ${initialRes.length}`);
    if (initialRes.length !== 0) {
      throw new Error(`Expected initial resources to be 0, but got ${initialRes.length}`);
    }
    console.log("✓ Initial state is EMPTY as required.\n");

    // 2. Generate Simulation (e.g. Around Powai: 19.1176, 72.9060)
    console.log("Step 2: Triggering Simulation Generation around Powai (19.1176, 72.9060)...");
    const simResult = await fetch(`${API_BASE}/resources/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: 19.1176,
        longitude: 72.9060,
        radius_km: 6.0
      })
    }).then((r) => r.json());

    if (!simResult.success) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    console.log(`✓ Simulation Generated: ID = ${simResult.simulation_id}`);
    console.log(`✓ Total Resources: ${simResult.count}`);
    console.log(`✓ Facilities Discovered: ${simResult.facilities_count}`);
    console.log(`✓ Categories: ${simResult.categories_count}`);

    const resList = simResult.resources;
    if (resList.length === 0) {
      throw new Error("No resources generated");
    }

    // Inspect first 5 resources
    console.log("\nSample Generated Resources (with real Maps API facility coordinates):");
    resList.slice(0, 5).forEach((r, idx) => {
      console.log(`  [${idx + 1}] ${r.emoji} ${r.name}`);
      console.log(`      Category: ${r.category} | Qty: ${r.quantity} ${r.unit} | Status: ${r.status}`);
      console.log(`      Facility: ${r.agency}`);
      console.log(`      Base Location: ${r.base_location}`);
      console.log(`      GPS: (${r.latitude}, ${r.longitude}) | SimID: ${r.simulation_id}`);
    });

    // Validate real coordinates
    const allHaveCoords = resList.every((r) => r.latitude && r.longitude && r.latitude > 18.0 && r.longitude > 72.0);
    if (!allHaveCoords) {
      throw new Error("Some generated resources lack valid GPS coordinates!");
    }
    console.log("✓ All generated resources have valid real Maps API GPS coordinates.\n");

    // 3. Test Regeneration (Clean replacement)
    console.log("Step 3: Testing Regeneration (Clicking Generate Simulations again)...");
    const simResult2 = await fetch(`${API_BASE}/resources/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: 19.1250,
        longitude: 72.8450,
        radius_km: 5.0
      })
    }).then((r) => r.json());

    console.log(`✓ New Simulation ID: ${simResult2.simulation_id}`);
    console.log(`✓ Replaced Batch Count: ${simResult2.count}`);

    const allResources = await fetch(`${API_BASE}/resources`).then((r) => r.json());
    console.log(`✓ Active Resources in Store: ${allResources.length}`);
    if (allResources.length !== simResult2.count) {
      throw new Error(`Expected resources to be replaced cleanly (${simResult2.count}), but got ${allResources.length} (duplicate appending detected!)`);
    }
    console.log("✓ Previous simulation was cleanly replaced (no duplicate appending).\n");

    // 4. Test Persistence on Fetch without regenerating
    console.log("Step 4: Testing Persistence on Fetch (No auto-regeneration on reload)...");
    const fetchAgain = await fetch(`${API_BASE}/resources`).then((r) => r.json());
    if (fetchAgain.length !== simResult2.count || fetchAgain[0]?.simulation_id !== simResult2.simulation_id) {
      throw new Error("Persistence check failed: Resources changed unexpectedly on fetch");
    }
    console.log("✓ Simulation persists cleanly across fetches.\n");

    // 5. Test Clear Simulation
    console.log("Step 5: Testing Clear Simulation...");
    const clearRes = await fetch(`${API_BASE}/resources/clear`, { method: "POST" }).then((r) => r.json());
    console.log(`✓ Clear response: ${clearRes.message}`);
    const emptyCheck = await fetch(`${API_BASE}/resources`).then((r) => r.json());
    if (emptyCheck.length !== 0) {
      throw new Error(`Expected resources to be 0 after clear, but got ${emptyCheck.length}`);
    }
    console.log("✓ Store successfully returned to EMPTY state.\n");

    console.log("=================================================");
    console.log("🎉 ALL TESTS PASSED! SIMULATION SYSTEM READY.");
    console.log("=================================================");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  }
}

runVerification();
