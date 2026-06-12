/**
 * CMC Data Sources Used:
 * - /v1/cryptocurrency/quotes/latest (pre-computed 7d/30d percent changes, volume)
 * - /v3/fear-and-greed/latest (market sentiment divergence vs price)
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
      version: "1.2.0",
      riskProfile: "moderate",
      params: {
        maxDrawdownPct: 18,
        positionSizePct: 10,
        lookbackShort: 7,
        lookbackLong: 30,
        buyShortThreshold: -9.5,
        buyLongMin: 0,
        sellShortThreshold: 15,
        sellLongThreshold: -15,
        fearGreedBuyMax: 45,
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

      // Sentiment divergence: price weak short-term, structure still positive long-term
      const priceDivergenceBuy =
        r7 < this.params.buyShortThreshold && r30 > this.params.buyLongMin;
      // CMC Fear & Greed divergence: extreme fear while price still above long-term trend
      const sentimentDivergenceBuy = fear < this.params.fearGreedBuyMax && r30 > 0 && r7 < 0;
      // Volume spike during fear (capitulation)
      const volumeCapitulation = volRatio != null && volRatio > 0.001 && fear < 40;

      let sig = "hold";
      let confidence = 0.55;

      if (priceDivergenceBuy || sentimentDivergenceBuy || volumeCapitulation) {
        sig = "buy";
        confidence = priceDivergenceBuy ? 0.8 : 0.72;
      } else if (r7 > this.params.sellShortThreshold || r30 < this.params.sellLongThreshold || fear > 75) {
        sig = "sell";
        confidence = 0.74;
      }

      signals.push({
        timestamp: bars[i].timestamp,
        signal: sig,
        confidence,
        strength: confidence,
        cmc_change_7d: r7,
        cmc_change_30d: r30,
        cmc_fear_greed: fear,
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
        "Uses CMC pre-computed percent_change_7d / percent_change_30d from quotes API.",
        "Sentiment divergence: Fear & Greed < 45 while 30d return remains positive.",
        "Entry: 7d return < -9.5% AND 30d return > 0%, OR fear/price divergence.",
        "Exit: 7d return > +15%, 30d return < -15%, or Fear & Greed > 75.",
        "Simulation only — no live trading.",
      ],
      cmcEndpointsUsed: [
        "/v1/cryptocurrency/quotes/latest",
        "/v3/fear-and-greed/latest",
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
