/**
 * VarshaRaksha Mobile Map 2-Nearest-Per-Category Verification Suite
 */

const assert = require("assert");

// Category classification logic
function getServiceCategoryKey(e) {
  if (!e) return "other";
  const cat = String(e.category || e.type || "").toLowerCase();
  const name = String(e.name || "").toLowerCase();
  if (cat.includes("medic") || cat.includes("hosp") || name.includes("hospital") || name.includes("clinic") || name.includes("dispensary") || name.includes("health") || name.includes("icu") || name.includes("trauma")) {
    return "medical";
  }
  if (cat.includes("fire") || name.includes("fire") || name.includes("brigade") || name.includes("rescue")) {
    return "fire";
  }
  if (cat.includes("police") || name.includes("police") || name.includes("chowky") || name.includes("station") || name.includes("cop") || name.includes("thana")) {
    return "police";
  }
  if (cat.includes("gov") || cat.includes("municip") || cat.includes("civic") || name.includes("ward") || name.includes("bmc") || name.includes("corporation") || name.includes("office") || name.includes("disaster") || name.includes("collector")) {
    return "municipal";
  }
  if (cat.includes("ngo") || cat.includes("relief") || cat.includes("shelter") || name.includes("ngo") || name.includes("foundation") || name.includes("trust") || name.includes("seva") || name.includes("relief") || name.includes("society") || name.includes("aid")) {
    return "ngo";
  }
  if (cat.includes("water") || cat.includes("resource") || name.includes("water") || name.includes("pump") || name.includes("tanker")) {
    return "water";
  }
  return cat || "other";
}

// Mobile Map limiting function
function getLimitedEmergencyServices(emergencyServices) {
  if (!emergencyServices || emergencyServices.length === 0) return [];

  const groups = {};
  for (const item of emergencyServices) {
    const catKey = getServiceCategoryKey(item);
    if (!groups[catKey]) groups[catKey] = [];
    groups[catKey].push(item);
  }

  const categoryOrder = ["medical", "fire", "police", "municipal", "ngo", "water", "other"];
  const result = [];
  const remainingKeys = new Set(Object.keys(groups));

  for (const catKey of categoryOrder) {
    if (groups[catKey]) {
      const sorted = [...groups[catKey]].sort(
        (a, b) => Number(a.distance_km ?? a.distanceKm ?? 999) - Number(b.distance_km ?? b.distanceKm ?? 999)
      );
      result.push(...sorted.slice(0, 2));
      remainingKeys.delete(catKey);
    }
  }

  for (const catKey of remainingKeys) {
    const sorted = [...groups[catKey]].sort(
      (a, b) => Number(a.distance_km ?? a.distanceKm ?? 999) - Number(b.distance_km ?? b.distanceKm ?? 999)
    );
    result.push(...sorted.slice(0, 2));
  }

  return result;
}

function getLimitedShelters(shelters) {
  return [...(shelters || [])]
    .sort(
      (a, b) => Number(a.distance_km ?? a.distanceKm ?? 999) - Number(b.distance_km ?? b.distanceKm ?? 999)
    )
    .slice(0, 2);
}

console.log("==================================================");
console.log(" VarshaRaksha Mobile Map 2-Nearest Limit Tests   ");
console.log("==================================================");

// TEST 1: Shelters Limiting to 2 Nearest
console.log("\n[Test 1] Shelters Limiting (Max 2 Nearest):");
const mockShelters = [
  { id: "SH-01", name: "Shelter Far", distanceKm: 4.5 },
  { id: "SH-02", name: "Shelter Closest", distanceKm: 0.5 },
  { id: "SH-03", name: "Shelter Medium", distanceKm: 1.2 },
  { id: "SH-04", name: "Shelter Very Far", distanceKm: 8.0 },
  { id: "SH-05", name: "Shelter Third", distanceKm: 2.0 }
];

const limitedShelters = getLimitedShelters(mockShelters);
assert.strictEqual(limitedShelters.length, 2, "Must return exactly 2 nearest shelters");
assert.strictEqual(limitedShelters[0].id, "SH-02", "First shelter must be the closest (0.5 km)");
assert.strictEqual(limitedShelters[1].id, "SH-03", "Second shelter must be the second closest (1.2 km)");
console.log(`✓ Shelters capped to 2: [${limitedShelters.map(s => `${s.name} (${s.distanceKm}km)`).join(", ")}]`);

