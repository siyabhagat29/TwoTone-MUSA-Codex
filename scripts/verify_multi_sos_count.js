import { store } from "../server/src/store.js";

async function verifyMultiSosCount() {
  console.log("==================================================");
  console.log("🧪 TESTING MULTI-SOS GENERATION & COUNT DISPLAY");
  console.log("==================================================\n");

  await store.init();

  // Clean up any test SOS
  store.incidents = (store.incidents || []).filter(i => !i.id.startsWith("TEST-"));
  store.alerts = (store.alerts || []).filter(a => !a.id.startsWith("TEST-"));

  const baseLat = 19.1350;
  const baseLng = 72.8500;
  const locationName = "Near Juhu Circle, Andheri West";

  console.log("Step 1: Triggering 1st SOS from location...");
  const firstSos = await store.triggerSos({
    userName: "Citizen Alpha",
    userPhone: "+91 98200 11111",
    emergencyNumber: "+91 98200 00001",
    role: "Resident",
    lat: baseLat,
    lng: baseLng,
    address: locationName,
    timestamp: new Date().toISOString()
  });

  console.log(`-> First SOS status: ${firstSos.status}, Incident ID: ${firstSos.incident_id || firstSos.incident?.id}, Count: ${firstSos.reporter_count}`);
  if (firstSos.reporter_count !== 1) {
    throw new Error(`Expected reporter_count = 1 on first SOS, got ${firstSos.reporter_count}`);
  }

  console.log("\nStep 2: Triggering 2nd SOS within 100m (same sector)...");
  const secondSos = await store.triggerSos({
    userName: "Citizen Beta",
    userPhone: "+91 98200 22222",
    emergencyNumber: "+91 98200 00002",
    role: "Shop Owner",
    lat: baseLat + 0.0005, // ~55m away
    lng: baseLng + 0.0004,
    address: "Shop #4, Juhu Circle Market",
    timestamp: new Date().toISOString()
  });

  console.log(`-> Second SOS status: ${secondSos.status}, Merged ID: ${secondSos.incident_id}, Count: ${secondSos.reporter_count}`);
  if (secondSos.status !== "merged" || secondSos.reporter_count !== 2) {
    throw new Error(`Expected status 'merged' with reporter_count = 2, got ${JSON.stringify(secondSos)}`);
  }

  console.log("\nStep 3: Triggering 3rd SOS within 150m (same sector)...");
  const thirdSos = await store.triggerSos({
    userName: "Citizen Gamma",
    userPhone: "+91 98200 33333",
    emergencyNumber: "+91 98200 00003",
    role: "Motorist",
    lat: baseLat + 0.0009, // ~100m away
    lng: baseLng + 0.0002,
    address: "Near Juhu Signal",
    timestamp: new Date().toISOString()
  });

  console.log(`-> Third SOS status: ${thirdSos.status}, Merged ID: ${thirdSos.incident_id}, Count: ${thirdSos.reporter_count}`);
  if (thirdSos.status !== "merged" || thirdSos.reporter_count !== 3) {
    throw new Error(`Expected status 'merged' with reporter_count = 3, got ${JSON.stringify(thirdSos)}`);
  }

  console.log("\nStep 4: Validating Incident Record in Store...");
  const clusterIncident = store.incidents.find(i => i.id === secondSos.incident_id);
  if (!clusterIncident) throw new Error("Cluster incident not found in store");

  console.log(`- Incident ID: ${clusterIncident.id}`);
  console.log(`- reporter_count: ${clusterIncident.reporter_count}`);
  console.log(`- reports array length: ${clusterIncident.reports.length}`);
  console.log(`- Reporters listed: ${clusterIncident.reports.map(r => `${r.user_name} (${r.user_phone})`).join(", ")}`);

  if (clusterIncident.reporter_count !== 3 || clusterIncident.reports.length !== 3) {
    throw new Error(`Expected incident reporter_count = 3 and 3 reports, got ${clusterIncident.reporter_count}`);
  }

  console.log("\nStep 5: Validating Alert in Store for SOS count...");
  const matchedAlert = (store.alerts || []).find(a => a.incidentId === clusterIncident.id || a.sosId === clusterIncident.sosId);
  if (!matchedAlert) throw new Error("Matched alert not found for cluster incident");

  console.log(`- Alert ID: ${matchedAlert.id}`);
  console.log(`- Alert reporter_count: ${matchedAlert.reporter_count || matchedAlert.reporterCount}`);
  console.log(`- Alert description: "${matchedAlert.description}"`);

  if ((matchedAlert.reporter_count || matchedAlert.reporterCount) !== 3) {
    throw new Error(`Expected alert reporter count = 3, got ${matchedAlert.reporter_count}`);
  }

  console.log("\n==================================================");
  console.log("✅ ALL MULTI-SOS COUNT GENERATION TESTS PASSED!");
  console.log("==================================================");
}

verifyMultiSosCount().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
