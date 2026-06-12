/**
 * CMC Data Sources Used:
 * - /v1/global-metrics/quotes/latest (BTC dominance, total market cap)
 * - /v1/cryptocurrency/quotes/latest (asset percent changes)
 * - /v2/cryptocurrency/ohlcv/historical (price series for trend confirmation)
 * - CMC MCP: get_global_metrics_latest (when MCP_ENABLED=1)
 */
import { BaseStrategy } from "./baseStrategy.js";
import { rollingReturn } from "./lib/indicators.js";

export default class RegimeDetector extends BaseStrategy {
  constructor() {
    super({
      name: "Regime Detector",
      version: "1.2.0",
      riskProfile: "conservative",
      params: {
        maxDrawdownPct: 15,
        positionSizePct: 25,
        btcDominanceTrendThreshold: 0.3,
        marketCapChangeThreshold: 0.5,
      },
    });
  }

  detectRegime(marketData, barIndex, ret7, ret30) {
    const cmc = marketData.cmcSignals || {};
    const market = cmc.market || marketData.globalMetrics || {};
    const btcDom = market.btc_dominance ?? market.btcDominance ?? 50;
    const mcapChange = market.marketCapChange24h ?? market.market_cap_change_24h ?? 0;

    const r7 = ret7[barIndex] ?? cmc.price?.change_7d ?? 0;
    const r30 = ret30[barIndex] ?? cmc.price?.change_30d ?? 0;

    // Ranging: flat market cap + low asset momentum
    if (Math.abs(mcapChange) < this.params.marketCapChangeThreshold && Math.abs(r7) < 3) {
      return "ranging";
    }
    // Trending up: positive 7d/30d returns + risk-on (BTC dominance falling = alt season)
    if (r7 > 2 && r30 > 0 && btcDom < 55) return "trending-up";
    // Trending down: negative momentum + rising BTC dominance (flight to safety)
    if (r7 < -2 && r30 < 0 && btcDom > 55) {
      return "trending-down";
    }
    if (r7 > 0 && r30 > 0) return "trending-up";
    if (r7 < 0 && r30 < 0) return "trending-down";
    return "neutral";
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const closes = bars.map((b) => b.close);
    const ret7 = rollingReturn(closes, 7);
    const ret30 = rollingReturn(closes, 30);
    const signals = [];

    for (let i = 30; i < bars.length; i++) {
      const regime = this.detectRegime(marketData, i, ret7, ret30);
      let sig = "hold";
      let confidence = 0.5;

      if (regime === "trending-up") {
        sig = "buy";
        confidence = 0.76;
      } else if (regime === "trending-down") {
        sig = "sell";
        confidence = 0.72;
      }

      signals.push({
        timestamp: bars[i].timestamp,
        signal: sig,
        confidence,
        strength: confidence,
        regime,
        cmc_btc_dominance: marketData.cmcSignals?.market?.btc_dominance,
        cmc_change_7d: ret7[i],
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
        "Uses CMC global metrics: BTC dominance + total market cap change for regime detection.",
        "TRENDING UP: positive 7d/30d CMC percent changes + BTC dominance < 55%.",
        "TRENDING DOWN: negative momentum + elevated BTC dominance (risk-off).",
        "RANGING: flat market cap change and low asset momentum → no position.",
        "Simulation only — no live trading.",
      ],
      cmcEndpointsUsed: [
        "/v1/global-metrics/quotes/latest",
        "/v1/cryptocurrency/quotes/latest",
        "/v2/cryptocurrency/ohlcv/historical",
      ],
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["BTCDominance", "TotalMarketCap", "PercentChange7d", "PercentChange30d"],
        data_frequency: "daily",
        min_history_days: 90,
        mcp_tools: ["get_global_metrics_latest"],
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
