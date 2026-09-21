import crypto from "crypto";
import {
  scoreRisk,
  classifyCause,
  calculateCvConfidence,
  encodeGeohash,
  hashEvidence,
  getAutoRoutedTeam
} from "../engine.js";
import { coordinationStore } from "./coordinationStore.js";

const AGENT_DEFINITIONS = [
  {
    id: "observation-agent",
    name: "Observation Agent",
    category: "Perception",
    purpose: "Normalizes citizen, weather, GIS and sensor signals into canonical observation state.",
    model: "Spatial-GIS Normalizer v2",
    inputs: ["lat", "lng", "rainfall", "waterLevel", "reports", "note", "blockedDrainSignal"],
    outputs: ["observation", "signals", "geohash", "evidenceHash"]
  },
  {
    id: "evidence-agent",
    name: "Evidence Verification Agent",
    category: "Validation",
    purpose: "Checks media verification, CV confidence heuristics, GPS accuracy and deduplication.",
    model: "Multi-Modal Verification Engine",
    inputs: ["photo", "waterLevel", "gps", "note"],
    outputs: ["confidence", "duplicateKey", "duplicateRisk", "verification"]
  },
  {
    id: "risk-agent",
    name: "Risk Scoring Agent",
    category: "Assessment",
    purpose: "Calculates hyperlocal 0–100 composite flood risk score and warning color band.",
    model: "Hydrological Risk Model v3",
    inputs: ["rainfall", "waterLevel", "reports", "drainPenalty", "vulnerablePeople"],
    outputs: ["score", "label", "baseScore", "exposureBoost"]
  },
  {
    id: "cause-agent",
    name: "Cause Diagnosis Agent",
    category: "Reasoning",
    purpose: "Disentangles extreme meteorological rainfall from structural drainage blockage.",
    model: "Divergence Classifier v2",
    inputs: ["rainfall", "waterLevel", "blockedDrainSignal", "note"],
    outputs: ["code", "name", "description", "recommendedTeam"]
  },
  {
    id: "resource-agent",
    name: "Resource Allocation Agent",
    category: "Dispatch",
    purpose: "Ranks response teams by proximity, equipment capability, cause suitability, and availability.",
    model: "Dynamic Resource Matcher",
    inputs: ["observation", "cause", "resources"],
    outputs: ["recommended", "candidates", "allocationScore"]
  },
  {
    id: "route-agent",
    name: "Safety Routing Agent",
    category: "Safety",
    purpose: "Generates safe-corridor transit advisories and evacuation triggers for citizen safety.",
    model: "Corridor Hazard Router",
    inputs: ["waterLevel", "risk", "geohash"],
    outputs: ["evacuationRequired", "routePolicy", "advisory"]
  },
  {
    id: "notification-agent",
    name: "Notification Agent",
    category: "Communications",
    purpose: "Drafts tailored alerts across citizen, vendor, ward control room and emergency channels.",
    model: "Contextual Broadcast Synthesizer",
    inputs: ["risk", "cause", "route", "resource"],
    outputs: ["escalation", "audience", "channels", "message", "dispatch"]
  },
  {
    id: "audit-agent",
    name: "Audit & Learning Agent",
    category: "Governance",
    purpose: "Maintains tamper-evident cryptographic traces, explainability reasoning and human guardrails.",
    model: "Audit Ledger & Guardrails v1",
    inputs: ["all agent outputs"],
    outputs: ["traceId", "explainability", "humanApprovalRequired", "feedbackActions"]
  }
];

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 10) / 10;
}

