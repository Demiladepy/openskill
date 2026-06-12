---
name: cmc-strategy-regime
version: 1.0.0
description: Market regime detection using CMC BTC dominance, global market cap, and asset percent changes
author: CMC Strategy Forge
tags: [crypto, regime, trading-strategy, backtesting, coinmarketcap, quant]
---

# CMC Regime Detector Strategy Skill

## Description

A backtestable regime strategy that classifies market conditions (trending-up, trending-down, ranging) using CoinMarketCap global metrics and asset percent changes. Conservative sizing for simulation research — not live trading.

## Prerequisites

- CoinMarketCap MCP server connected: `https://mcp.coinmarketcap.com/mcp` (optional, `MCP_ENABLED=1`)
- OR CMC API key set as `CMC_API_KEY` environment variable
- Node.js 18+

## CMC Data Sources

- `/v1/global-metrics/quotes/latest` — BTC dominance, total market cap, 24h market cap change
- `/v1/cryptocurrency/quotes/latest` — asset 7d/30d percent changes
- `/v2/cryptocurrency/ohlcv/historical` — price series for trend confirmation
- CMC MCP: `get_global_metrics_latest` (when MCP enabled)

## Strategy Logic

1. Fetch CMC global metrics and asset quotes for the target symbol
2. Detect regime per bar:
   - **Ranging:** flat total market cap change (&lt; 0.5%) and low 7d asset momentum (&lt; 3%)
   - **Trending-up:** positive 7d/30d returns + BTC dominance &lt; 55% (risk-on / alt season)
   - **Trending-down:** negative 7d/30d returns + BTC dominance &gt; 55% (flight to safety)
3. Entry conditions:
   - **BUY:** regime = trending-up
   - **SELL:** regime = trending-down
   - **HOLD:** ranging or neutral
4. Position sizing: 25% equity in trending regimes
5. Risk cap: 15% max drawdown parameter

## Usage

Ask your agent:

- "What market regime is BTC in according to CMC global metrics?"
- "Run the regime strategy backtest on BNB from March to June 2026"
- "Compare regime signals across BTC, ETH, and BNB"

## Output Format

```json
{
  "strategy": "regime",
  "asset": "BNB",
  "period": "2026-03-01 to 2026-06-01",
  "metrics": {
    "total_return_pct": 5.5,
    "sharpe_ratio": 0.9,
    "max_drawdown_pct": 10.0,
    "win_rate_pct": 55,
    "trades": 4,
    "profit_factor": 1.4
  },
  "signals": [],
  "equity_curve": []
}
```

## Backtest Execution

```bash
cd skill-reputation
npm run strategy -- regime -- --from 2026-03-01 --to 2026-06-01 --symbol BNB
```
