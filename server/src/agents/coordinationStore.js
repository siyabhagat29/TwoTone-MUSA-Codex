import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data");
const RUNS_FILE = path.join(DATA_DIR, "agent_runs.json");

function readRuns() {
  try {
    if (!fs.existsSync(RUNS_FILE)) return [];
    return JSON.parse(fs.readFileSync(RUNS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeRuns(runs) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RUNS_FILE, JSON.stringify(runs.slice(-250), null, 2));
}

export const coordinationStore = {
  list(limit = 50) {
    return readRuns().slice(-Math.max(1, Math.min(Number(limit) || 50, 250))).reverse();
  },
  get(runId) {
    return readRuns().find((r) => r.runId === runId) || null;
  },
  save(run) {
    const runs = readRuns();
    runs.push(run);
    writeRuns(runs);
    return run;
  },
  update(runId, patch = {}) {
    const runs = readRuns();
    const idx = runs.findIndex((r) => r.runId === runId);
    if (idx === -1) return null;
    runs[idx] = {
      ...runs[idx],
      ...patch,
      audit: {
        ...(runs[idx].audit || {}),
        ...(patch.audit || {})
      }
    };
    writeRuns(runs);
    return runs[idx];
  },
  clear() {
    writeRuns([]);
    return true;
  }
};
