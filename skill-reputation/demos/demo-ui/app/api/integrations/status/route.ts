import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const runtime = "nodejs";

function repoRoot(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "..");
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function loadBacktests(root: string) {
  const dir = path.join(root, "backtest_results");
  if (!fs.existsSync(dir)) return { count: 0, best: null, rows: [] as Array<Record<string, unknown>> };

  const rows: Array<Record<string, unknown>> = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json") || file.includes("_spec") || file.includes("replay")) continue;
    const data = readJson<{ strategy: string; asset: string; metrics?: { sharpeRatio?: number }; dataSource?: string }>(
      path.join(dir, file)
    );
    if (data?.metrics) {
      rows.push({
        strategy: data.strategy,
        asset: data.asset,
        sharpe: data.metrics.sharpeRatio,
        dataSource: data.dataSource,
        file,
      });
    }
  }

  const best = rows.length
    ? rows.reduce((a, b) => ((a.sharpe as number) > (b.sharpe as number) ? a : b))
    : null;

  return { count: rows.length, best, rows };
}

function checkTwakCli(): Promise<{ available: boolean; version?: string }> {
  return new Promise((resolve) => {
    const child = spawn("twak", ["--version"], { windowsHide: true });
    let out = "";
    child.stdout.on("data", (c) => {
      out += c.toString();
    });
    child.on("error", () => resolve({ available: false }));
    child.on("close", (code) => {
      resolve(code === 0 ? { available: true, version: out.trim() || undefined } : { available: false });
    });
  });
}

export async function GET() {
  const root = repoRoot();
  const backtests = loadBacktests(root);
  const agentState = readJson<Record<string, unknown>>(path.join(root, "bnbagent", "agent_state.json"));
  const pkg = readJson<{ scripts?: Record<string, string> }>(path.join(root, "package.json"));

  let twak: { available: boolean; version?: string } = { available: false };
  try {
    twak = await checkTwakCli();
  } catch {
    /* serverless — no twak binary */
  }

  const scripts = pkg?.scripts || {};
  const integrationScripts = {
    twakCheck: "twak:check" in scripts,
    twakSetup: "twak:setup" in scripts,
    agentRegister: "agent:register" in scripts,
    agentDiscover: "agent:discover" in scripts,
    strategyAll: "strategy:all" in scripts,
    attest: "attest" in scripts,
  };

  return NextResponse.json({
    ok: true,
    environment: process.env.VERCEL ? "vercel" : "local",
    backtests,
    twak: {
      ...twak,
      cliBridge: "src/twakCliClient.js",
      envFlag: "TWAK_ENABLED=1",
      install: "npm install -g @trustwallet/cli",
      portal: "https://portal.trustwallet.com/dashboard/apps",
      note: twak.available
        ? "TWAK CLI detected on this server"
        : "TWAK runs on your machine — install locally and set TWAK_ENABLED=1",
    },
    bnbAgent: {
      registered: agentState?.mode === "live",
      mode: agentState?.mode || "not configured",
      agentId: agentState?.agentId ?? agentState?.agent_id ?? null,
      explorer: agentState?.explorer ?? null,
      gasFree: agentState?.gasFree ?? true,
      registry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      registerCmd: "npm run agent:register",
    },
    cmc: {
      client: "src/cmcDataClient.js",
      signals: "src/cmcSignals.js",
      skills: 3,
    },
    scripts: integrationScripts,
    liveOnDemo: {
      askDocs: true,
      exportApi: true,
      backtestTable: backtests.count > 0,
      twakEnrichment: twak.available,
      bnbRegistration: agentState?.mode === "live",
      chainExplorer: Boolean(process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT),
    },
  });
}
