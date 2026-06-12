---
name: cmc-strategy-forge
version: 1.0.0
description: Suite of backtestable quant strategies powered by CoinMarketCap data
author: CMC Strategy Forge
tags: [crypto, quant, backtesting, strategy, coinmarketcap]
---

# CMC Strategy Forge

A strategy skills platform for CoinMarketCap Agent Hub. Contains 3 backtestable quant strategies:

1. **cmc-strategy-momentum** — RSI + MACD + Fear & Greed momentum trading
2. **cmc-strategy-sentiment** — Social/market sentiment divergence detection
3. **cmc-strategy-regime** — Market regime detection (trending/ranging/volatile)

All strategies consume **CMC pre-computed signals** (REST + optional MCP). Simulation only — no live trading.

## Installation

Copy the skills folder to your agent's skills directory:

```bash
cp -r skills/cmc-strategy-* /path/to/your/skills/directory/
```

Or install via npx:

```bash
npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills
```

## Prerequisites

- `CMC_API_KEY` in `skill/.env` (or `CMC_USE_MOCK=1` for offline demo)
- Optional: `MCP_ENABLED=1` for CMC MCP pre-computed RSI/MACD
- Node.js 18+

## Quick commands

From repo root (`skill-reputation/`):

```bash
cp skill/.env.example skill/.env
npm install
npm run strategy:all
npm run replay
npm run attest
npm run export:skills
npm run verify
```

## Skill locations

| Skill | Path |
|-------|------|
| Momentum | `skills/cmc-strategy-momentum/SKILL.md` |
| Sentiment | `skills/cmc-strategy-sentiment/SKILL.md` |
| Regime | `skills/cmc-strategy-regime/SKILL.md` |

## Track 2 compliance

- Data source: **CoinMarketCap Data API + Agent Hub MCP**
- Output: **backtestable spec** (JSON + official CMC SKILL.md format)
- No live trading, no wallet integration
