// Verification script for Authority Dashboard Live Risk Map Zone Interaction and Details
const API_BASE = "http://localhost:5001/api";

console.log("==================================================");
console.log("🧪 VERIFYING ZONE INTERACTION & ZONE DETAILS API");
console.log("==================================================");

async function runTests() {
  try {
    // 1. Fetch all zones
    console.log("Step 1: Querying all zones from /api/zones...");
    const zonesRes = await fetch(`${API_BASE}/zones`);
    if (!zonesRes.ok) throw new Error(`HTTP ${zonesRes.status}`);
    const zones = await zonesRes.json();
    console.log(`-> Discovered ${zones.length} zones in municipal registry:`);
    zones.forEach((z) => {
      console.log(`   • [${z.id}] ${z.name} (${z.ward}) - Risk: ${z.risk}/100, Rain: ${z.rainfall || 0}mm, Cause: "${z.cause || 'Normal'}"`);
    });

    if (zones.length === 0) {
      throw new Error("No zones found in store");
    }

    // 2. Fetch specific zone by ID
    const sampleZone = zones[0];
    console.log(`\nStep 2: Fetching individual zone details via /api/zones/${sampleZone.id}...`);
    const singleRes = await fetch(`${API_BASE}/zones/${sampleZone.id}`);
    if (!singleRes.ok) throw new Error(`Failed to fetch /api/zones/${sampleZone.id}: ${singleRes.status}`);
    const singleZone = await singleRes.json();

    console.log(`-> Zone Details Retrieved:`);
    console.log(`   ID: ${singleZone.id}`);
    console.log(`   Name: ${singleZone.name}`);
    console.log(`   Ward: ${singleZone.ward}`);
    console.log(`   Coordinates: (${singleZone.lat}, ${singleZone.lng})`);
    console.log(`   Risk Score: ${singleZone.risk}/100`);
    console.log(`   Rainfall: ${singleZone.rainfall} mm/hr`);
    console.log(`   Water Depth: ${singleZone.waterLevel} cm (Trend: ${singleZone.trend})`);
    console.log(`   Diagnosis: ${singleZone.cause}`);

    if (singleZone.id !== sampleZone.id) {
      throw new Error(`Zone ID mismatch: expected ${sampleZone.id}, got ${singleZone.id}`);
    }

    // 3. Query active incidents connected to this zone
    console.log(`\nStep 3: Checking incidents mapped to Zone ${singleZone.id}...`);
    const incRes = await fetch(`${API_BASE}/incidents`);
    const incidents = await incRes.json();
    const zoneIncidents = incidents.filter((inc) => inc.zoneId === singleZone.id);
    console.log(`-> Found ${zoneIncidents.length} active incidents linked to Zone ${singleZone.id}:`);
    zoneIncidents.forEach((inc) => {
      console.log(`   • [${inc.id}] ${inc.status} - Severity: ${inc.severity}, Cause: "${inc.cause}"`);
    });

    console.log("\n==================================================");
    console.log("✅ ALL ZONE INTERACTION & DETAILS TESTS PASSED!");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
    process.exit(1);
  }
}

runTests();
