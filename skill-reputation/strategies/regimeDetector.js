import { BaseStrategy } from "./baseStrategy.js";
import { sma, atr } from "./lib/indicators.js";

export default class RegimeDetector extends BaseStrategy {
  constructor() {
    super({
      name: "Regime Detector",
      version: "1.1.0",
      riskProfile: "conservative",
      params: {
        maxDrawdownPct: 15,
        positionSizePct: 25,
        smaPeriod: 50,
        atrPeriod: 14,
        atrRangeThreshold: 0.015,
        smaSlopeThreshold: 0.0005,
      },
    });
  }

  detectRegime(bars, i, sma50, atr14) {
    const price = bars[i].close;
    const smaVal = sma50[i];
    const atrVal = atr14[i];
    if (smaVal == null || atrVal == null) return "unknown";

    const slope =
      sma50[i] != null && sma50[i - 5] != null && sma50[i - 5] !== 0
        ? (sma50[i] - sma50[i - 5]) / sma50[i - 5]
        : 0;
    const atrRatio = price > 0 ? atrVal / price : 0;

    if (atrRatio < this.params.atrRangeThreshold && Math.abs(slope) < this.params.smaSlopeThreshold) {
      return "ranging";
    }
    if (price > smaVal && slope > this.params.smaSlopeThreshold) return "trending-up";
    if (price < smaVal && slope < -this.params.smaSlopeThreshold) return "trending-down";
    return "neutral";
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const closes = bars.map((b) => b.close);
    const sma50 = sma(closes, this.params.smaPeriod);
    const atr14 = atr(bars, this.params.atrPeriod);
    const signals = [];

    for (let i = this.params.smaPeriod; i < bars.length; i++) {
      const regime = this.detectRegime(bars, i, sma50, atr14);
      let sig = "hold";
      let confidence = 0.5;

      if (regime === "trending-up") {
        sig = "buy";
        confidence = 0.75;
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
        "TRENDING UP: price > 50-SMA and positive SMA slope → long.",
        "TRENDING DOWN: price < 50-SMA and negative SMA slope → exit/flat.",
        "RANGING: ATR/price below threshold and flat SMA → no position.",
        "Trend-following: capture big moves, sit out chop.",
        "Simulation only — no live trading.",
      ],
      cmcEndpointsUsed: ["/v2/cryptocurrency/ohlcv/historical"],
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["SMA50", "ATR14"],
        data_frequency: "daily",
        min_history_days: 90,
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
