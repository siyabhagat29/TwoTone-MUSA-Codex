// Verification Script: Dynamic Alert Distance & Location Verification
import http from "http";

const API_BASE = "http://localhost:5001";

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {}
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("==================================================");
  console.log("🚀 VARSHARAKSHA ALERTS DISTANCE & LOCATION TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  try {
    // 1. Fetch alerts without location coordinates
    console.log("--- Test 1: Alerts without GPS coordinates (Permission Denied / Initial) ---");
    const resNoLoc = await fetchJson(`${API_BASE}/api/alerts`);
    assert(resNoLoc.status === 200, "GET /api/alerts returns HTTP 200");
    const alertsNoLoc = resNoLoc.body;
    assert(Array.isArray(alertsNoLoc) && alertsNoLoc.length > 0, `Alerts array populated (${alertsNoLoc.length} alerts)`);

    // Verify fields of alerts
    const firstAlert = alertsNoLoc[0];
    assert(firstAlert.id != null, `Alert has ID: ${firstAlert.id}`);
    assert(firstAlert.title != null, `Alert has title: ${firstAlert.title}`);
    assert(firstAlert.source != null, `Alert has source: ${firstAlert.source} (${firstAlert.sourceName})`);
    assert(firstAlert.severity != null || firstAlert.level != null, `Alert has severity/level: ${firstAlert.severity || firstAlert.level}`);
    assert(firstAlert.distance_km === null, "Alert distance is null when GPS is unavailable (No fake distances)");
    assert(firstAlert.distance_type === "unavailable", "distance_type marked as 'unavailable'");

    // 2. Fetch alerts with User at Station Road (19.132, 72.848)
    console.log("\n--- Test 2: User at Andheri / Station Road (19.132, 72.848) ---");
    const resStation = await fetchJson(`${API_BASE}/api/alerts?lat=19.132&lng=72.848`);
    assert(resStation.status === 200, "GET /api/alerts?lat=19.132&lng=72.848 returns HTTP 200");
    const alertsStation = resStation.body;

    const floodAlertStation = alertsStation.find((a) => a.zoneId === "Z-01" || (a.source === "flood" && a.id.includes("01")));
    if (floodAlertStation) {
      assert(floodAlertStation.distance_km !== null, `Station Road alert distance calculated: ${floodAlertStation.distance_km} km`);
      assert(floodAlertStation.distance_km < 1.0, `Station Road is close to user (< 1.0 km): ${floodAlertStation.distance_km} km`);
      assert(floodAlertStation.location_name != null, `Alert has location name: ${floodAlertStation.location_name}`);
      assert(floodAlertStation.eta_min != null, `Alert has ETA: ~${floodAlertStation.eta_min} min`);
    }

    const lightningAlert = alertsStation.find((a) => a.source === "lightning" || a.type === "lightning");
    if (lightningAlert) {
      assert(lightningAlert.distance_km !== null, `Lightning alert distance calculated: ${lightningAlert.distance_km} km`);
      assert(lightningAlert.location_name != null, `Lightning location name: ${lightningAlert.location_name}`);
    }

    // 3. Move User to Powai / Ghatkopar (19.119, 72.905)
    console.log("\n--- Test 3: Move User to Powai / Ghatkopar (19.119, 72.905) ---");
    const resPowai = await fetchJson(`${API_BASE}/api/alerts?lat=19.119&lng=72.905`);
    assert(resPowai.status === 200, "GET /api/alerts?lat=19.119&lng=72.905 returns HTTP 200");
    const alertsPowai = resPowai.body;
    const floodAlertPowai = alertsPowai.find((a) => a.zoneId === "Z-01" || (a.source === "flood" && a.id.includes("01")));
    if (floodAlertPowai) {
      assert(floodAlertPowai.distance_km > 4.0, `Station Road distance from Powai is larger (> 4 km): ${floodAlertPowai.distance_km} km`);
      if (floodAlertStation) {
        assert(floodAlertPowai.distance_km > floodAlertStation.distance_km, `Distance increased as user moved further away (${floodAlertStation.distance_km} km -> ${floodAlertPowai.distance_km} km)`);
      }
    }

    // 4. Move User to Thane (19.218, 72.978)
    console.log("\n--- Test 4: Move User to Thane (19.218, 72.978) ---");
    const resThane = await fetchJson(`${API_BASE}/api/alerts?lat=19.218&lng=72.978`);
    assert(resThane.status === 200, "GET /api/alerts?lat=19.218&lng=72.978 returns HTTP 200");
    const alertsThane = resThane.body;
    const floodAlertThane = alertsThane.find((a) => a.zoneId === "Z-01" || (a.source === "flood" && a.id.includes("01")));
    if (floodAlertThane) {
      assert(floodAlertThane.distance_km > 12.0, `Station Road distance from Thane is much larger (> 12 km): ${floodAlertThane.distance_km} km`);
    }

    // 5. Test Alert Feedback Endpoint
    console.log("\n--- Test 5: Alert Feedback (Mark Resolved) ---");
    const targetAlertId = alertsStation[0]?.id;
    if (targetAlertId) {
      const fbRes = await fetchJson(`${API_BASE}/api/alerts/${targetAlertId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { type: "RESOLVED", role: "Ward Admin" }
      });
      assert(fbRes.status === 200, `POST /api/alerts/${targetAlertId}/feedback returns HTTP 200`);
      assert(fbRes.body?.success === true, "Alert feedback returned success: true");
    }

  } catch (err) {
    console.error("Test execution error:", err);
    assert(false, `Test exception: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log(`📊 RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log("==================================================");
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
