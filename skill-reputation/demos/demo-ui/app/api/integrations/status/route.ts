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
    forgeMcp: "mcp:forge" in scripts,
    marketplacePost: "marketplace:post" in scripts,
  };

  const agentId = agentState?.agentId ?? agentState?.agent_id ?? null;
  const endpointPrimary =
    (agentState?.endpoint_primary as string) ?? (agentState?.endpoint as string) ?? null;
  const endpointFallback = (agentState?.endpoint_fallback as string) ?? "http://localhost:8000/erc8183/status";
  const explorer = (agentState?.explorer as string) ?? null;
  const attestationUrl =
    (agentState?.attestationExplorer as string) ?? (agentState?.attestation_tx as string) ?? null;

  const bap692Layers = [
    {
      id: "identity",
      standard: "ERC-8004",
      status: agentState?.mode === "live" ? "live" : "demo",
      description: "On-chain agent ID, registration, attestation",
      verify: "npm run agent:register",
      link: explorer,
      ok: agentState?.mode === "live",
    },
    {
      id: "commerce",
      standard: "ERC-8183",
      status: endpointPrimary && !endpointPrimary.includes("localhost") ? "demo" : "demo",
      description: "Backtest jobs via agent server (HTTP + optional on-chain)",
      verify: "npm run marketplace:post",
      link: endpointPrimary,
      ok: Boolean(endpointPrimary),
    },
    {
      id: "payments",
      standard: "x402 + MPP",
      status: "roadmap",
      description: "Micropayment stub — X402_DEMO=1 on agent server",
      verify: "POST /api/jobs with X402_DEMO=1",
      link: null,
      ok: false,
    },
    {
      id: "memory",
      standard: "BNB Greenfield",
      status: "roadmap",
      description: "Pin backtest artifacts via @bnb-chain/mcp",
      verify: "npm run greenfield:pin",
      link: "https://docs.bnbchain.org/developer-kit/mcp/",
      ok: false,
    },
  ];

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
      agentId,
      explorer,
      scanUrl: agentId ? `https://testnet.8004scan.io/agent/${agentId}` : null,
      gasFree: agentState?.gasFree ?? true,
      registry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      registerCmd: "npm run agent:register",
      endpointPrimary,
      endpointFallback,
      attestationUrl,
      endpoints: agentState?.endpoints ?? [],
    },
    bap692: {
      framework: "BAP-692",
      layers: bap692Layers,
      agentEndpoint: endpointPrimary,
      agentFallback: endpointFallback,
      scanUrl: agentId ? `https://testnet.8004scan.io/agent/${agentId}` : null,
      pitch:
        "Track 2 research layer on BNB agent stack: Skills + MCP → ERC-8004 → ERC-8183 jobs → x402/Greenfield roadmap.",
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
