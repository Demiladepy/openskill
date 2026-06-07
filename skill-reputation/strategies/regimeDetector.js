import { BaseStrategy } from "./baseStrategy.js";

export default class RegimeDetector extends BaseStrategy {
  constructor() {
    super({
      name: "Regime Detector",
      version: "1.0.0",
      riskProfile: "conservative",
      params: { maxDrawdownPct: 15, positionSizePct: 100, dailyLossLimitPct: 5 },
    });
  }

  detectRegime(derivatives) {
    const funding = derivatives?.fundingRate ?? 0;
    const oiChange = derivatives?.openInterestChange24h ?? 0;
    if (funding > 0 && oiChange > 0) return "risk-on";
    if (funding < 0 && oiChange < 0) return "risk-off";
    return "neutral";
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const derivatives = marketData.derivatives || {};
    const regime = this.detectRegime(derivatives);
    const signals = [];
    let dailyStart = bars[0]?.close ?? 0;
    let dayAnchor = 0;

    for (let i = 1; i < bars.length; i++) {
      if (i - dayAnchor >= 1) {
        dailyStart = bars[dayAnchor].close;
        dayAnchor = i;
      }
      const dailyLossPct = dailyStart > 0 ? ((bars[i].close - dailyStart) / dailyStart) * 100 : 0;

      let sig = "hold";
      let confidence = 0.5;

      if (dailyLossPct <= -this.params.dailyLossLimitPct) {
        sig = "sell";
        confidence = 0.9;
      } else if (regime === "risk-on" && bars[i].close > bars[i - 1].close) {
        sig = "buy";
        confidence = 0.7;
      } else if (regime === "risk-off" && bars[i].close < bars[i - 1].close) {
        sig = "buy";
        confidence = 0.65;
      } else if (regime === "neutral") {
        sig = "hold";
        confidence = 0.4;
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
    const bars = filterRange(historicalData.ohlcv || [], startDate, endDate);
    const signals = this.generateSignals({ ...historicalData, ohlcv: bars });
    return {
      signals,
      rulesPlainEnglish: [
        "Regime risk-on: positive funding + rising open interest → momentum buys.",
        "Regime risk-off: negative funding + falling OI → mean-reversion buys.",
        "Regime neutral: stay in cash (hold).",
        "Drawdown protection: liquidate if daily loss exceeds 5%.",
      ],
      cmcEndpointsUsed: ["/v1/derivatives/open-interest/latest"],
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["FundingRate", "OpenInterest"],
        data_frequency: "daily",
        min_history_days: 90,
      },
    };
  }
}

function filterRange(bars, start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return bars.filter((b) => {
    const t = new Date(b.timestamp).getTime();
    return t >= s && t <= e;
  });
}
