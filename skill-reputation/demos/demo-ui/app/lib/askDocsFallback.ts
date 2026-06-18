/**
 * TypeScript fallback when Python subprocess unavailable (e.g. Vercel serverless).
 * Mirrors ask_docs/engine.py scoring against the same knowledge intents.
 */

import fs from "node:fs";
import path from "node:path";

type Intent = {
  id: string;
  keywords: string[];
  section: string;
  title: string;
  body: string;
};

const INTENTS: Intent[] = [
  {
    id: "install",
    keywords: ["install", "add", "npx", "cursor", "windsurf", "claude", "agent"],
    section: "for-agents",
    title: "Install Forge Skills",
    body: "Install with:\n\nnpx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills\n\nOr copy skills/cmc-strategy-* into your agent skills directory.",
  },
  {
    id: "backtest",
    keywords: ["backtest", "run", "strategy", "sharpe", "btc", "eth", "bnb"],
    section: "quick-start",
    title: "Run backtests",
    body: "From skill-reputation/:\n\nnpm run strategy:all\nnpm run strategy:momentum\n\nResults: backtest_results/{strategy}_{asset}.json",
  },
  {
    id: "skill_md",
    keywords: ["skill.md", "frontmatter", "format", "belongs", "structure"],
    section: "skill-structure",
    title: "SKILL.md format",
    body: "YAML frontmatter: name, version, description, tags, author. Sections: Description, Prerequisites, CMC Data Sources, Strategy Logic, Usage, Output Format.",
  },
  {
    id: "export",
    keywords: ["export", "zip", "marketplace", "dora"],
    section: "export-skills",
    title: "Export skills",
    body: "npm run export:skills → examples/cmc-strategy-skills.zip",
  },
  {
    id: "attest",
    keywords: ["attest", "bsc", "twak", "on-chain", "wallet"],
    section: "attestations",
    title: "BSC attestation",
    body: "Set AGENT_PRIVATE_KEY, fund BSC testnet wallet, run npm run attest.",
  },
  {
    id: "verify",
    keywords: ["verify", "checklist", "check", "secrets"],
    section: "verify",
    title: "Verify submission",
    body: "npm run verify && npm run check:secrets",
  },
  {
    id: "cmc",
    keywords: ["cmc", "api", "mock", "live", "mcp", "fear", "greed"],
    section: "cmc-integration",
    title: "CMC integration",
    body: "CMC_API_KEY + CMC_USE_MOCK=0 for live. src/cmcDataClient.js handles quotes, Fear & Greed, global metrics, synthetic OHLCV fallback.",
  },
  {
    id: "overview",
    keywords: ["what", "forge", "start", "help", "hi", "hello"],
    section: "overview",
    title: "Forge Skills overview",
    body: "Quant strategy skills for AI agents. npm run strategy:all → replay → export:skills → verify. Simulation only.",
  },
];

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g) || []);
}

function scoreIntent(tokens: Set<string>, intent: Intent): number {
  let score = 0;
  for (const kw of intent.keywords) {
    const kwTokens = tokenize(kw);
    for (const t of kwTokens) {
      if (tokens.has(t)) score += 1.5;
    }
    if (tokens.has(kw.replace(/\s/g, ""))) score += 3;
  }
  return score;
}

function loadBacktests(root: string): Array<{ strategy: string; asset: string; sharpe: number; trades: number }> {
  const dir = path.join(root, "backtest_results");
  if (!fs.existsSync(dir)) return [];
  const rows: Array<{ strategy: string; asset: string; sharpe: number; trades: number }> = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json") || file.includes("_spec") || file.includes("replay")) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      if (data.metrics) {
        rows.push({
          strategy: data.strategy,
          asset: data.asset,
          sharpe: data.metrics.sharpeRatio,
          trades: data.metrics.trades,
        });
      }
    } catch {
      /* skip */
    }
  }
  return rows;
}

export function askDocsFallback(question: string, root: string) {
  const tokens = tokenize(question);
  const scored = INTENTS.map((intent) => ({ intent, score: scoreIntent(tokens, intent) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]?.score > 0 ? scored[0].intent : INTENTS.find((i) => i.id === "overview")!;

  const backtests = loadBacktests(root);
  let extra = "";
  if (backtests.length) {
    extra =
      "\n\nBacktest results:\n" +
      backtests.map((r) => `- ${r.strategy}/${r.asset}: Sharpe ${r.sharpe?.toFixed(2)}, ${r.trades} trades`).join("\n");
  }

  return {
    ok: true,
    question,
    title: top.title,
    answer: top.body + extra,
    sectionId: top.section,
    intent: top.id,
    confidence: 0.5,
    commands: [] as string[],
    related: [],
  };
}
