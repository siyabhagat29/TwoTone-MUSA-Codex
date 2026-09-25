// Verification script for Authority Dashboard category-specific resource icons
import { getAuthorityResourceCategory, getAuthorityResourceIcon } from "../apps/web/src/resourceIconUtils.js";

console.log("==================================================");
console.log("🧪 VERIFYING AUTHORITY DASHBOARD MAP RESOURCE ICONS");
console.log("==================================================");

const testCases = [
  // 1. HOSPITAL / MEDICAL / AMBULANCE → 🚑
  {
    input: { name: "BMC Chandivali Hospital", category: "medical", status: "Available" },
    expectedIcon: "🚑",
    expectedCategory: "MEDICAL"
  },
  {
    input: { name: "108 Fast Emergency Ambulance Unit #4", category: "ambulance", status: "Available" },
    expectedIcon: "🚑",
    expectedCategory: "MEDICAL"
  },
  {
    input: { name: "Cooper Hospital Trauma Care Unit", category: "casualty", status: "Available" },
    expectedIcon: "🚑",
    expectedCategory: "MEDICAL"
  },

  // 2. MUNICIPALITY / DRAINAGE → 🚧
  {
    input: { name: "K-West Ward Stormwater Dewatering Squad", category: "drainage", status: "Available" },
    expectedIcon: "🚧",
    expectedCategory: "MUNICIPAL_DRAINAGE"
  },
  {
    input: { name: "BMC Municipal Nullah Desilting Team", agency: "BMC Stormwater Dept", status: "Available" },
    expectedIcon: "🚧",
    expectedCategory: "MUNICIPAL_DRAINAGE"
  },
  {
    input: { name: "High-Capacity Submersible Dewatering Pump 500HP", category: "dewatering", status: "Available" },
    expectedIcon: "🚧",
    expectedCategory: "MUNICIPAL_DRAINAGE"
  },

  // 3. SHELTER → 🏠
  {
    input: { name: "Powai Municipal High School Relief Shelter", category: "shelter", status: "Available" },
    expectedIcon: "🏠",
    expectedCategory: "SHELTER"
  },
  {
    input: { name: "Andheri Sports Complex Evacuation Center", category: "evacuation", status: "Available" },
    expectedIcon: "🏠",
    expectedCategory: "SHELTER"
  },

  // 4. NGO / FOOD / RELIEF → 🍱
  {
    input: { name: "Roti Bank Mumbai Relief Kitchen", category: "food", status: "Available" },
    expectedIcon: "🍱",
    expectedCategory: "FOOD_NGO"
  },
  {
    input: { name: "Goonj Disaster Relief NGO Squad", category: "ngo", status: "Available" },
    expectedIcon: "🍱",
    expectedCategory: "FOOD_NGO"
  },

  // 5. FIRE & RESCUE → 🚒
  {
    input: { name: "Andheri Fire Brigade Station Unit 2", category: "fire", status: "Available" },
    expectedIcon: "🚒",
    expectedCategory: "FIRE_RESCUE"
  },
  {
    input: { name: "SDRF Flood Rescue Squad A", category: "rescue", status: "Available" },
    expectedIcon: "🚒",
    expectedCategory: "FIRE_RESCUE"
  },

  // 6. POLICE → 👮
  {
    input: { name: "DN Nagar Police Station Quick Response Team", category: "police", status: "Available" },
    expectedIcon: "👮",
    expectedCategory: "POLICE"
  },
  {
    input: { name: "Western Express Highway Traffic Police Patrol", category: "traffic police", status: "Available" },
    expectedIcon: "👮",
    expectedCategory: "POLICE"
  },

  // 7. WATER → 💧
  {
    input: { name: "Emergency Potable Water Tanker 10,000L", category: "water", status: "Available" },
    expectedIcon: "💧",
    expectedCategory: "WATER"
  },
  {
    input: { name: "BMC Drinking Water Distribution Unit", category: "hydration", status: "Available" },
    expectedIcon: "💧",
    expectedCategory: "WATER"
  }
];

let allPassed = true;

testCases.forEach((tc, idx) => {
  const resInfo = getAuthorityResourceCategory(tc.input);
  const icon = getAuthorityResourceIcon(tc.input);
  const passed = icon === tc.expectedIcon && resInfo.category === tc.expectedCategory;
  if (!passed) {
    allPassed = false;
    console.error(`❌ Case ${idx + 1} Failed for "${tc.input.name}": Expected ${tc.expectedIcon} (${tc.expectedCategory}), got ${icon} (${resInfo.category})`);
  } else {
    console.log(`✓ Case ${idx + 1}: ${icon} [${resInfo.label}] -> "${tc.input.name}"`);
  }
});

if (allPassed) {
  console.log("\n==================================================");
  console.log("✅ ALL AUTHORITY RESOURCE ICONS VERIFIED SUCCESSFULLY!");
  console.log("==================================================");
} else {
  process.exit(1);
}
