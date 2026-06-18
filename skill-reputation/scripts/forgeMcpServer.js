#!/usr/bin/env node
/**
 * Forge Skills MCP server — expose backtests, CMC signals, and submission checks to agents.
 * npm run mcp:forge
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadProjectEnv } from "../src/lib/loadEnv.js";
import { scanStrategyRegistry } from "../src/skillRegistry.js";
import { getSignals } from "../src/cmcSignals.js";
import { BAP692_LAYERS, BNB_STACK, readAgentState, loadBnbIntegration } from "../src/lib/bnbStack.js";

loadProjectEnv();

const execFileAsync = promisify(execFile);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STRATEGIES = ["momentum", "sentiment", "regime"];
const ASSETS = ["BTC", "ETH", "BNB"];

async function readJson(p) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

function jsonResult(data) {
  const text = JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

async function listSkills() {
  const skillDirs = [];
  const skillsRoot = path.join(ROOT, "skills");
  for (const name of await fs.readdir(skillsRoot).catch(() => [])) {
    const skillPath = path.join(skillsRoot, name, "SKILL.md");
    try {
      await fs.access(skillPath);
      const raw = await fs.readFile(skillPath, "utf8");
      const descMatch = raw.match(/^description:\s*(.+)$/m);
      skillDirs.push({
        id: name,
        path: `skills/${name}/SKILL.md`,
        description: descMatch?.[1]?.trim() || name,
      });
    } catch {
      /* skip */
    }
  }

  const registry = await scanStrategyRegistry().catch(() => null);

  return {
    project: "CMC Strategy Forge",
    skills: skillDirs,
    strategies: STRATEGIES,
    assets: ASSETS,
    registry_count: registry?.count ?? null,
    install: "npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills",
    note: "Simulation-only quant research skills. Track 2 — no live trading.",
  };
}

async function getBacktest(strategy, asset) {
  const strat = strategy.toLowerCase();
  const sym = asset.toUpperCase();
  if (!STRATEGIES.includes(strat)) {
    throw new Error(`Unknown strategy "${strategy}". Use: ${STRATEGIES.join(", ")}`);
  }
  if (!ASSETS.includes(sym)) {
    throw new Error(`Unknown asset "${asset}". Use: ${ASSETS.join(", ")}`);
  }

  const resultPath = path.join(ROOT, "backtest_results", `${strat}_${sym}.json`);
  const specPath = path.join(ROOT, "backtest_results", `${strat}_${sym}_spec.json`);
  const result = await readJson(resultPath);
  if (!result) {
    throw new Error(`No backtest at backtest_results/${strat}_${sym}.json — run npm run strategy:all`);
  }

  const spec = await readJson(specPath);
  return {
    strategy: strat,
    asset: sym,
    range: result.range,
    metrics: result.metrics,
    dataSource: result.dataSource || spec?.data_sources?.primary || "unknown",
    skillPath: `skills/cmc-strategy-${strat}/SKILL.md`,
    specSchema: spec?.schema || null,
    bnb_integration: spec?.bnb_integration || loadBnbIntegration(result.attestation),
    highlight:
      strat === "regime" && sym === "BTC"
        ? "Best live result in submission window — Sharpe 2.17 (2026-03-01 → 2026-06-01)"
        : undefined,
    files: {
      result: `backtest_results/${strat}_${sym}.json`,
      spec: spec ? `backtest_results/${strat}_${sym}_spec.json` : null,
    },
  };
}

function agentStatus() {
  const state = readAgentState();
  return {
    registered: state?.mode === "live",
    mode: state?.mode || "not configured",
    agentId: state?.agentId ?? state?.agent_id ?? null,
    wallet: state?.wallet ?? null,
    explorer: state?.explorer ?? null,
    scan_url: state?.scan_url ?? (state?.agentId ? `${BNB_STACK.scan_testnet}agent/${state.agentId}` : null),
    endpoint_primary: state?.endpoint_primary ?? state?.endpoint ?? null,
    endpoint_fallback: state?.endpoint_fallback ?? "http://localhost:8000/erc8183/status",
    endpoints: state?.endpoints ?? [],
    bap692_layers: state?.bap692_layers ?? BAP692_LAYERS.map((l) => l.id),
    gasFree: state?.gasFree ?? true,
    register_cmd: "npm run agent:register",
    note: "Re-register with AGENT_PUBLIC_URL when Render URL changes.",
  };
}

