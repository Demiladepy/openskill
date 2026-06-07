---
name: Regime Detector
version: 1.0.0
description: Derivatives-based regime detection using CoinMarketCap funding and open interest.
metadata:
  cmc:
    track: strategy-skills
    indicators: [FundingRate, OpenInterest]
    data_frequency: daily
    risk_profile: conservative
---

# Regime Detector

Detects risk-on, risk-off, and neutral regimes from CMC derivatives data. Includes 5% daily loss protection. Simulation only.
