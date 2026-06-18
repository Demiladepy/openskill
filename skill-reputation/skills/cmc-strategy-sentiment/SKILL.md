---
name: cmc-strategy-sentiment
version: 1.0.0
description: Sentiment divergence strategy using CMC Fear & Greed, percent changes, and volume ratios
author: CMC Strategy Forge
tags: [crypto, sentiment, trading-strategy, backtesting, coinmarketcap, quant]
bnb:
  chain: bsc-testnet
  erc8004_registry: "0x8004A818BFB912233c491871b3d84c89A494BD9e"
  simulation_only: true
  bap692_layers: [identity, commerce, payments-roadmap, memory-roadmap]
mcp:
  forge: npm run mcp:forge
  cmc: https://mcp.coinmarketcap.com/mcp
  twak: twak serve
  bnb_chain: npx @bnb-chain/mcp@latest
---

# CMC Sentiment Divergence Strategy Skill

## Description

A backtestable sentiment strategy that detects divergence between CoinMarketCap price momentum (7d/30d percent changes) and market sentiment (Fear & Greed, volume/market-cap ratio). Simulation and research only — not live trading.

## Prerequisites

- CoinMarketCap MCP server connected: `https://mcp.coinmarketcap.com/mcp` (optional, `MCP_ENABLED=1`)
- OR CMC API key set as `CMC_API_KEY` environment variable
- Node.js 18+

## CMC Data Sources

- `/v1/cryptocurrency/quotes/latest` — pre-computed 7d/30d percent changes, volume
- `/v3/fear-and-greed/latest` + historical — sentiment divergence vs price
- `/v1/global-metrics/quotes/latest` — volume / total market cap ratio
- `/v2/cryptocurrency/ohlcv/historical` — daily bars for rolling returns
- CMC MCP: `get_global_metrics_latest` (when MCP enabled)

## Strategy Logic

1. Fetch CMC quotes and Fear & Greed history for the target asset
2. Compute divergence signals:
   - **Price divergence:** 7d return &lt; -9.5% while 30d return &gt; 0%
   - **Sentiment divergence:** Fear & Greed &lt; 45 with positive 30d trend but negative 7d
   - **Volume capitulation:** elevated volume/market-cap ratio during fear (&lt; 40)
3. Entry conditions:
   - **BUY:** price divergence OR sentiment divergence OR volume capitulation
   - **SELL:** 7d return &gt; 15%, OR 30d return &lt; -15%, OR Fear & Greed &gt; 75
4. Position sizing: 10% equity per signal
5. Risk cap: 18% max drawdown parameter

## Usage

Ask your agent:

- "Run the sentiment strategy backtest on ETH for Q1 2026"
- "Is there sentiment divergence on BNB right now?"
- "Export sentiment strategy results with Fear & Greed overlay"

## Output Format

```json
{
  "strategy": "sentiment",
  "asset": "ETH",
  "period": "2026-03-01 to 2026-06-01",
  "metrics": {
    "total_return_pct": 8.2,
    "sharpe_ratio": 1.1,
    "max_drawdown_pct": 12.0,
    "win_rate_pct": 58,
    "trades": 6,
    "profit_factor": 1.6
  },
  "signals": [],
  "equity_curve": []
}
```

## Backtest Execution

```bash
cd skill-reputation
npm run strategy -- sentiment -- --from 2026-03-01 --to 2026-06-01 --symbol ETH
```
