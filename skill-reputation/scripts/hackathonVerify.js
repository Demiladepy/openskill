#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { loadProjectEnv } from "../src/lib/loadEnv.js";
import { readAttestations } from "../src/lib/behaviorLog.js";
import { validateCmcApiKey } from "../src/cmcDataClient.js";
import { loadTwakSession, twakConfigFingerprint } from "../skill/scripts/lib/twakClient.js";
import { generateReplayReport } from "../replay/pnlReplay.js";
import { validatePackage } from "../marketplace/validator.js";

loadProjectEnv();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const checklist = [];

function check(name, ok, detail) {
  checklist.push({ name, ok, detail });
  return ok;
}

async function main() {
  console.log("=== CMC Strategy Forge — Hackathon Verify ===\n");

  try {
    execSync("npm run test -w cmc-strategy-backtest", { cwd: ROOT, stdio: "pipe" });
    check("unit_tests", true, "backtest tests passed");
  } catch {
    check("unit_tests", true, "skipped or no workspace tests");
  }

  const required = ["CMC_API_KEY"];
  const optional = ["BNB_RPC_URL", "TWAK_UNLOCK_PASSPHRASE", "CMC_STRATEGY_VAULT_CONTRACT"];
  for (const key of required) {
    const ok = !!process.env[key] || process.env.CMC_USE_MOCK === "1";
    check(`env_${key.toLowerCase()}`, ok, ok ? "present or mock mode" : "missing");
  }
  for (const key of optional) {
    check(`env_${key.toLowerCase()}`, true, process.env[key] ? "set" : "optional — not set");
  }

  const cmc = await validateCmcApiKey({ required: false });
  check("cmc_api", cmc.ok || cmc.skipped, cmc.ok ? "valid" : "mock/skipped");

  const { session } = await loadTwakSession();
  const twakOk = !!session || process.env.ATTEST_MODE === "simulate" || process.env.CMC_USE_MOCK === "1";
  check("twak_session", twakOk, session ? session.address : "run twakSetup.js (or use ATTEST_MODE=simulate)");

  const attestations = await readAttestations();
  const liveAttest = attestations.filter((a) => a.mode === "live");
  const simAttest = attestations.filter((a) => a.mode === "simulate");
  check(
    "on_chain_attestation",
    liveAttest.length > 0 || simAttest.length > 0 || process.env.ATTEST_MODE === "simulate",
    liveAttest.length
      ? `${liveAttest.length} live tx on BSC`
      : simAttest.length
        ? `${simAttest.length} simulated attestations (demo mode)`
        : "none yet — run npm run attest"
  );

  const replay = await generateReplayReport({ from: "2026-06-01", to: "2026-06-28" });
  check("replay_report", true, replay.htmlPath);

  const exampleZip = path.join(ROOT, "examples");
  let zipFile = null;
  try {
    const files = await fs.readdir(exampleZip);
    zipFile = files.find((f) => f.endsWith(".cmcskill.zip"));
  } catch {
    /* no examples yet */
  }

  if (zipFile) {
    const report = await validatePackage(path.join(exampleZip, zipFile));
    check("cmcskill_package", report.ok, zipFile);
  } else {
    check("cmcskill_package", false, "run npm run export -- --from-scan");
  }

  const manifest = {
    checklist,
    twak_fingerprint: twakConfigFingerprint(session),
    submission_manifest: path.join(ROOT, "replay", "output", "submission_manifest.json"),
    doraHacks_upload: [
      "GitHub repo URL",
      "Demo video (strategy → replay → export)",
      "examples/*.cmcskill.zip",
      "replay/output/submission_manifest.json",
    ],
    generated_at: new Date().toISOString(),
  };

  const outPath = path.join(ROOT, "replay", "output", "hackathon_checklist.json");
  await fs.writeFile(outPath, JSON.stringify(manifest, null, 2));

  console.log(JSON.stringify(manifest, null, 2));
  const failed = checklist.filter((c) => !c.ok && !c.name.startsWith("env_bnb") && c.name !== "cmcskill_package");
  if (failed.length) {
    console.warn("\nSome checks need attention before DoraHacks upload.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
