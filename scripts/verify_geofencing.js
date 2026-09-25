const BASE_URL = "http://localhost:5001";

async function main() {
  console.log("=== Testing SOS Geofencing & Deduplication (500m) ===");

  // Use dynamic coordinates for reproducible, idempotent test runs
  const runId = Math.floor(Math.random() * 8000 + 1000);
  const baseLat = 19.3000 + (runId * 0.0001);
  const baseLng = 72.8500 + (runId * 0.0001);

  // Test 1: User A triggers SOS at anchor location (baseLat, baseLng)
  console.log(`\n[Test 1] User A triggers SOS at anchor (${baseLat.toFixed(5)}, ${baseLng.toFixed(5)})...`);
  const resA = await fetch(`${BASE_URL}/api/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: `USR-A-${runId}`,
      userName: `User A (${runId})`,
      userPhone: `+91980000${runId.toString().slice(0, 4)}1`,
      emergencyNumber: `980000${runId.toString().slice(0, 4)}1`,
      role: "Resident",
      latitude: baseLat,
      longitude: baseLng,
      address: `Sector Road ${runId}`,
      timestamp: new Date().toISOString()
    })
  }).then(r => r.json());

  console.log("User A response:", {
    status: resA.status,
    incident_id: resA.incident_id,
    reporter_count: resA.reporter_count,
    message: resA.message
  });
  if (resA.status !== "created" || resA.reporter_count !== 1) {
    throw new Error(`Test 1 Failed: Expected status 'created' and reporter_count 1, got ${JSON.stringify(resA)}`);
  }
  const incidentAId = resA.incident_id;

  // Test 2: User B triggers SOS 150m away from User A
  const bLat = baseLat + 0.0009; // ~100m north
  const bLng = baseLng + 0.0009; // ~100m east -> ~141m distance
  console.log(`\n[Test 2] User B triggers SOS ~140m away from User A (${bLat.toFixed(5)}, ${bLng.toFixed(5)})...`);
  const resB = await fetch(`${BASE_URL}/api/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: `USR-B-${runId}`,
      userName: `User B (${runId})`,
      userPhone: `+91980000${runId.toString().slice(0, 4)}2`,
      emergencyNumber: `980000${runId.toString().slice(0, 4)}2`,
      role: "Shopkeeper",
      latitude: bLat,
      longitude: bLng,
      address: `Market Lane ${runId}`,
      timestamp: new Date().toISOString()
    })
  }).then(r => r.json());

  console.log("User B response:", {
    status: resB.status,
    incident_id: resB.incident_id,
    distance_meters: resB.distance_meters,
    reporter_count: resB.reporter_count,
    message: resB.message
  });
  if (resB.status !== "merged" || resB.incident_id !== incidentAId || resB.reporter_count !== 2) {
    throw new Error(`Test 2 Failed: Expected status 'merged' into ${incidentAId} with reporter_count 2`);
  }

  // Test 3: User C triggers SOS ~380m away from User A
  const cLat = baseLat - 0.0025; // ~275m south
  const cLng = baseLng - 0.0025; // ~275m west -> ~389m distance
  console.log(`\n[Test 3] User C triggers SOS ~380m away from User A (${cLat.toFixed(5)}, ${cLng.toFixed(5)})...`);
  const resC = await fetch(`${BASE_URL}/api/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: `USR-C-${runId}`,
      userName: `User C (${runId})`,
      userPhone: `+91980000${runId.toString().slice(0, 4)}3`,
      emergencyNumber: `980000${runId.toString().slice(0, 4)}3`,
      role: "Pedestrian",
      latitude: cLat,
      longitude: cLng,
      address: `Plaza Corner ${runId}`,
      timestamp: new Date().toISOString()
    })
  }).then(r => r.json());

  console.log("User C response:", {
    status: resC.status,
    incident_id: resC.incident_id,
    distance_meters: resC.distance_meters,
    reporter_count: resC.reporter_count,
    message: resC.message
  });
  if (resC.status !== "merged" || resC.incident_id !== incidentAId || resC.reporter_count !== 3) {
    throw new Error(`Test 3 Failed: Expected status 'merged' into ${incidentAId} with reporter_count 3`);
  }

  // Test 4: User D triggers SOS 750m away from User A (> 500m threshold) -> NEW INCIDENT
  const dLat = baseLat + 0.0050; // ~555m north
  const dLng = baseLng + 0.0050; // ~555m east -> ~785m distance
  console.log(`\n[Test 4] User D triggers SOS ~785m away (> 500m threshold)...`);
  const resD = await fetch(`${BASE_URL}/api/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: `USR-D-${runId}`,
      userName: `User D (${runId})`,
      userPhone: `+91980000${runId.toString().slice(0, 4)}4`,
      emergencyNumber: `980000${runId.toString().slice(0, 4)}4`,
      role: "Resident",
      latitude: dLat,
      longitude: dLng,
      address: `North Junction ${runId}`,
      timestamp: new Date().toISOString()
    })
  }).then(r => r.json());

  console.log("User D response:", {
    status: resD.status,
    incident_id: resD.incident_id,
    reporter_count: resD.reporter_count,
    message: resD.message
  });
  if (resD.status !== "created" || resD.incident_id === incidentAId || resD.reporter_count !== 1) {
    throw new Error(`Test 4 Failed: Expected new incident (different from ${incidentAId})`);
  }

  // Test 5: Verify Incident Details page data for cluster INC-A
  console.log(`\n[Test 5] Fetching details for clustered incident ${incidentAId}...`);
  const clusterDetails = await fetch(`${BASE_URL}/api/incidents/${incidentAId}`).then(r => r.json());
  console.log("Cluster summary:", {
    id: clusterDetails.id,
    status: clusterDetails.status,
    reporter_count: clusterDetails.reporter_count,
    reports_length: clusterDetails.reports?.length,
    primary_center: [clusterDetails.lat, clusterDetails.lng]
  });
  if (clusterDetails.reporter_count !== 3 || clusterDetails.reports.length !== 3) {
    throw new Error("Test 5 Failed: reports array does not contain all 3 individual reporters");
  }
  console.log("Attached reporter GPS records:");
  clusterDetails.reports.forEach((rep, idx) => {
    console.log(`  ${idx + 1}. ${rep.user_name} (${rep.role}) - GPS: (${rep.latitude}, ${rep.longitude}) - +${rep.distance_meters}m from center`);
  });

  // Test 6: Simultaneous SOS requests race condition test (4 devices triggering at the exact same moment within 100m)
  console.log("\n[Test 6] Testing concurrent / simultaneous SOS requests from 4 devices...");
  const simBaseLat = 19.4000 + (runId * 0.0001);
  const simBaseLng = 72.8200 + (runId * 0.0001);

  const simCoords = [
    { id: `SIM-1-${runId}`, name: "Sim User 1", phone: `+9197000${runId}1`, lat: simBaseLat, lng: simBaseLng, addr: "Circle 1" },
    { id: `SIM-2-${runId}`, name: "Sim User 2", phone: `+9197000${runId}2`, lat: simBaseLat + 0.0003, lng: simBaseLng + 0.0003, addr: "Circle 2" },
    { id: `SIM-3-${runId}`, name: "Sim User 3", phone: `+9197000${runId}3`, lat: simBaseLat - 0.0003, lng: simBaseLng - 0.0003, addr: "Circle 3" },
    { id: `SIM-4-${runId}`, name: "Sim User 4", phone: `+9197000${runId}4`, lat: simBaseLat + 0.0005, lng: simBaseLng - 0.0002, addr: "Circle 4" }
  ];

  const concurrentPromises = simCoords.map(u =>
    fetch(`${BASE_URL}/api/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: u.id,
        userName: u.name,
        userPhone: u.phone,
        emergencyNumber: "9800000000",
        role: "Commuter",
        latitude: u.lat,
        longitude: u.lng,
        address: u.addr,
        timestamp: new Date().toISOString()
      })
    }).then(r => r.json())
  );

  const simResults = await Promise.all(concurrentPromises);
  const incidentIds = new Set(simResults.map(r => r.incident_id));
  console.log("Simultaneous requests returned incident IDs:", [...incidentIds]);
  if (incidentIds.size !== 1) {
    throw new Error(`Test 6 Failed: Simultaneous requests created ${incidentIds.size} separate incidents instead of 1 cluster!`);
  }
  const simIncId = [...incidentIds][0];
  const simInc = await fetch(`${BASE_URL}/api/incidents/${simIncId}`).then(r => r.json());
  console.log(`Cluster ${simIncId} reporter count: ${simInc.reporter_count} (reports: ${simInc.reports?.length})`);
  if (simInc.reporter_count !== 4) {
    throw new Error(`Test 6 Failed: Expected 4 reporters in cluster, got ${simInc.reporter_count}`);
  }

  // Test 7: Resolved cluster frees geographic area for future SOS
  console.log(`\n[Test 7] Resolving incident ${incidentAId}...`);
  await fetch(`${BASE_URL}/api/incidents/${incidentAId}/resolve`, { method: "POST" });
  
  console.log("Triggering new SOS at exact location of User A...");
  const resAfterResolve = await fetch(`${BASE_URL}/api/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: `USR-NEW-${runId}`,
      userName: `New Citizen ${runId}`,
      userPhone: `+9198000${runId}99`,
      emergencyNumber: `98000${runId}99`,
      role: "Resident",
      latitude: baseLat,
      longitude: baseLng,
      address: `Sector Road ${runId}`,
      timestamp: new Date().toISOString()
    })
  }).then(r => r.json());

  console.log("Post-resolve SOS response:", {
    status: resAfterResolve.status,
    incident_id: resAfterResolve.incident_id,
    reporter_count: resAfterResolve.reporter_count
  });
  if (resAfterResolve.status !== "created" || resAfterResolve.incident_id === incidentAId) {
    throw new Error(`Test 7 Failed: Expected new incident created after previous was resolved`);
  }

  console.log("\n✅ ALL 7 GEOFENCING & DEDUPLICATION TESTS PASSED SUCCESSFULLY!");
}

main().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
