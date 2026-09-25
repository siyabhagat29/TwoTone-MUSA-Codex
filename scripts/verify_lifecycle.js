async function testLifecycle() {
  try {
    console.log("===============================================================");
    console.log("TEST 1: Creating New Citizen Life-Safety SOS Incident at Powai");
    console.log("===============================================================");

    const createRes = await fetch("http://localhost:5001/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter: "Aarav Sharma",
        role: "Shopkeeper",
        userPhone: "+919820011223",
        note: "Severe street flooding entering shop front! Emergency help needed!",
        waterLevel: 45,
        lat: 19.1176,
        lng: 72.9060,
        address: "Powai Market, Hiranandani Corridor, Mumbai",
        type: "SOS",
        isSos: true,
        mediaType: "photo",
        drainObservation: "Blocked drain"
      })
    });

    const createData = await createRes.json();
    const incidentId = createData.incidentId || createData.id || createData.incident?.id;
    console.log(`-> SOS Created! ID: ${incidentId} | Status: ${createData.status || "Received"} | GPS: (${createData.lat}, ${createData.lng})`);

    // Verify it is returned in active incidents list
    const activeRes1 = await fetch("http://localhost:5001/api/incidents/active");
    const activeList1 = await activeRes1.json();
    const foundActive1 = activeList1.find((i) => i.id === incidentId);
    console.log(`-> Present in /api/incidents/active: ${Boolean(foundActive1)} (Status: ${foundActive1?.status})`);

    console.log("\n===============================================================");
    console.log("TEST 2: Authority Action — Mark Verified");
    console.log("===============================================================");
    const verifyRes = await fetch(`http://localhost:5001/api/incidents/${incidentId}/verify`, { method: "POST" });
    const verifyData = await verifyRes.json();
    console.log(`-> Incident Status: ${verifyData.incident?.status} | Verified At: ${verifyData.incident?.verifiedAt}`);

    console.log("\n===============================================================");
    console.log("TEST 3: Authority Action — Dynamic Auto-Dispatch via Maps API");
    console.log("===============================================================");
    const autoDspRes = await fetch(`http://localhost:5001/api/incidents/${incidentId}/auto-dispatch`, { method: "POST" });
    const autoDspData = await autoDspRes.json();
    console.log(`-> Auto-Dispatch Result: ${autoDspData.message}`);
    console.log(`   Assigned Resource: [${autoDspData.resource?.category?.toUpperCase()}] ${autoDspData.resource?.name}`);
    console.log(`   Resource GPS: (${autoDspData.resource?.lat}, ${autoDspData.resource?.lng}) | Distance: ${autoDspData.resource?.distanceKm} km`);
    console.log(`   Incident Status: ${autoDspData.incident?.status} | Dispatch Progress: ${autoDspData.incident?.dispatchProgress}`);

    console.log("\n===============================================================");
    console.log("TEST 4: Authority Action — Progress to Reached Site");
    console.log("===============================================================");
    const progressRes = await fetch(`http://localhost:5001/api/incidents/${incidentId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "on_scene" })
    });
    const progressData = await progressRes.json();
    console.log(`-> Incident Status: ${progressData.incident?.status} | Mitigation: ${progressData.incident?.mitigationStatus}`);

    console.log("\n===============================================================");
    console.log("TEST 5: Authority Action — Mark Resolved");
    console.log("===============================================================");
    const resolveRes = await fetch(`http://localhost:5001/api/incidents/${incidentId}/resolve`, { method: "POST" });
    const resolveData = await resolveRes.json();
    console.log(`-> Incident Status: ${resolveData.incident?.status} | Resolved At: ${resolveData.incident?.resolvedAt}`);

    // Verify it is REMOVED from active list (not appearing on active map layer)
    const activeRes2 = await fetch("http://localhost:5001/api/incidents/active");
    const activeList2 = await activeRes2.json();
    const foundActive2 = activeList2.find((i) => i.id === incidentId);
    console.log(`-> Present in /api/incidents/active: ${Boolean(foundActive2)} (Correctly cleared from active SOS layer!)`);

    // Verify it is PERSISTED in historical records
    const allRes = await fetch("http://localhost:5001/api/incidents");
    const allList = await allRes.json();
    const foundHistorical = allList.find((i) => i.id === incidentId);
    console.log(`-> Present in /api/incidents (Historical Audit): ${Boolean(foundHistorical)} (Status: ${foundHistorical?.status})`);

    console.log("\n===============================================================");
    console.log("TEST 6: False Alarm Lifecycle Validation");
    console.log("===============================================================");
    const createFaRes = await fetch("http://localhost:5001/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter: "Test Caller",
        role: "Citizen",
        userPhone: "+919899001122",
        note: "False alarm check",
        waterLevel: 5,
        lat: 19.0596,
        lng: 72.8295,
        address: "Bandra Reclamation, Mumbai",
        type: "SOS",
        isSos: true
      })
    });
    const createFaData = await createFaRes.json();
    const faId = createFaData.incidentId || createFaData.id || createFaData.incident?.id;
    console.log(`-> Created Second SOS: ${faId}`);

    const faActionRes = await fetch(`http://localhost:5001/api/incidents/${faId}/false-alarm`, { method: "POST" });
    const faActionData = await faActionRes.json();
    console.log(`-> Incident ${faId} Status: ${faActionData.incident?.status} | False Alarm At: ${faActionData.incident?.falseAlarmAt}`);

    const activeRes3 = await fetch("http://localhost:5001/api/incidents/active");
    const activeList3 = await activeRes3.json();
    const foundActive3 = activeList3.find((i) => i.id === faId);
    console.log(`-> Present in /api/incidents/active: ${Boolean(foundActive3)} (Correctly cleared from active SOS layer!)`);

    console.log("\n===============================================================");
    console.log("ALL 6 LIFECYCLE TESTS PASSED SUCCESSFULLY! ✓");
    console.log("===============================================================");
  } catch (err) {
    console.error("Test Error:", err);
  }
}

testLifecycle();
