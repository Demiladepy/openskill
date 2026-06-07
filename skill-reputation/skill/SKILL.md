---
name: cmc-strategy-forge
description: Generate backtestable CoinMarketCap trading strategy specs from CMC Data API market data. Track 2 — simulation only, no live trading.
version: 2.0.0
metadata:
  cmc:
    track: strategy-skills
    marketplace: coinmarketcap-agent-hub
    requires:
      env:
        - CMC_API_KEY
      bins:
        - node
    simulation_only: true
    live_trading: false
---

# CMC Strategy Forge

**CoinMarketCap Strategy Skill** for BNB Hackathon **Track 2 (Strategy Skills)**.

This skill generates **backtestable strategy specs** powered exclusively by the **CoinMarketCap Data API**. Judges run scripts locally to produce JSON specs and replay reports — **no live trading agent** and **no execution layer**.

## What this skill does

1. Pull CMC market data (spot, social, derivatives, Fear & Greed)
2. Run one of three strategy templates (momentum, sentiment, regime)
3. Output backtest metrics + `replay_data.json` + optional `.cmcskill` package

## Quick commands

From repo root (`skill-reputation/`):

```bash
cp skill/.env.example skill/.env   # add CMC_API_KEY
npm install
npm run registry                   # scan strategies + strategyKey fingerprints
npm run strategy -- momentum -- --from 2026-06-01 --to 2026-06-21
npm run backtest
npm run replay
npm run export -- momentum
npm run validate
```

## Strategy fingerprint (version control)

Each strategy manifest is hashed into a **strategyKey** (same algorithm as the original skillKey digest system). This fingerprint ties a spec to exact strategy bytes for marketplace submission.

## Track 2 compliance

- Data source: **CoinMarketCap Data API only**
- Output: **backtestable spec** (JSON + SKILL.md)
- No live trading, no wallet integration, no on-chain requirement

## Security

- Never commit `CMC_API_KEY`
- Set `CMC_USE_MOCK=1` for offline demo (mock data warning included in output)
