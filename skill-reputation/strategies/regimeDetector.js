/**
 * CMC Data Sources Used:
 * - /v1/global-metrics/quotes/latest (BTC dominance, total market cap)
 * - /v1/cryptocurrency/quotes/latest (asset percent changes)
 * - /v2/cryptocurrency/ohlcv/historical (SMA/ATR regime)
 * - /v1/derivatives/open-interest/latest (funding, OI — when available)
 * - CMC MCP: get_global_metrics_latest (when MCP_ENABLED=1)
 */
import { BaseStrategy } from "./baseStrategy.js";
import { rollingReturn, sma, atr } from "./lib/indicators.js";
import { fearGreedForBar } from "../src/cmcSignals.js";

export default class RegimeDetector extends BaseStrategy {
  constructor() {
    super({
      name: "Regime Detector",
      version: "1.3.0",
      riskProfile: "conservative",
      params: {
        maxDrawdownPct: 15,
        positionSizePct: 20,
        minBuyConfidence: 0.62,
        smaFast: 20,
        smaSlow: 50,
        atrPeriod: 14,
        volThresholdPct: 2.5,
        btcDominanceRiskOff: 54,
        btcDominanceRiskOn: 52,
      },
    });
  }

  detectRegime(marketData, barIndex, bars, closes, ret7, ret30, smaFast, smaSlow, atrSeries) {
    const cmc = marketData.cmcSignals || {};
    const market = cmc.market || marketData.globalMetrics || {};
    const deriv = marketData.derivatives || {};
    const btcDom = market.btc_dominance ?? market.btcDominance ?? 50;
    const funding = deriv.fundingRate ?? 0;
    const oiChange = deriv.openInterestChange24h ?? 0;

    const price = closes[barIndex];
    const fast = smaFast[barIndex];
    const slow = smaSlow[barIndex];
    const atrVal = atrSeries[barIndex];
    const r7 = ret7[barIndex] ?? cmc.price?.change_7d ?? 0;
    const r30 = ret30[barIndex] ?? cmc.price?.change_30d ?? 0;
    const fear = fearGreedForBar(marketData, bars[barIndex].timestamp);

    const volPct = atrVal && price ? (atrVal / price) * 100 : 0;

    if (volPct > this.params.volThresholdPct && Math.abs(r7) < 2) {
      return "volatile";
    }
    if (fast != null && slow != null && price > fast && fast > slow && r7 > 1 && r30 > 0) {
      if (btcDom < this.params.btcDominanceRiskOn || funding > 0 || oiChange > 0.01) {
        return "trending-up";
      }
    }
    if (fast != null && slow != null && price < fast && fast < slow && r7 < -1 && r30 < 0) {
      if (btcDom > this.params.btcDominanceRiskOff || fear > 60) {
        return "trending-down";
      }
    }
    if (Math.abs(r7) < 2 && Math.abs(r30) < 3) return "ranging";
    if (r7 > 0 && r30 > 0) return "trending-up";
    if (r7 < 0 && r30 < 0) return "trending-down";
    return "neutral";
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const closes = bars.map((b) => b.close);
    const ret7 = rollingReturn(closes, 7);
    const ret30 = rollingReturn(closes, 30);
    const smaFast = sma(closes, this.params.smaFast);
    const smaSlow = sma(closes, this.params.smaSlow);
    const atrSeries = atr(bars, this.params.atrPeriod);
    const signals = [];

    const start = Math.max(this.params.smaSlow, this.params.atrPeriod) + 1;
    for (let i = start; i < bars.length; i++) {
      const regime = this.detectRegime(
        marketData,
        i,
        bars,
        closes,
        ret7,
        ret30,
        smaFast,
        smaSlow,
        atrSeries
      );
      let sig = "hold";
      let confidence = 0.5;

      if (regime === "trending-up") {
        sig = "buy";
        confidence = 0.78;
      } else if (regime === "trending-down") {
        sig = "sell";
        confidence = 0.75;
      } else if (regime === "volatile") {
        sig = "sell";
        confidence = 0.65;
      }

      signals.push({
        timestamp: bars[i].timestamp,
        signal: sig,
        confidence,
        strength: confidence,
        regime,
        cmc_btc_dominance: marketData.cmcSignals?.market?.btc_dominance,
        cmc_funding_rate: marketData.derivatives?.fundingRate,
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
        "Regime = SMA(20/50) trend + ATR volatility + CMC BTC dominance + derivatives funding/OI.",
        "TRENDING UP: price above SMA stack, positive momentum, risk-on dominance/funding.",
        "TRENDING DOWN / VOLATILE: flight to safety or elevated ATR with flat momentum.",
        "Simulation only — no live trading.",
      ],
      cmcEndpointsUsed: [
        "/v1/global-metrics/quotes/latest",
        "/v1/cryptocurrency/quotes/latest",
        "/v2/cryptocurrency/ohlcv/historical",
        "/v1/derivatives/open-interest/latest",
      ],
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["BTCDominance", "FundingRate", "OpenInterest", "SMA", "ATR"],
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
