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
  const counts = new Map();

  const deduped = reports.map((r) => {
    if (r.status === "False Alarm") return { ...r, duplicateOf: null };
    const key = `${r.zoneId}-${Math.round(r.waterLevel / 10)}-${r.cause || "none"}`;
    if (seen.has(key)) {
      const parentId = seen.get(key);
      counts.set(parentId, (counts.get(parentId) || 0) + 1);
      return { ...r, duplicateOf: parentId };
    }
    seen.set(key, r.id);
    counts.set(r.id, 0);
    return { ...r, duplicateOf: null };
  });

  return deduped.map(r => {
    if (!r.duplicateOf) {
      r.mergedCount = counts.get(r.id) || 0;
      if (r.mergedCount > 0) {
        r.confidenceScore = Math.min(99, (r.confidenceScore || 70) + (r.mergedCount * 5));
      }
    }
    return r;
  });
}
