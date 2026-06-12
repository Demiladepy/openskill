---
name: cmc-quant-strategy-pack
version: 1.0.0
description: Run backtestable quant strategies using CMC data (momentum, sentiment divergence, regime detection)
cmc:
  min_version: 2.0
  commands:
    - name: run
      description: Run a strategy backtest
      usage: cmc skill run cmc-quant-strategy-pack --strategy <name> --from <date> --to <date> [--output json|csv]
      options:
        - --strategy: momentum, sentiment, regime
        - --from: YYYY-MM-DD
        - --to: YYYY-MM-DD
        - --output: json (default) or csv
      example: cmc skill run cmc-quant-strategy-pack --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json
    - name: metrics
      description: Compute quant metrics on a backtest result file
      usage: cmc skill run cmc-quant-strategy-pack metrics --file backtest.json
requires:
  env:
    - CMC_API_KEY
  node: ">=18"
simulation_only: true
live_trading: false
---

# CMC Quant Strategy Pack

Professional **CLI-first Skill** for CoinMarketCap Agent Hub. Run three simulation-only quant strategies backed by CMC Data API (or mock mode for offline demos).

## Strategies

| Key | Name | CMC data |
|-----|------|----------|
| `momentum` | Momentum Merger | OHLCV, Fear & Greed |
| `sentiment` | Sentiment Divergence | OHLCV, social metrics |
| `regime` | Regime Detector | OHLCV, funding, open interest |

## Quant utilities

- **Sharpe ratio** — annualized from trade returns
- **Max drawdown** — peak-to-trough on equity curve
- **Volatility scaling** — position size = risk budget / (vol × price)

## Environment

Set `CMC_API_KEY` for live data, or `CMC_USE_MOCK=1` for offline backtests.

## Agent usage

After install, agents should call:

```bash
cmc skill run cmc-quant-strategy-pack run --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json
```

Parse the JSON `metrics` block for Sharpe, drawdown, win rate, and trade count.
