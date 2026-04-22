import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/** @returns {string[]} */
export function defaultSkillRoots() {
  const h = os.homedir();
  const candidates = [
    path.join(h, ".openclaw", "skills"),
    path.join(h, ".agents", "skills"),
    path.join(h, ".claude", "skills"),
    path.join(h, ".cursor", "skills"),
    path.join(process.cwd(), "skills"),
    path.join(process.cwd(), "..", "skills"),
  ];
  return candidates.filter(exists);
}

/**
 * @param {string | undefined} envRoots semicolon-separated
 * @returns {string[]}
 */
export function resolveRoots(envRoots) {
  const extra = (envRoots || "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
  const base = defaultSkillRoots();
  const merged = [...extra, ...base];
  const seen = new Set();
  return merged.filter((p) => {
    const k = path.resolve(p);
    if (seen.has(k)) return false;
    seen.add(k);
    return exists(p);
  });
}