function bnbStackInfo() {
  return {
    framework: "BAP-692",
    solutions_url: BNB_STACK.solutions_url,
    layers: BAP692_LAYERS,
    contracts: {
      erc8004_registry: BNB_STACK.registry,
      erc8183_commerce: BNB_STACK.erc8183_commerce,
      erc8183_router: BNB_STACK.erc8183_router,
      erc8183_policy: BNB_STACK.erc8183_policy,
    },
    mcp_configs: {
      forge: "forge-mcp-config.json",
      twak: "twak-mcp-config.json",
      bnb_chain: "bnb-mcp-config.json",
    },
    skills_install: BNB_STACK.skills_install,
    agent_status: agentStatus(),
    pitch:
      "Track 2 research layer: CMC Skills + Forge MCP → ERC-8004 identity → ERC-8183 backtest jobs → x402/Greenfield roadmap.",
  };
}

async function verifySubmission() {
  const checklistPath = path.join(ROOT, "replay", "output", "hackathon_checklist.json");

  try {
    await execFileAsync(process.execPath, ["scripts/hackathonVerify.js"], {
      cwd: ROOT,
      env: process.env,
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch (err) {
    if (err.code !== 1 && err.code !== undefined) {
      throw new Error(err.stderr || err.message || "verify failed");
    }
  }

  const manifest = await readJson(checklistPath);
  if (!manifest) {
    throw new Error("Verify did not produce replay/output/hackathon_checklist.json");
  }

  const failed = (manifest.checklist || []).filter((c) => !c.ok && c.severity === "required");
  return {
    ...manifest,
    ready: failed.length === 0,
    failed_required: failed.map((c) => c.name),
    command: "npm run verify",
  };
}

const server = new McpServer(
  {
    name: "forge-skills",
    version: "1.0.0",
  },
  {
    instructions:
      "CMC Strategy Forge MCP — BNB Chain Agent Skills and MCPs stack (BAP-692). List skills, read backtests, fetch CMC signals, check ERC-8004 agent status, and run submission verify. Simulation only; no trade execution.",
  }
);

server.registerTool(
  "forge_list_skills",
  {
    description:
      "List installable CMC strategy skills (momentum, sentiment, regime) and registry metadata for Forge Skills.",
    inputSchema: z.object({}),
  },
  async () => jsonResult(await listSkills())
);

server.registerTool(
  "forge_get_backtest",
  {
    description:
      "Return backtest metrics and file paths for a strategy/asset pair (e.g. regime + BTC → Sharpe 2.17).",
    inputSchema: z.object({
      strategy: z.enum(["momentum", "sentiment", "regime"]).describe("Strategy id"),
      asset: z.enum(["BTC", "ETH", "BNB"]).describe("Asset symbol"),
    }),
  },
  async ({ strategy, asset }) => jsonResult(await getBacktest(strategy, asset))
);

server.registerTool(
  "forge_get_signals",
  {
    description:
      "Fetch current CoinMarketCap signal snapshot (price, Fear & Greed, global metrics, optional MCP technicals, optional TWAK risk).",
    inputSchema: z.object({
      symbol: z.string().default("BTC").describe("Crypto symbol, e.g. BTC"),
      convert: z.string().default("USDT").describe("Quote currency"),
    }),
  },
  async ({ symbol, convert }) => jsonResult(await getSignals(symbol, convert))
);

server.registerTool(
  "forge_verify_submission",
  {
    description:
      "Run npm run verify and return the hackathon submission checklist (backtests, skill zips, optional on-chain steps).",
    inputSchema: z.object({}),
  },
  async () => jsonResult(await verifySubmission())
);

server.registerTool(
  "forge_agent_status",
  {
    description:
      "Return ERC-8004 agent registration state (agentId, BscScan tx, primary/fallback endpoints, BAP-692 layers).",
    inputSchema: z.object({}),
  },
  async () => jsonResult(agentStatus())
);

server.registerTool(
  "forge_bnb_stack",
  {
    description:
      "Return BAP-692 four-layer map (Identity, Commerce, Payments, Memory), contract addresses, and MCP config paths.",
    inputSchema: z.object({}),
  },
  async () => jsonResult(bnbStackInfo())
);

const transport = new StdioServerTransport();
await server.connect(transport);
