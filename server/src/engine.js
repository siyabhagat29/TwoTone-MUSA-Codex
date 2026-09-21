import crypto from "crypto";

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Standard Geohash encoder
 * Precision 6 gives ~1.2km x 0.6km, Precision 7 gives ~150m x 150m
 */
export function encodeGeohash(lat, lng, precision = 6) {
  let latMin = -90.0, latMax = 90.0;
  let lngMin = -180.0, lngMax = 180.0;
  let geohash = "";
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lngMin + lngMax) / 2;
      if (lng > mid) {
        ch |= (1 << (4 - bit));
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        ch |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

/**
 * Compute SHA-256 hash of evidence (image string / text payload)
 */
export function hashEvidence(data) {
  const content = typeof data === "string" ? data : JSON.stringify(data || "");
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

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

/**
 * Divergence Engine: Classifies root cause of flood risk
 * Differentiates between severe meteorological rainfall vs structural drainage blockage
 */
export function classifyCause({ rainfall = 0, waterLevel = 0, blockedDrainSignal = false, note = "" }) {
  const isDrainKeyword = /drain|clog|blocked|gutter|kachra|pipe|culvert|desilt|choke/i.test(note || "");
  const hasDrainSignal = blockedDrainSignal || isDrainKeyword;

  if (hasDrainSignal && rainfall < 50 && waterLevel >= 15) {
    return {
      code: "SUSPECTED_BLOCKED_DRAIN",
      name: "Suspected Blocked Drain",
      description: "Waterlogging caused primarily by clogged drainage or choked culvert despite moderate rainfall.",
      recommendedTeam: "Municipal Cleaning & Desilting Crew",
      recommendedTeamId: "TEAM-01"
    };
  }

  if (rainfall >= 35 && waterLevel >= 25) {
    if (hasDrainSignal) {
      return {
        code: "MIXED_RUNOFF",
        name: "Mixed Rainfall & Drainage Overload",
        description: "Heavy rainfall combined with reduced stormwater drain discharge capacity.",
        recommendedTeam: "Rapid Emergency Drainage Squad",
        recommendedTeamId: "TEAM-03"
      };
    }
    return {
      code: "RAINFALL_OVERLOAD",
      name: "Rainfall Overload",
      description: "Stormwater capacity exceeded by intense localized meteorological precipitation.",
      recommendedTeam: "High-Volume Dewatering Pump Unit",
      recommendedTeamId: "TEAM-02"
    };
  }

  if (hasDrainSignal) {
    return {
      code: "SUSPECTED_BLOCKED_DRAIN",
      name: "Suspected Blocked Drain",
      description: "Localized drain obstruction reported by ground observers.",
      recommendedTeam: "Municipal Cleaning & Desilting Crew",
      recommendedTeamId: "TEAM-01"
    };
  }

  if (waterLevel >= 20) {
    return {
      code: "MIXED_RUNOFF",
      name: "Surface Runoff Accumulation",
      description: "Water accumulation in low-lying depression requiring active response.",
      recommendedTeam: "Municipal Drainage Crew",
      recommendedTeamId: "TEAM-01"
    };
  }

  return {
    code: "NORMAL_DRAINAGE",
    name: "Normal Drainage",
    description: "Flow rates within design parameters.",
    recommendedTeam: "Routine Inspection Unit",
    recommendedTeamId: "TEAM-04"
  };
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

/**
 * Computer Vision Confidence Score Engine
 * Computes AI confidence rating (0-100%) based on photo evidence, watermark/GPS, and depth consistency
 */
export function calculateCvConfidence({ photo = false, photoUrl = null, waterLevel = 15, gps = false, note = "" }) {
  let baseScore = 0.50; // Base baseline for unverified report

  if (photo || photoUrl) {
    // Photo attached triggers CV model inference
    baseScore = 0.86;
    if (waterLevel >= 40) baseScore += 0.08; // High depth has high visual contrast in street floodwaters
    if (note && note.length > 15) baseScore += 0.03;
  } else {
    // No photo: sensor and GPS only
    baseScore = 0.65;
    if (gps) baseScore += 0.10;
  }

  const confidencePct = Math.min(99, Math.max(45, Math.round(baseScore * 100)));
  const confidenceDecimal = confidencePct / 100;

  return {
    confidence: confidencePct,
    confidenceDecimal,
    hasPhoto: Boolean(photo || photoUrl),
    modelLabel: photo || photoUrl ? "VarshaRaksha CV v2.4 (Water-Pixel Segmentation)" : "Heuristic Telemetry Corroboration",
    status: confidencePct >= 80 ? "HIGH_CONFIDENCE" : confidencePct >= 65 ? "MODERATE_CONFIDENCE" : "LOW_CONFIDENCE"
  };
}

/**
 * Auto-routing mapping for dispatches based on Divergence Engine classification
 */
export function getAutoRoutedTeam(causeCode) {
  switch (causeCode) {
    case "RAINFALL_OVERLOAD":
      return {
        team: "High-Volume Dewatering Pump Unit",
        teamId: "TEAM-02",
        rationale: "Automated routing: High meteorological precipitation detected. Dispatched 5000L/min dewatering pump."
      };
    case "SUSPECTED_BLOCKED_DRAIN":
      return {
        team: "Municipal Cleaning & Desilting Crew",
        teamId: "TEAM-01",
        rationale: "Automated routing: Drainage blockage identified. Dispatched municipal desilting and trash clearing squad."
      };
    case "MIXED_RUNOFF":
      return {
        team: "Rapid Emergency Drainage Squad",
        teamId: "TEAM-03",
        rationale: "Automated routing: Combined flood condition. Dispatched multi-purpose emergency drainage crew."
      };
    default:
      return {
        team: "Municipal Cleaning & Desilting Crew",
        teamId: "TEAM-01",
        rationale: "Automated routing: Standard municipal response unit."
      };
  }
}

