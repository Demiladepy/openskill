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
    tokenCost: "~100 tokens per Skill",
    content: "name and description from YAML frontmatter",
    contentDetail: "name, version, description, tags, author",
  },
  {
    level: "Level 2: Instructions",
    whenLoaded: "When Skill is triggered",
    tokenCost: "Under 5k tokens",
    content: "Full SKILL.md body",
    contentDetail: "Strategy logic, CMC endpoints, usage prompts, output format",
  },
  {
    level: "Level 3: Resources",
    whenLoaded: "As needed",
    tokenCost: "Effectively unlimited",
    content: "CLI scripts, backtest engine, exported zips",
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
      "Forge Skills are installable quant strategy packages in CMC Agent Hub format. Each skill is a folder with SKILL.md frontmatter plus instructions an agent reads when triggered.",
    sectionId: "overview",
    keywords: ["skills", "forge", "agent", "what"],
  },
  {
    id: "how-loaded",
    question: "How are skills loaded?",
    answer:
      "Three levels: (1) Metadata always in context at startup, (2) Full SKILL.md when the skill triggers, (3) Resources like CLI and backtest JSON loaded on demand.",
    sectionId: "specification",
    keywords: ["load", "levels", "metadata", "tokens"],
  },
  {
    id: "install",
    question: "How do I install skills?",
    answer: "Run: npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills",
    sectionId: "for-agents",
    keywords: ["install", "npx", "add"],
  },
  {
    id: "run-backtest",
    question: "How do I run a backtest?",
    answer: "cd skill-reputation && npm run strategy:all — runs momentum, sentiment, regime on BTC, ETH, BNB.",
    sectionId: "quick-start",
    keywords: ["backtest", "run", "strategy"],
  },
  {
    id: "skill-md",
    question: "What is SKILL.md format?",
    answer:
      "YAML frontmatter (name, version, description, tags) plus markdown sections: Description, Prerequisites, CMC Data Sources, Strategy Logic, Usage, Output Format.",
    sectionId: "skill-structure",
    keywords: ["skill.md", "format", "frontmatter", "yaml"],
  },
  {
    id: "cmc-api",
    question: "What CMC data do strategies use?",
    answer:
      "CoinMarketCap Data API: quotes/latest, Fear & Greed, global metrics. Optional MCP for pre-computed RSI/MACD when MCP_ENABLED=1.",
    sectionId: "cmc-integration",
    keywords: ["cmc", "api", "mcp", "data"],
  },
  {
    id: "export",
    question: "How do I export skills for submission?",
    answer: "npm run export:skills — creates examples/cmc-strategy-skills.zip with all three skills.",
    sectionId: "export-skills",
    keywords: ["export", "zip", "marketplace"],
  },
  {
    id: "attest",
    question: "How do I attest on BSC testnet?",
    answer:
      "Set AGENT_PRIVATE_KEY in .env, fund wallet via BSC testnet faucet, run npm run attest. TWAK-compatible self-custody signing.",
    sectionId: "attestations",
    keywords: ["attest", "bsc", "twak", "on-chain"],
  },
  {
    id: "mock-vs-live",
    question: "Mock vs live CMC data?",
    answer:
      "Set CMC_API_KEY and CMC_USE_MOCK=0 for live data. Free tier may synthesize OHLCV from spot + % changes (cmc-synthetic-ohlcv).",
    sectionId: "cmc-integration",
    keywords: ["mock", "live", "api key"],
  },
  {
    id: "verify",
    question: "How do I verify submission readiness?",
    answer: "npm run verify — checks backtests, skill zips, replay HTML, and flags missing on-chain proofs.",
    sectionId: "verify",
    keywords: ["verify", "checklist", "submission"],
  },
  {
    id: "agent-prompt",
    question: "What prompt should I paste into Cursor?",
    answer:
      'Example: "Run the CMC momentum strategy backtest on BTC using skills/cmc-strategy-momentum/SKILL.md. Show Sharpe and trades."',
    sectionId: "for-agents",
    keywords: ["cursor", "prompt", "paste", "windsurf"],
  },
  {
    id: "simulation",
    question: "Is this live trading?",
    answer: "No. Simulation only. Backtests produce JSON metrics and equity curves — no orders hit exchanges.",
    sectionId: "overview",
    keywords: ["live", "trading", "simulation"],
  },
];

export const SKILL_MD_EXAMPLE = `---
name: cmc-strategy-momentum
version: 1.0.0
description: Momentum strategy using CMC RSI, MACD, and Fear & Greed
author: CMC Strategy Forge
tags: [crypto, momentum, backtesting, coinmarketcap]
---

# CMC Momentum Strategy Skill

## Description
Backtestable momentum strategy using CoinMarketCap pre-computed signals.

## Prerequisites
- CMC_API_KEY or CMC MCP connected
- Node.js 18+

## Usage
Ask your agent: "Run momentum backtest on BTC for the last 90 days"`;
