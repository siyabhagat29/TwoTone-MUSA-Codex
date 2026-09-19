export function riskLabel(score) {
  if (score >= 75) return "RED";
  if (score >= 45) return "ORANGE";
  return "GREEN";
}

export function scoreRisk({ rainfall = 0, waterLevel = 0, reports = 0, drainPenalty = 0 }) {
  const score = Math.max(0, Math.min(100,
    rainfall * 0.42 +
    waterLevel * 0.65 +
    Math.min(reports, 20) * 1.6 +
    drainPenalty
  ));
  return { score: Math.round(score), label: riskLabel(score) };
}

export function classifyCause({ rainfall, waterLevel, blockedDrainSignal }) {
  if (blockedDrainSignal && rainfall < 60 && waterLevel >= 25) return "Blocked drain";
  if (rainfall >= 65 && waterLevel >= 20) return "Rainfall overload";
  if (waterLevel >= 15) return "Mixed";
  return "Normal drainage";
}

export function dedupeReports(reports) {
  const seen = new Map();
  return reports.map((r) => {
    const key = `${r.zoneId}-${Math.round(r.waterLevel / 10)}-${r.photoHash || "none"}`;
    if (seen.has(key)) return { ...r, duplicateOf: seen.get(key) };
    seen.set(key, r.id);
    return { ...r, duplicateOf: null };
  });
}