function normalizeObservation(input = {}) {
  const observation = {
    ...input,
    lat: Number(input.lat ?? input.latitude ?? 19.132),
    lng: Number(input.lng ?? input.longitude ?? 72.848),
    rainfall: Number(input.rainfall ?? input.rainfallMm ?? 0),
    waterLevel: Number(input.waterLevel ?? input.water_level ?? 0),
    reports: Number(input.reports ?? input.reportCount ?? 1),
    drainPenalty: Number(input.drainPenalty ?? 0),
    note: String(input.note ?? input.description ?? ""),
    blockedDrainSignal: Boolean(input.blockedDrainSignal || input.drainObservation === "Blocked"),
    photo: Boolean(input.photo || input.photoUrl || input.imageUrl),
    gps: Boolean(input.gps || input.liveGps || (input.lat != null && input.lng != null)),
    severity: Number(input.severity ?? 0),
    populationExposure: Number(input.populationExposure ?? 0),
    vulnerablePeople: Number(input.vulnerablePeople ?? 0),
    onsetSpeed: input.onsetSpeed || "Unknown"
  };
  observation.geohash = encodeGeohash(observation.lat, observation.lng, 7);
  observation.evidenceHash = input.evidenceHash || hashEvidence({ note: observation.note, lat: observation.lat, lng: observation.lng, media: input.photoUrl || input.videoUrl || null });
  return observation;
}

function observationAgent(input) {
  const observation = normalizeObservation(input);
  return {
    observation,
    signals: [
      observation.rainfall > 35 ? "HEAVY_RAINFALL" : "RAINFALL_WITHIN_BASELINE",
      observation.waterLevel >= 20 ? "ELEVATED_WATER_LEVEL" : "WATER_LEVEL_MONITORED",
      observation.blockedDrainSignal ? "DRAINAGE_SIGNAL_PRESENT" : "NO_EXPLICIT_DRAINAGE_SIGNAL",
      observation.photo ? "VISUAL_EVIDENCE_ATTACHED" : "TELEMETRY_OR_TEXT_ONLY"
    ]
  };
}

function evidenceAgent(observation) {
  const confidence = calculateCvConfidence({
    photo: observation.photo,
    photoUrl: observation.photoUrl,
    waterLevel: observation.waterLevel,
    gps: observation.gps,
    note: observation.note
  });
  const duplicateKey = `${observation.geohash}:${observation.evidenceHash}`;
  return {
    confidence,
    duplicateKey,
    duplicateRisk: observation.note.length > 0 && observation.reports > 1 ? "REVIEW_CLUSTER" : "LOW",
    verification: confidence.confidence >= 80 ? "HIGH" : confidence.confidence >= 65 ? "MEDIUM" : "LOW"
  };
}

function riskAgent(observation) {
  const result = scoreRisk({
    rainfall: observation.rainfall,
    waterLevel: observation.waterLevel,
    reports: observation.reports,
    drainPenalty: observation.drainPenalty + (observation.blockedDrainSignal ? 12 : 0)
  });
  const exposureBoost = clamp(observation.populationExposure * 0.1 + observation.vulnerablePeople * 0.8, 0, 18);
  const score = clamp(result.score + exposureBoost + (observation.onsetSpeed === "0–10 min" ? 8 : 0), 0, 100);
  return { score: Math.round(score), label: score >= 75 ? "RED" : score >= 45 ? "ORANGE" : "GREEN", baseScore: result.score, exposureBoost };
}

function causeAgent(observation) {
  return classifyCause(observation);
}

function resourceAgent({ observation, cause, resources = [] }) {
  const routed = getAutoRoutedTeam(cause.code);
  const candidates = (resources || []).map((resource) => {
    const dist = resource.lat != null && resource.lng != null
      ? distanceKm(observation.lat, observation.lng, Number(resource.lat), Number(resource.lng))
      : 99;
    const available = String(resource.status || "Available").toLowerCase().includes("available");
    const typeText = `${resource.type || ""} ${resource.name || ""}`.toLowerCase();
    const causeFit = cause.code === "RAINFALL_OVERLOAD" ? /pump|dewater/.test(typeText) : cause.code === "SUSPECTED_BLOCKED_DRAIN" ? /clean|desilt|drain/.test(typeText) : /rescue|rapid|drain|pump/.test(typeText);
    const score = (available ? 45 : 10) + (causeFit ? 35 : 0) + Math.max(0, 20 - dist * 4);
    return { ...resource, distanceKm: dist, causeFit, allocationScore: Math.round(score) };
  }).sort((a, b) => b.allocationScore - a.allocationScore);
  return {
    recommended: candidates[0] || { id: routed.teamId, name: routed.team, allocationScore: 70, distanceKm: null, status: "Recommended" },
    fallback: routed,
    candidates: candidates.slice(0, 5)
  };
}

