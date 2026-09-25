async function run() {
  try {
    console.log("Testing Incident INC-1008 Dynamic Discovery from API...");
    const incRes = await fetch('http://localhost:5001/api/incidents/INC-1008/nearby-resources?radius_km=5');
    const incData = await incRes.json();
    console.log(`INC-1008 (${incData.incident?.address || incData.incident?.location} at ${incData.incident?.lat}, ${incData.incident?.lng}):`);
    console.log(`Found ${incData.count} emergency facilities dynamically via Maps API:`);
    incData.resources.slice(0, 5).forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.category.toUpperCase()}] ${r.name}`);
      console.log(`     Address: ${r.address}`);
      console.log(`     GPS: (${r.lat}, ${r.lng}) | Distance: ${r.distanceKm} km | ETA: ${r.etaMinutes} min (${r.etaText})`);
    });

    console.log("\n============================================================");
    console.log("Testing Multi-Location Dynamic Emergency Resource Discovery:");
    console.log("============================================================");

    const testLocations = [
      { name: "Powai", lat: 19.1176, lng: 72.9060 },
      { name: "Ghatkopar", lat: 19.0860, lng: 72.9090 },
      { name: "Thane", lat: 19.2183, lng: 72.9781 },
      { name: "Bandra", lat: 19.0596, lng: 72.8295 }
    ];

    for (const loc of testLocations) {
      console.log(`\nTesting Location: ${loc.name} at GPS (${loc.lat}, ${loc.lng})`);
      const res = await fetch(`http://localhost:5001/api/emergency-services?lat=${loc.lat}&lng=${loc.lng}&radius_km=5`);
      const list = await res.json();
      const resources = Array.isArray(list) ? list : (list.resources || []);
      console.log(`-> Discovered ${resources.length} emergency facilities dynamically via Maps API in ${loc.name}:`);
      if (resources && resources.length > 0) {
        resources.slice(0, 3).forEach((r, idx) => {
          console.log(`   ${idx + 1}. [${r.category.toUpperCase()}] ${r.name} | (${r.lat}, ${r.lng}) | Distance: ${r.distanceKm} km | ETA: ${r.etaMinutes} min`);
        });

        // Test OSRM Route
        const top = resources[0];
        const routeRes = await fetch(`http://localhost:5001/api/route?fromLat=${top.lat}&fromLng=${top.lng}&toLat=${loc.lat}&toLng=${loc.lng}`);
        const route = await routeRes.json();
        console.log(`   -> OSRM Road Route from [${top.name}] to ${loc.name}: ${route.distanceKm} km, ${route.durationMin} min (${route.coordinates?.length || 0} polyline points)`);
      } else {
        console.log(`   [!] No facilities found within 5km.`);
      }
    }
  } catch (err) {
    console.error("Test error:", err);
  }
}

run();
