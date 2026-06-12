---
name: cmc-strategy-momentum
version: 1.0.0
description: Momentum-based crypto trading strategy using CMC RSI, MACD, and Fear & Greed signals
author: CMC Strategy Forge
tags: [crypto, momentum, trading-strategy, backtesting, coinmarketcap, quant]
---

# CMC Momentum Strategy Skill

## Description

A backtestable momentum trading strategy that consumes CoinMarketCap pre-computed indicators (RSI, MACD, Fear & Greed) to generate entry/exit signals for crypto assets. Designed for simulation and strategy research — not live trading.

## Prerequisites

- CoinMarketCap MCP server connected: `https://mcp.coinmarketcap.com/mcp` (set `MCP_ENABLED=1`)
- OR CMC API key set as `CMC_API_KEY` environment variable
- Node.js 18+

## CMC Data Sources

- `/v1/cryptocurrency/quotes/latest` — price, volume, pre-computed percent changes
- `/v3/fear-and-greed/latest` + historical — market sentiment index
- `/v1/global-metrics/quotes/latest` — BTC dominance, total market cap
- `/v2/cryptocurrency/ohlcv/historical` — daily candles for backtest bars
- CMC MCP: `get_crypto_technical_analysis` — pre-computed RSI, MACD when available

## Strategy Logic

1. Fetch current and historical data for the target asset via CMC REST + optional MCP technicals
2. Build momentum signals from CMC pre-computed data:
   - RSI from CMC MCP technicals (fallback: 7d percent change from quotes)
   - MACD histogram from CMC MCP (fallback: 24h vs 7d percent change crossover)
   - Fear & Greed index from CMC sentiment endpoint (historical per bar)
3. Entry conditions:
   - **BUY:** CMC RSI &lt; 35 OR (MACD bullish AND Fear & Greed &lt; 30)
   - **SELL:** CMC RSI &gt; 65 OR (MACD bearish AND Fear & Greed &gt; 70)
4. Position sizing: 2% equity risk per trade
5. Exit: 5% trailing stop from high water mark

## Usage

Ask your agent:

- "Run the momentum strategy backtest on BTC for the last 90 days"
- "What are the current momentum signals for ETH?"
- "Generate a momentum strategy spec for BNB"

## Output Format

```json
{
  "strategy": "momentum",
  "asset": "BTC",
  "period": "2026-03-01 to 2026-06-01",
  "metrics": {
    "total_return_pct": 12.4,
    "sharpe_ratio": 1.82,
    "max_drawdown_pct": 8.3,
    "win_rate_pct": 64,
    "trades": 18,
    "profit_factor": 2.1
  },
  "signals": [],
  "equity_curve": []
}
```

## Backtest Execution

```bash
cd skill-reputation
npm run strategy -- momentum -- --from 2026-03-01 --to 2026-06-01 --symbol BTC
```