// TEST 2: Emergency Services 2-per-category Limiting
console.log("\n[Test 2] Emergency Services 2-per-category Sorting & Limiting:");
const mockServices = [
  // 4 Hospitals
  { id: "H1", name: "Hospital Far", category: "medical", distanceKm: 3.2 },
  { id: "H2", name: "Hospital Nearest", category: "medical", distanceKm: 0.6 },
  { id: "H3", name: "Hospital Mid", category: "medical", distanceKm: 1.1 },
  { id: "H4", name: "Hospital Super Far", category: "medical", distanceKm: 7.0 },
  // 3 Fire Stations
  { id: "F1", name: "Fire Station Mid", category: "fire", distanceKm: 2.1 },
  { id: "F2", name: "Fire Station Nearest", category: "fire", distanceKm: 0.9 },
  { id: "F3", name: "Fire Station Far", category: "fire", distanceKm: 4.0 },
  // 3 Police Stations
  { id: "P1", name: "Police Chowky 1", category: "police", distanceKm: 1.4 },
  { id: "P2", name: "Police Chowky 2", category: "police", distanceKm: 0.4 },
  { id: "P3", name: "Police Station 3", category: "police", distanceKm: 2.8 },
  // 3 Municipal Facilities
  { id: "M1", name: "BMC Ward Office", category: "government", distanceKm: 1.8 },
  { id: "M2", name: "Disaster Management Cell", category: "municipal", distanceKm: 0.8 },
  { id: "M3", name: "Civic Outreach", category: "government", distanceKm: 3.5 },
  // 1 NGO
  { id: "N1", name: "Red Cross Relief Base", category: "ngo", distanceKm: 1.5 }
];

const limitedServices = getLimitedEmergencyServices(mockServices);

// Verify counts per category
const counts = {};
limitedServices.forEach(s => {
  const cat = getServiceCategoryKey(s);
  counts[cat] = (counts[cat] || 0) + 1;
});

assert.strictEqual(counts.medical, 2, "Must have exactly 2 medical services");
assert.strictEqual(counts.fire, 2, "Must have exactly 2 fire services");
assert.strictEqual(counts.police, 2, "Must have exactly 2 police services");
assert.strictEqual(counts.municipal, 2, "Must have exactly 2 municipal services");
assert.strictEqual(counts.ngo, 1, "Must have 1 NGO when only 1 is available");

// Verify nearest selection
const medicals = limitedServices.filter(s => getServiceCategoryKey(s) === "medical");
assert.strictEqual(medicals[0].id, "H2", "Nearest hospital must be H2 (0.6km)");
assert.strictEqual(medicals[1].id, "H3", "Second nearest hospital must be H3 (1.1km)");

const fireStations = limitedServices.filter(s => getServiceCategoryKey(s) === "fire");
assert.strictEqual(fireStations[0].id, "F2", "Nearest fire station must be F2 (0.9km)");
assert.strictEqual(fireStations[1].id, "F1", "Second nearest fire station must be F1 (2.1km)");

const policeChowkies = limitedServices.filter(s => getServiceCategoryKey(s) === "police");
assert.strictEqual(policeChowkies[0].id, "P2", "Nearest police must be P2 (0.4km)");
assert.strictEqual(policeChowkies[1].id, "P1", "Second nearest police must be P1 (1.4km)");

console.log(`✓ 14 total incoming API services successfully filtered to ${limitedServices.length} nearest units (max 2/category).`);
console.log("  Breakdown:");
Object.entries(counts).forEach(([cat, cnt]) => console.log(`    - ${cat}: ${cnt} units`));

// TEST 3: Empty categories are omitted cleanly without errors
console.log("\n[Test 3] Empty / Missing Categories Handling:");
const emptyRes = getLimitedEmergencyServices([]);
assert.deepStrictEqual(emptyRes, [], "Empty array input must return empty array");
const nullRes = getLimitedEmergencyServices(null);
assert.deepStrictEqual(nullRes, [], "Null input must return empty array");
console.log("✓ Empty input handled cleanly.");

console.log("\n==================================================");
console.log(" ALL MOBILE MAP LIMIT TESTS PASSED SUCCESSFULLY!  ");
console.log("==================================================");
