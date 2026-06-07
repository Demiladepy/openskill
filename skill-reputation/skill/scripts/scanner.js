#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { keccak256, stringToBytes } from "viem";
import { validateCmcApiKey } from "../../backtest/cmcDataFetcher.js";
import { loadProjectEnv } from "../../backtest/lib/loadEnv.js";
import { parseFrontmatter } from "./lib/parseFrontmatter.js";
import { computeSkillKey, normalizeName } from "./lib/skillKey.js";
import { resolveRoots } from "./lib/defaultRoots.js";

loadProjectEnv();

function parseArgs(argv) {
  const roots = [];
  let out;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--roots" && argv[i + 1]) {
      roots.push(...argv[++i].split(";").map((x) => x.trim()).filter(Boolean));
    } else if (argv[i] === "--out" && argv[i + 1]) {
      out = argv[++i];
    }
  }
  return { roots, out };
}

async function walkSkillFiles(rootDir) {
  const results = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".git") continue;
        await walk(full);
      } else if (/^skill\.md$/i.test(ent.name)) {
        results.push(full);
      }
    }
  }
  await walk(rootDir);
  return results;
}

export function defaultLogPath() {
  if (process.env.CMC_STRATEGY_VAULT_LOG) return process.env.CMC_STRATEGY_VAULT_LOG;
  if (process.env.SKILL_REPUTATION_LOG) return process.env.SKILL_REPUTATION_LOG;
  const base =
    process.env.XDG_CONFIG_HOME ||
    (process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(path.homedir(), "AppData", "Roaming"), "cmc-strategy-vault")
      : path.join(path.homedir(), ".config", "cmc-strategy-vault"));
  return path.join(base, "behavior-log.jsonl");
}

async function main() {
  await runScan(process.argv);
}

/**
 * @param {string[]} argv
 * @param {{ skipCmcValidation?: boolean }} [opts]
 */
export async function runScan(argv, opts = {}) {
  const { roots: cliRoots, out: cliOut } = parseArgs(argv);
  const roots =
    cliRoots.length > 0 ? cliRoots.map((p) => path.resolve(p)) : resolveRoots(
      process.env.CMC_STRATEGY_ROOTS || process.env.SKILL_REPUTATION_ROOTS
    );
  const logPath = cliOut || defaultLogPath();

  if (!opts.skipCmcValidation && process.env.CMC_API_KEY) {
    const validation = await validateCmcApiKey({ required: false });
    console.log(JSON.stringify({ cmcValidation: validation }, null, 2));
    if (!validation.ok && !validation.skipped) {
      throw new Error("CMC_API_KEY validation failed");
    }
  }

  if (roots.length === 0) {
    throw new Error("No skill roots found. Set CMC_STRATEGY_ROOTS / SKILL_REPUTATION_ROOTS or create ~/.openclaw/skills etc.");
  }

  const skills = [];
  for (const root of roots) {
    const files = await walkSkillFiles(root);
    for (const file of files) {
      const raw = await fs.readFile(file, "utf8");
      const { front } = parseFrontmatter(raw);
      const name = front.name || "";
      if (!name) continue;
      const st = await fs.stat(file);
      const skillKey = computeSkillKey(raw, name);
      skills.push({
        root,
        path: file,
        name: normalizeName(name),
        displayName: name.trim(),
        description: (front.description || "").slice(0, 500),
        mtimeMs: st.mtimeMs,
        size: st.size,
        skillKey,
      });
    }
  }

  skills.sort((a, b) => a.skillKey.localeCompare(b.skillKey));

  const snapshot = {
    version: 1,
    ts: new Date().toISOString(),
    roots,
    skills: skills.map((s) => ({
      name: s.displayName,
      normalizedName: s.name,
      skillKey: s.skillKey,
      path: s.path,
      mtimeMs: s.mtimeMs,
      size: s.size,
      description: s.description,
    })),
  };

  const digest = keccak256(stringToBytes(JSON.stringify(snapshot)));

  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const line = JSON.stringify({
    type: "scan",
    ts: snapshot.ts,
    digest,
    snapshot,
  });
  await fs.appendFile(logPath, line + "\n", "utf8");

  console.log(JSON.stringify({ roots, skillsFound: skills.length, digest, logPath }, null, 2));
  return { roots, skillsFound: skills.length, digest, logPath };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
