import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseDotEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) out[key] = value;
  }
  return out;
}

/** Load bnbagent + skill env files without overwriting existing process.env. */
export function loadAgentEnv() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.join(here, "..", "..");
  const candidates = [
    path.join(root, "bnbagent", ".env.agent"),
    path.join(root, "skill", ".env"),
    path.join(root, ".env"),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      Object.assign(process.env, parseDotEnv(fs.readFileSync(file, "utf8")));
    } catch {
      /* skip */
    }
  }
}

export function getAgentStatePath() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, "..", "agent_state.json");
}

export function readAgentStateSync() {
  try {
    return JSON.parse(fs.readFileSync(getAgentStatePath(), "utf8"));
  } catch {
    return null;
  }
}