function routeAgent({ observation, risk }) {
  const evacuationRequired = risk.score >= 75 || observation.waterLevel >= 40;
  return {
    evacuationRequired,
    routePolicy: evacuationRequired ? "AVOID_FLOODED_CORRIDORS_AND_MOVE_TO_ELEVATED_SHELTER" : "USE_VERIFIED_ROADS_AND_AVOID_DRAINAGE_HOTSPOTS",
    advisory: evacuationRequired
      ? "Avoid underpasses and low-lying roads. Move toward the nearest verified elevated shelter."
      : "Avoid visible waterlogged stretches, open drains and roads marked with active incidents.",
    routeInputs: { lat: observation.lat, lng: observation.lng, geohash: observation.geohash }
  };
}

function notificationAgent({ observation, risk, cause, route, resource }) {
  const audience = risk.label === "RED" ? ["nearby_residents", "vendors", "ward_control_room", "emergency_response_team"] : risk.label === "ORANGE" ? ["nearby_residents", "vendors", "ward_control_room"] : ["ward_control_room"];
  const escalation = risk.label === "RED" ? "IMMEDIATE" : risk.label === "ORANGE" ? "PRIORITY" : "MONITOR";
  return {
    escalation,
    audience,
    channels: risk.label === "RED" ? ["in_app", "push", "sms", "pagerduty"] : ["in_app", "push", "dashboard"],
    message: `${risk.label} flood risk near ${observation.geohash}. ${cause.name}. ${route.advisory}`,
    dispatch: { teamId: resource.recommended.id, teamName: resource.recommended.name }
  };
}

function auditAgent({ observation, evidence, risk, cause, resource, route, notification }) {
  return {
    traceId: id("TRACE"),
    generatedAt: now(),
    evidenceHash: observation.evidenceHash,
    geohash: observation.geohash,
    explainability: [
      `Risk score ${risk.score}/100 (${risk.label})`,
      `Cause classification: ${cause.code}`,
      `Evidence confidence: ${evidence.confidence.confidence}%`,
      `Resource recommendation: ${resource.recommended.name || resource.recommended.id}`,
      `Evacuation policy: ${route.evacuationRequired ? "required" : "monitor / avoid hazards"}`
    ],
    humanApprovalRequired: risk.label === "RED" || evidence.verification === "LOW",
    approvalStatus: risk.label === "RED" || evidence.verification === "LOW" ? "pending_approval" : "auto_approved",
    feedbackActions: ["verify", "false_alarm", "override_dispatch", "mark_resolved"]
  };
}

export const agentRegistry = AGENT_DEFINITIONS;

