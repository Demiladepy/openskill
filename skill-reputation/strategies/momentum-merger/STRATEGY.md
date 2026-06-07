---
name: Momentum Merger
version: 1.0.0
description: RSI + MACD + CoinMarketCap Fear & Greed momentum strategy (simulation only).
metadata:
  cmc:
    track: strategy-skills
    indicators: [RSI, MACD, FearGreed]
    data_frequency: daily
    risk_profile: moderate
---

# Momentum Merger

**CoinMarketCap Strategy Skill** — Track 2 backtestable spec only.

## Entry
- RSI(14) < 30
- MACD bullish crossover
- CMC Fear & Greed Index < 25 (Extreme Fear)

## Exit
- RSI(14) > 70 OR MACD bearish crossover

## Data source
CoinMarketCap Data API only. No live trading.
