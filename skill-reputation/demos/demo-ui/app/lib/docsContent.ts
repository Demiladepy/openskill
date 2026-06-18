export type SkillLevel = {
  level: string;
  whenLoaded: string;
  tokenCost: string;
  content: string;
  contentDetail?: string;
};

export const SKILL_LEVELS: SkillLevel[] = [
  {
    level: "Level 1: Metadata",
    whenLoaded: "Always (at startup)",
    tokenCost: "~100 tokens per skill",
    content: "name and description from YAML frontmatter",
    contentDetail: "name, version, description, tags, author",
  },
  {
    level: "Level 2: Instructions",
    whenLoaded: "When the skill is triggered",
    tokenCost: "Under 5k tokens",
    content: "Full SKILL.md body",
    contentDetail: "strategy logic, CMC endpoints, usage prompts, output schema",
  },
  {
    level: "Level 3: Resources",
    whenLoaded: "As needed",
    tokenCost: "Effectively unlimited",
    content: "CLI, backtest engine, exported zips",
    contentDetail: "strategies/, npm run strategy:all, backtest_results/*.json",
  },
];

export type DocFaq = {
  id: string;
  question: string;
  answer: string;
  sectionId: string;
  keywords: string[];
};

export const DOCS_FAQ: DocFaq[] = [
  {
    id: "what-are-skills",
    question: "What are Forge Skills?",
    answer:
      "Installable quant strategy packages for AI agents. Each skill is a folder with SKILL.md in CoinMarketCap's official format. Your agent reads the skill, runs the CLI backtest pipeline, and returns auditable JSON metrics.",
    sectionId: "overview",
    keywords: ["skills", "forge", "agent", "what"],
  },
  {
    id: "how-loaded",
    question: "How does progressive disclosure work?",
    answer:
      "Level 1 (metadata) loads at startup so agents know the skill exists. Level 2 (SKILL.md) loads when triggered. Level 3 (CLI + JSON results) runs only when executing a backtest or export.",
    sectionId: "specification",
    keywords: ["load", "levels", "metadata", "tokens", "disclosure"],
  },
  {
    id: "install",
    question: "How do I install skills in my agent?",
    answer:
      "Run: npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills — or copy skills/cmc-strategy-* into your agent's skills directory.",
    sectionId: "for-agents",
    keywords: ["install", "npx", "add", "cursor"],
  },
  {
    id: "run-backtest",
    question: "How do I run a backtest?",
    answer:
      "From skill-reputation/: npm run strategy:all runs momentum, sentiment, and regime on BTC, ETH, and BNB. Results land in backtest_results/*.json with Sharpe, drawdown, trades, and equity curves.",
    sectionId: "quick-start",
    keywords: ["backtest", "run", "strategy", "npm"],
  },
  {
    id: "skill-md",
    question: "What belongs in SKILL.md?",
    answer:
      "YAML frontmatter (name, version, description, tags) plus sections: Description, Prerequisites, CMC Data Sources, Strategy Logic, Usage (copy-paste prompts), and Output Format.",
    sectionId: "skill-structure",
    keywords: ["skill.md", "format", "frontmatter", "yaml"],
  },
  {
    id: "cmc-api",
    question: "Which CoinMarketCap endpoints are used?",
    answer:
      "quotes/latest (price + % changes), Fear & Greed (latest + historical), global-metrics (BTC dominance). Optional MCP adds pre-computed RSI/MACD when MCP_ENABLED=1.",
    sectionId: "cmc-integration",
    keywords: ["cmc", "api", "mcp", "data", "fear", "greed"],
  },
  {
    id: "export",
    question: "How do I export skills for submission?",
    answer:
      "npm run export:skills creates examples/cmc-strategy-skills.zip containing all three CMC-format skill folders plus backtest appendix files.",
    sectionId: "export-skills",
    keywords: ["export", "zip", "marketplace", "dora"],
  },
  {
    id: "attest",
    question: "How does BSC attestation work?",
    answer:
      "Set AGENT_PRIVATE_KEY, fund a BSC testnet wallet, run npm run attest. The pipeline signs a strategy digest (TWAK-compatible self-custody) and posts a verifiable tx to BscScan testnet.",
    sectionId: "attestations",
    keywords: ["attest", "bsc", "twak", "on-chain", "wallet"],
  },
  {
    id: "mock-vs-live",
    question: "Mock vs live CMC data?",
    answer:
      "Set CMC_API_KEY and CMC_USE_MOCK=0 for live data. Free tier may block historical OHLCV — the client synthesizes daily bars from live spot + official % changes (labeled cmc-synthetic-ohlcv).",
    sectionId: "cmc-integration",
    keywords: ["mock", "live", "api key", "ohlcv"],
  },
  {
    id: "verify",
    question: "How do I check submission readiness?",
    answer:
      "npm run verify runs a checklist: backtest files exist, skill zips present, replay HTML generated, and flags missing on-chain proofs. Run npm run check:secrets before pushing to GitHub.",
    sectionId: "verify",
    keywords: ["verify", "checklist", "submission"],
  },
  {
    id: "agent-prompt",
    question: "What should I paste into Cursor or Windsurf?",
    answer:
      'Try: "@skill-reputation Run the momentum backtest on BTC using skills/cmc-strategy-momentum/SKILL.md. Return Sharpe, drawdown, trade count, and the path to backtest_results/momentum_BTC.json."',
    sectionId: "for-agents",
    keywords: ["cursor", "prompt", "paste", "windsurf", "claude"],
  },
  {
    id: "simulation",
    question: "Does this execute live trades?",
    answer:
      "No. Forge Skills is simulation-only research software. Backtests produce metrics and equity curves for strategy evaluation — no orders reach any exchange.",
    sectionId: "overview",
    keywords: ["live", "trading", "simulation", "safe"],
  },
];

export const SKILL_MD_EXAMPLE = `---
name: cmc-strategy-momentum
version: 1.0.0
description: Backtestable momentum strategy on BTC/ETH/BNB using CMC RSI, MACD, and Fear & Greed
author: CMC Strategy Forge
tags: [crypto, momentum, backtesting, coinmarketcap, quant]
---

# CMC Momentum Strategy Skill

## Description
Score-based momentum strategy consuming CoinMarketCap pre-computed signals.
Designed for agent-driven backtests — simulation only, no live trading.

## Prerequisites
- CMC_API_KEY in skill-reputation/.env (or MCP_ENABLED=1)
- Node.js 18+

## Usage
"Run the momentum backtest on BTC for 2026-03-01 to 2026-06-01.
Return metrics from backtest_results/momentum_BTC.json."`;
