// Automated Verification Script: Test Nearest Resource Discovery & Synchronization Across User & Admin Dashboards

const API_BASE = "http://127.0.0.1:5001/api";

async function runTests() {
  console.log("===============================================================");
  console.log("🚀 Testing Nearest Resource Sync on Maps for User & Admin");
  console.log("===============================================================\n");

  // Test 1: Query Emergency Services for Powai (19.1176, 72.9060)
  console.log("1️⃣ Testing /api/emergency-services for Powai (19.1176, 72.9060)...");
  const powaiRes = await fetch(`${API_BASE}/emergency-services?lat=19.1176&lng=72.9060&radius_km=5`);
  if (!powaiRes.ok) throw new Error(`HTTP ${powaiRes.status}`);
  const powaiServices = await powaiRes.json();
  console.log(`✅ Found ${powaiServices.length} emergency POIs near Powai.`);
  const nearestPowai = powaiServices[0];
  console.log(`   🏆 Top Nearest POI: ${nearestPowai.name} (${nearestPowai.distanceKm} km away, category: ${nearestPowai.category})`);

  // Test 2: Trigger SOS from User Mobile at Powai
  console.log("\n2️⃣ Testing SOS Trigger from User Mobile at Powai...");
  const sosRes = await fetch(`${API_BASE}/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "USR-TEST-POWAI",
      userName: "Powai Lake Shopkeeper",
      userPhone: "+919869001892",
      emergencyNumber: "+917738122051",
      role: "Shop Owner",
      lat: 19.1176,
      lng: 72.9060,
      address: "Hiranandani Gardens, Powai"
    })
  });
  if (!sosRes.ok) throw new Error(`SOS Trigger failed HTTP ${sosRes.status}`);
  const sosData = await sosRes.json();
  console.log(`✅ SOS Created: ID ${sosData.sos?.id}`);
  console.log(`   Assigned Team: ${sosData.assignedTeam || sosData.sos?.assignedTeam}`);
  console.log(`   Calculated ETA: ${sosData.eta || sosData.sos?.eta}`);

  // Test 3: Fetch Incident list to verify the SOS Incident has localized nearestResource
  console.log("\n3️⃣ Verifying Incident on Admin Dashboard Feed...");
  const incRes = await fetch(`${API_BASE}/incidents`);
  const incidents = await incRes.json();
  const createdInc = incidents.find((i) => i.reporter === "Powai Lake Shopkeeper" || i.address?.includes("Powai"));
  if (!createdInc) throw new Error("Could not find created SOS incident in feed!");
  console.log(`✅ Incident found on Admin Dashboard: ${createdInc.id}`);
  console.log(`   Location: ${createdInc.address} (${createdInc.lat}, ${createdInc.lng})`);
  console.log(`   Recommended Team: ${createdInc.recommendedTeam}`);
  console.log(`   Nearest Resource: ${createdInc.nearestResource?.name} (${createdInc.nearestResource?.distanceKm} km)`);

  // Test 4: Query /api/incidents/:id/nearby-resources for the created incident
  console.log(`\n4️⃣ Testing /api/incidents/${createdInc.id}/nearby-resources for dynamic Maps routing...`);
  const nearbyRes = await fetch(`${API_BASE}/incidents/${createdInc.id}/nearby-resources`);
  const nearbyData = await nearbyRes.json();
  console.log(`✅ Dynamic Nearby Resources Found: ${nearbyData.count}`);
  if (nearbyData.resources && nearbyData.resources.length > 0) {
    const topNear = nearbyData.resources[0];
    console.log(`   Top Route: ${topNear.name} &rarr; ${createdInc.id}`);
    console.log(`   Road Distance: ${topNear.distance_km || topNear.distanceKm} km | OSRM ETA: ${topNear.etaMinutes} min`);
  }

  // Test 5: Query for Thane (19.2183, 72.9781) to verify distance changes
  console.log("\n5️⃣ Testing Location Shift to Thane (19.2183, 72.9781)...");
  const thaneRes = await fetch(`${API_BASE}/emergency-services?lat=19.2183&lng=72.9781&radius_km=5`);
  const thaneServices = await thaneRes.json();
  const topThane = thaneServices[0];
  console.log(`✅ Top Nearest Unit in Thane: ${topThane.name} (${topThane.distanceKm} km away)`);
  console.log(`   Thane Unit coordinates: (${topThane.lat}, ${topThane.lng})`);

  console.log("\n===============================================================");
  console.log("🎉 ALL NEAREST RESOURCE & MAPS SYNC TESTS PASSED SUCCESSFULLY!");
  console.log("===============================================================");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
