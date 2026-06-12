#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { keccak256, stringToBytes } from "viem";
import { loadProjectEnv } from "./lib/loadEnv.js";
import { getBehaviorLogPath } from "./lib/logPath.js";
import { computeStrategyKey } from "./lib/strategyKey.js";
import { assertStrategyInterface } from "../strategies/baseStrategy.js";
import { parseFrontmatter } from "../skill/scripts/lib/parseFrontmatter.js";

loadProjectEnv();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function walkStrategyManifests(dir) {
  const out = [];
  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".git") continue;
        await walk(full);
      } else if (/^(strategy|skill)\.md$/i.test(ent.name)) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out;
}

async function loadJsStrategy(modulePath) {
  const mod = await import(modulePath);
  const StrategyClass = mod.default || mod[Object.keys(mod)[0]];
  if (!StrategyClass) return null;
  const instance = typeof StrategyClass === "function" ? new StrategyClass() : StrategyClass;
  assertStrategyInterface(instance);
  return instance;
}

export async function scanStrategyRegistry(strategiesDir = path.join(ROOT, "strategies")) {
  const manifests = await walkStrategyManifests(strategiesDir);
  const skillManifests = await walkStrategyManifests(path.join(ROOT, "skills"));
  const entries = [];

  for (const file of [...manifests, ...skillManifests]) {
    const raw = await fs.readFile(file, "utf8");
    const { front } = parseFrontmatter(raw);
    const name = front.name || path.basename(path.dirname(file));
    const st = await fs.stat(file);
    const strategyKey = computeStrategyKey(raw, name);
    entries.push({
      kind: "manifest",
      name,
      strategyKey,
      path: file,
      mtimeMs: st.mtimeMs,
      description: (front.description || "").slice(0, 500),
    });
  }

  const jsFiles = ["momentumMerger.js", "sentimentDivergence.js", "regimeDetector.js"];
  for (const js of jsFiles) {
    const full = path.join(strategiesDir, js);
    try {
      await fs.access(full);
      const instance = await loadJsStrategy(pathToFileURL(full).href);
      const spec = instance.exportSpec();
      const strategyKey = computeStrategyKey(JSON.stringify(spec), spec.name);
      entries.push({
        kind: "implementation",
        name: spec.name,
        strategyKey,
        path: full,
        interfaceValid: true,
      });
    } catch (err) {
      entries.push({
        kind: "implementation",
        name: js,
        strategyKey: null,
        path: full,
        interfaceValid: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  entries.sort((a, b) => String(a.strategyKey).localeCompare(String(b.strategyKey)));

  const snapshot = {
    version: 1,
    ts: new Date().toISOString(),
    project: "CMC Strategy Forge",
    strategiesDir,
    strategies: entries,
  };

  const digest = keccak256(stringToBytes(JSON.stringify(snapshot)));
  const logPath = getBehaviorLogPath();
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(
    logPath,
    JSON.stringify({ type: "scan", ts: snapshot.ts, digest, snapshot }) + "\n",
    "utf8"
  );

  return { digest, logPath, snapshot, count: entries.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  scanStrategyRegistry()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
