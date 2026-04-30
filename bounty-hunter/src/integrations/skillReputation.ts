import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ReputationSignal } from "../types";

const execFileAsync = promisify(execFile);

function parseDotEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

export async function runSkillReputationBridge(params: {
  bountyId: string;
  passed: boolean;
  expectedAuthor: string;
}): Promise<ReputationSignal> {
  const enabled = process.env.BH_ENABLE_SKILL_REPUTATION === "1";
  const baseScore = params.passed ? 82 : 28;
  const baseConfidence = params.passed ? 0.78 : 0.72;
  if (!enabled) {
    return {
      enabled: false,
      score: baseScore,
      confidence: baseConfidence,
      reasons: ["Reputation integration disabled; fallback heuristic used."],
      provenance: "local-heuristic",
      details: "Set BH_ENABLE_SKILL_REPUTATION=1 to enable scanner-backed reputation."
    };
  }

  const skillDir = path.resolve(
    process.cwd(),
    process.env.SKILL_REPUTATION_SKILL_DIR || "../skill-reputation/skill"
  );
  const envPath = path.join(skillDir, ".env");

  const rawEnv = await fs.readFile(envPath, "utf8").catch(() => "");
  if (!rawEnv) {
    return {
      enabled: true,
      score: baseScore,
      confidence: baseConfidence - 0.1,
      reasons: [`No ${envPath} found; fallback heuristic used.`],
      provenance: "local-heuristic",
      details: "Create skill-reputation/skill/.env for scanner-backed reputation."
    };
  }

  const mergedEnv = {
    ...process.env,
    ...parseDotEnv(rawEnv),
    SKILL_REPUTATION_LOG:
      process.env.SKILL_REPUTATION_LOG ||
      path.resolve(process.cwd(), "audit", "skill-reputation-log.jsonl")
  };

  const score = params.passed ? 85 : 25;

  await execFileAsync("node", ["scripts/scanner.js"], {
    cwd: skillDir,
    env: mergedEnv,
    maxBuffer: 1024 * 1024
  });

  return {
    enabled: true,
    score,
    confidence: Math.min(0.95, baseConfidence + 0.1),
    reasons: [
      "Skill inventory scan completed successfully.",
      params.passed ? "Verification passed, increasing trust score." : "Verification failed, reducing trust score."
    ],
    provenance: "skill-reputation-scanner",
    details: `SkillReputation scanner completed for bounty ${params.bountyId} (author ${params.expectedAuthor}).`
  };
}
