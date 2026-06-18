#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createWriteStream } from "node:fs";
import archiver from "archiver";
import { computeStrategyKey } from "../src/lib/strategyKey.js";
import { loadProjectEnv } from "../src/lib/loadEnv.js";
import { runOne } from "../strategies/index.js";

loadProjectEnv();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");

const STRATEGY_MAP = {
  momentum: "cmc-strategy-momentum",
  sentiment: "cmc-strategy-sentiment",
  regime: "cmc-strategy-regime",
};

function skillFolderFor(strategyName) {
  const slug = strategyName.toLowerCase();
  const folder = STRATEGY_MAP[slug];
  if (!folder) throw new Error(`Unknown strategy "${strategyName}". Use: ${Object.keys(STRATEGY_MAP).join(", ")}`);
  return path.join(SKILLS_DIR, folder);
}

async function zipDirectory(sourceDir, outPath, archiveRootName) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDir, archiveRootName || false);
    archive.finalize();
  });
}

async function copySkillFolder(srcDir, destDir) {
  await fs.rm(destDir, { recursive: true, force: true });
  await fs.mkdir(destDir, { recursive: true });
  await fs.cp(srcDir, destDir, { recursive: true });
}

/**
 * Export one CMC-compatible skill folder (+ optional backtest appendix) as zip.
 */
export async function exportCmcSkill(strategyName, opts = {}) {
  const skillDir = skillFolderFor(strategyName);
  await fs.access(path.join(skillDir, "SKILL.md"));

  const { result } = await runOne(strategyName, {
    from: opts.from || "2026-03-01",
    to: opts.to || "2026-06-01",
    symbol: opts.symbol || "BNB",
    convert: opts.convert || "USDT",
  });

  const specPath = path.join(ROOT, "backtest_results", `${strategyName}_BNB_spec.json`);
  let spec = { name: strategyName };
  try {
    const raw = await fs.readFile(specPath, "utf8");
    spec = JSON.parse(raw);
  } catch {
    /* fallback */
  }
  const body = JSON.stringify(spec, null, 2);
  const strategyKey = computeStrategyKey(body, spec.identity?.name || spec.name || strategyName);
  const folderName = path.basename(skillDir);

  const staging = path.join(ROOT, "examples", `.staging-${folderName}`);
  await copySkillFolder(skillDir, staging);

  await fs.writeFile(path.join(staging, "backtest_results.json"), JSON.stringify({
    strategy: strategyName,
    metrics: result.metrics,
    replay: result.replay,
    rules: result.rulesPlainEnglish || [],
    strategyKey,
    simulation_only: true,
    exported_at: new Date().toISOString(),
  }, null, 2));

  const outZip = path.join(ROOT, "examples", `${folderName}.zip`);
  await zipDirectory(staging, outZip, folderName);
  await fs.rm(staging, { recursive: true, force: true });

  return { outZip, strategyKey, folderName, spec };
}

/**
 * Export all three CMC skills as one marketplace bundle zip.
 */
export async function exportFromScan(opts = {}) {
  const exports = [];
  for (const name of Object.keys(STRATEGY_MAP)) {
    const out = await exportCmcSkill(name, opts);
    exports.push(out);
  }

  const bundleStaging = path.join(ROOT, "examples", ".staging-cmc-strategy-skills");
  await fs.rm(bundleStaging, { recursive: true, force: true });
  await fs.mkdir(bundleStaging, { recursive: true });

  for (const name of Object.keys(STRATEGY_MAP)) {
    const src = skillFolderFor(name);
    await fs.cp(src, path.join(bundleStaging, path.basename(src)), { recursive: true });
    const btPath = path.join(ROOT, "backtest_results", `${name}_BNB.json`);
    try {
      await fs.copyFile(btPath, path.join(bundleStaging, path.basename(src), "backtest_results.json"));
    } catch {
      /* optional */
    }
  }

  const bundleZip = path.join(ROOT, "examples", "cmc-strategy-skills.zip");
  await zipDirectory(bundleStaging, bundleZip, false);
  await fs.rm(bundleStaging, { recursive: true, force: true });

  return { bundleZip, exports };
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--from-scan" || !arg) {
    const out = await exportFromScan();
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  const out = await exportCmcSkill(arg);
  console.log(JSON.stringify(out, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