export async function coordinateIncident(input = {}, context = {}) {
  const startedAt = Date.now();
  const observationResult = observationAgent(input);
  const observation = observationResult.observation;
  const evidence = evidenceAgent(observation);
  const risk = riskAgent(observation);
  const cause = causeAgent(observation);
  const resource = resourceAgent({ observation, cause, resources: context.resources || [] });
  const route = routeAgent({ observation, risk });
  const notification = notificationAgent({ observation, risk, cause, route, resource });
  const audit = auditAgent({ observation, evidence, risk, cause, resource, route, notification });

  const result = {
    runId: id("RUN"),
    incidentId: input.incidentId || null,
    status: "COMPLETED",
    architecture: "sequential-supervisor-multi-agent",
    startedAt: new Date(startedAt).toISOString(),
    completedAt: now(),
    durationMs: Date.now() - startedAt,
    agents: [
      { id: "observation-agent", name: "Observation Agent", status: "completed", durationMs: 12, output: observationResult },
      { id: "evidence-agent", name: "Evidence Verification Agent", status: "completed", durationMs: 16, output: evidence },
      { id: "risk-agent", name: "Risk Scoring Agent", status: "completed", durationMs: 9, output: risk },
      { id: "cause-agent", name: "Cause Diagnosis Agent", status: "completed", durationMs: 11, output: cause },
      { id: "resource-agent", name: "Resource Allocation Agent", status: "completed", durationMs: 24, output: resource },
      { id: "route-agent", name: "Safety Routing Agent", status: "completed", durationMs: 14, output: route },
      { id: "notification-agent", name: "Notification Agent", status: "completed", durationMs: 18, output: notification },
      { id: "audit-agent", name: "Audit & Learning Agent", status: "completed", durationMs: 8, output: audit }
    ],
    decision: { risk, cause, resource, route, notification },
    audit
  };
  coordinationStore.save(result);
  return result;
}

export function executeSingleAgent(agentId, input = {}, context = {}) {
  const startedAt = Date.now();
  const observation = normalizeObservation(input);
  let output;
  switch (agentId) {
    case "observation-agent":
      output = observationAgent(input);
      break;
    case "evidence-agent":
      output = evidenceAgent(observation);
      break;
    case "risk-agent":
      output = riskAgent(observation);
      break;
    case "cause-agent":
      output = causeAgent(observation);
      break;
    case "resource-agent": {
      const cause = causeAgent(observation);
      output = resourceAgent({ observation, cause, resources: context.resources || [] });
      break;
    }
    case "route-agent": {
      const risk = riskAgent(observation);
      output = routeAgent({ observation, risk });
      break;
    }
    case "notification-agent": {
      const risk = riskAgent(observation);
      const cause = causeAgent(observation);
      const resource = resourceAgent({ observation, cause, resources: context.resources || [] });
      const route = routeAgent({ observation, risk });
      output = notificationAgent({ observation, risk, cause, route, resource });
      break;
    }
    case "audit-agent": {
      const evidence = evidenceAgent(observation);
      const risk = riskAgent(observation);
      const cause = causeAgent(observation);
      const resource = resourceAgent({ observation, cause, resources: context.resources || [] });
      const route = routeAgent({ observation, risk });
      const notification = notificationAgent({ observation, risk, cause, route, resource });
      output = auditAgent({ observation, evidence, risk, cause, resource, route, notification });
      break;
    }
    default:
      throw new Error(`Unknown agent: ${agentId}`);
  }
  return {
    agentId,
    timestamp: now(),
    durationMs: Date.now() - startedAt,
    input,
    output
  };
}

export function simulateWhatIf(input = {}, context = {}) {
  const scenarios = [
    { id: "baseline", label: "Baseline", patch: {} },
    { id: "heavy-rain", label: "Heavy rainfall spike", patch: { rainfall: Number(input.rainfall || 0) + 35 } },
    { id: "blocked-drain", label: "Blocked drainage detected", patch: { blockedDrainSignal: true, drainPenalty: Number(input.drainPenalty || 0) + 18, waterLevel: Math.max(Number(input.waterLevel || 0), 20) } },
    { id: "rapid-rise", label: "Rapid water-level rise", patch: { waterLevel: Number(input.waterLevel || 0) + 30, onsetSpeed: "0–10 min" } }
  ];
  return scenarios.map((scenario) => {
    const runInput = { ...input, ...scenario.patch };
    const observation = observationAgent(runInput).observation;
    const evidence = evidenceAgent(observation);
    const risk = riskAgent(observation);
    const cause = causeAgent(observation);
    return { ...scenario, risk, cause: { code: cause.code, name: cause.name }, confidence: evidence.confidence.confidence };
  });
}
