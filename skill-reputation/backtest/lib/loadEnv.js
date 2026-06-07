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

/** Load skill/.env and backtest/.env without overwriting existing process.env */
export function loadProjectEnv() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "..", ".env"),
    path.join(here, "..", "..", "skill", ".env"),
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "skill", ".env"),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      Object.assign(process.env, parseDotEnv(fs.readFileSync(file, "utf8")));
    } catch {
      /* skip unreadable env files */
    }
  }
}
