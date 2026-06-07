import fs from "node:fs/promises";
import { getBehaviorLogPath } from "./logPath.js";

/** @returns {Promise<Array<Record<string, unknown>>>} */
export async function readBehaviorLog(logPath = getBehaviorLogPath()) {
  const raw = await fs.readFile(logPath, "utf8").catch(() => "");
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function readLatestScan(logPath = getBehaviorLogPath()) {
  const lines = await readBehaviorLog(logPath);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].type === "scan") return lines[i];
  }
  return null;
}

/** @param {string} fromISO @param {string} toISO */
export function filterLogByWindow(lines, fromISO, toISO) {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  return lines.filter((row) => {
    const t = new Date(row.ts || row.timestamp || 0).getTime();
    return t >= from && t <= to;
  });
}

export async function readAttestations(logPath = getBehaviorLogPath()) {
  const lines = await readBehaviorLog(logPath);
  return lines.filter((l) => l.type === "attest");
}

export async function readStrategyFingerprints(logPath = getBehaviorLogPath()) {
  const scan = await readLatestScan(logPath);
  const strategies = scan?.snapshot?.strategies || scan?.snapshot?.skills || [];
  return strategies.map((s) => ({
    name: s.name,
    strategyKey: s.skillKey || s.strategyKey,
    path: s.path,
  }));
}
