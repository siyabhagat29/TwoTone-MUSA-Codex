/**
 * Data-driven icon and category resolution for Authority Dashboard Map Markers.
 * Categorizes emergency resources based on data fields (category, type, name, agency, resource_type, etc.)
 */
export function getAuthorityResourceCategory(res) {
  if (!res) return { category: "RESOURCES", icon: "🚚", label: "Resource", color: "#2563eb" };

  const rawCat = String(res.category || "").toLowerCase().trim();
  const rawType = String(res.type || res.resource_type || "").toLowerCase().trim();
  const rawName = String(res.name || res.title || "").toLowerCase().trim();
  const rawAgency = String(res.agency || "").toLowerCase().trim();
  const rawGroup = String(res.group || res.subType || "").toLowerCase().trim();
  const rawEquip = String(res.equipment || res.role || "").toLowerCase().trim();
  const text = `${rawCat} ${rawType} ${rawName} ${rawAgency} ${rawGroup} ${rawEquip}`;

  // PRIORITY 1: Explicit Medical/Hospital/Ambulance (🚑)
  if (
    rawCat === "medical" ||
    rawCat === "hospital" ||
    rawCat === "ambulance" ||
    rawCat === "casualty" ||
    rawCat === "trauma" ||
    rawCat === "health" ||
    res.icon === "🏥" ||
    res.icon === "🚑" ||
    res.icon === "🫀" ||
    text.includes("ambulance") ||
    text.includes("hospital") ||
    text.includes("trauma") ||
    text.includes("casualty") ||
    text.includes("clinic") ||
    text.includes("doctor") ||
    text.includes("medic") ||
    text.includes("ems")
  ) {
    return { category: "MEDICAL", icon: "🚑", label: "Hospital / Medical", color: "#dc2626" };
  }

  // PRIORITY 2: Explicit Shelter / Evacuation (🏠)
  if (
    rawCat === "shelter" ||
    rawCat === "evacuation" ||
    res.icon === "🏠" ||
    res.icon === "🛏️" ||
    res.icon === "⛺" ||
    text.includes("shelter") ||
    text.includes("evacuation") ||
    text.includes("refuge") ||
    text.includes("relief camp") ||
    text.includes("relief center") ||
    text.includes("evac center")
  ) {
    return { category: "SHELTER", icon: "🏠", label: "Shelter", color: "#059669" };
  }

  // PRIORITY 3: Water Distribution / Tankers (💧)
  if (
    rawCat === "water" ||
    rawCat === "hydration" ||
    res.icon === "💧" ||
    text.includes("potable water") ||
    text.includes("water tanker") ||
    text.includes("drinking water") ||
    text.includes("water distribution") ||
    text.includes("water supply") ||
    (rawCat === "water" || text.includes("tanker") || text.includes("hydration"))
  ) {
    return { category: "WATER", icon: "💧", label: "Water Resource", color: "#0284c7" };
  }

  // PRIORITY 4: NGO / Food / Relief (🍱)
  if (
    rawCat === "food" ||
    rawCat === "ngo" ||
    rawCat === "relief" ||
    rawCat === "ration" ||
    res.icon === "🍱" ||
    res.icon === "🤝" ||
    text.includes("ngo") ||
    text.includes("food packet") ||
    text.includes("relief kitchen") ||
    text.includes("community kitchen") ||
    text.includes("ration center") ||
    text.includes("food distribution") ||
    text.includes("roti bank") ||
    text.includes("goonj") ||
    text.includes("meal") ||
    text.includes("ration")
  ) {
    return { category: "FOOD_NGO", icon: "🍱", label: "NGO / Food Relief", color: "#d97706" };
  }

  // PRIORITY 5: Fire & Rescue (🚒)
  if (
    rawCat === "fire" ||
    rawCat === "rescue" ||
    res.icon === "🚒" ||
    text.includes("fire brigade") ||
    text.includes("fire station") ||
    text.includes("fire truck") ||
    text.includes("rescue squad") ||
    text.includes("flood rescue") ||
    text.includes("sdrf") ||
    text.includes("ndrf") ||
    text.includes("fire") ||
    text.includes("rescue")
  ) {
    return { category: "FIRE_RESCUE", icon: "🚒", label: "Fire & Rescue", color: "#ea580c" };
  }

  // PRIORITY 6: Police (👮)
  if (
    rawCat === "police" ||
    res.icon === "👮" ||
    text.includes("police") ||
    text.includes("traffic police") ||
    text.includes("chowky") ||
    text.includes("patrol") ||
    text.includes("constable") ||
    text.includes("cop")
  ) {
    return { category: "POLICE", icon: "👮", label: "Police", color: "#4f46e5" };
  }

  // PRIORITY 7: Municipality / Drainage / Dewatering (🚧)
  if (
    rawCat === "municipal" ||
    rawCat === "drainage" ||
    rawCat === "dewatering" ||
    rawCat === "stormwater" ||
    res.icon === "🏛️" ||
    res.icon === "🚧" ||
    text.includes("drain") ||
    text.includes("stormwater") ||
    text.includes("dewatering") ||
    text.includes("pump") ||
    text.includes("silt") ||
    text.includes("desilting") ||
    text.includes("sewer") ||
    text.includes("suction") ||
    text.includes("hydrovac") ||
    text.includes("nullah") ||
    text.includes("culvert") ||
    text.includes("municipal") ||
    text.includes("ward team") ||
    text.includes("civic") ||
    text.includes("bmc")
  ) {
    return { category: "MUNICIPAL_DRAINAGE", icon: "🚧", label: "Municipal Drainage", color: "#0891b2" };
  }

  // Generic fallback if genuine unknown
  return {
    category: "RESOURCE",
    icon: res.emoji || res.icon || "🚚",
    label: "Emergency Resource",
    color: "#2563eb"
  };
}

export function getAuthorityResourceIcon(res) {
  return getAuthorityResourceCategory(res).icon;
}
