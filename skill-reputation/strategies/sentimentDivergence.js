/**
 * CMC Data Sources Used:
 * - /v1/cryptocurrency/quotes/latest (pre-computed 7d/30d percent changes, volume)
 * - /v3/fear-and-greed/historical (per-bar sentiment divergence vs price)
 * - /v1/global-metrics/quotes/latest (volume / market cap ratio)
 * - CMC MCP: get_global_metrics_latest (when MCP_ENABLED=1)
 */
import { BaseStrategy } from "./baseStrategy.js";
import { rollingReturn } from "./lib/indicators.js";
import { fearGreedForBar } from "../src/cmcSignals.js";

export default class SentimentDivergence extends BaseStrategy {
  constructor() {
    super({
      name: "Sentiment Divergence",
      version: "1.3.0",
      riskProfile: "moderate",
      params: {
        maxDrawdownPct: 18,
        positionSizePct: 10,
        minBuyConfidence: 0.58,
        lookbackShort: 7,
        lookbackLong: 30,
        buyShortThreshold: -3,
        buyLongMin: -5,
        sellShortThreshold: 10,
        sellLongThreshold: -10,
        fearGreedBuyMax: 50,
        fearGreedSellMin: 72,
      },
    });
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const closes = bars.map((b) => b.close);
    const ret7 = rollingReturn(closes, this.params.lookbackShort);
    const ret30 = rollingReturn(closes, this.params.lookbackLong);
    const cmc = marketData.cmcSignals || {};
    const priceSignals = cmc.price || {};
    const volRatio = cmc.volume?.volume_market_cap_ratio;

    const signals = [];
    for (let i = this.params.lookbackLong; i < bars.length; i++) {
      const r7 = ret7[i] ?? priceSignals.change_7d ?? 0;
      const r30 = ret30[i] ?? priceSignals.change_30d ?? 0;
      const fear = fearGreedForBar(marketData, bars[i].timestamp);
      const fearPrev = fearGreedForBar(marketData, bars[i - this.params.lookbackShort].timestamp);
      const fearDelta = fear - fearPrev;

      const priceDivergenceBuy =
        r7 < this.params.buyShortThreshold && r30 > this.params.buyLongMin;
      const sentimentDivergenceBuy =
        fear < this.params.fearGreedBuyMax && r30 > 0 && r7 < 0;
      const fearCapitulation = fear < 35 && fearDelta < -8;
      const volumeCapitulation = volRatio != null && volRatio > 0.0008 && fear < 42;
      const greedExhaustion = fear > this.params.fearGreedSellMin && r7 > 5;

      let sig = "hold";
      let confidence = 0.55;
      let buyScore = 0;
      if (priceDivergenceBuy) buyScore += 2;
      if (sentimentDivergenceBuy) buyScore += 2;
      if (fearCapitulation) buyScore += 1;
      if (volumeCapitulation) buyScore += 1;

      const sellTrigger =
        r7 > this.params.sellShortThreshold ||
        r30 < this.params.sellLongThreshold ||
        greedExhaustion;

      if (buyScore >= 1 && !sellTrigger) {
        sig = "buy";
        confidence = Math.min(0.92, 0.55 + buyScore * 0.12);
      } else if (sellTrigger) {
        sig = "sell";
        confidence = 0.74;
      }

      signals.push({
        timestamp: bars[i].timestamp,
        signal: sig,
        confidence,
        strength: confidence,
        buy_score: buyScore,
        cmc_change_7d: r7,
        cmc_change_30d: r30,
        cmc_fear_greed: fear,
        cmc_fear_greed_delta: fearDelta,
        cmc_volume_mc_ratio: volRatio,
      });
    }
    return signals;
  }

  backtest(historicalData, startDate, endDate) {
    this.validateParams();
    const signals = filterSignalsByDate(this.generateSignals(historicalData), startDate, endDate);
    return {
      signals,
      rulesPlainEnglish: [
        "Uses CMC Fear & Greed historical (per bar) + OHLCV rolling 7d/30d returns.",
        "Price divergence: weak 7d vs positive 30d structure.",
        "Sentiment divergence: extreme fear while long-term trend holds.",
        "Fear capitulation: Fear & Greed drops >8 pts in 7d during weakness.",
        "Simulation only — no live trading.",
      ],
      cmcEndpointsUsed: [
        "/v1/cryptocurrency/quotes/latest",
        "/v3/fear-and-greed/historical",
        "/v1/global-metrics/quotes/latest",
      ],
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["PercentChange7d", "PercentChange30d", "FearGreed", "VolumeMarketCapRatio"],
        data_frequency: "daily",
        min_history_days: 60,
        mcp_tools: ["get_global_metrics_latest", "get_crypto_quotes_latest"],
      },
    };
  }
}

function filterSignalsByDate(signals, start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return signals.filter((sig) => {
    const t = new Date(sig.timestamp).getTime();
    return t >= s && t <= e;
  });
}
