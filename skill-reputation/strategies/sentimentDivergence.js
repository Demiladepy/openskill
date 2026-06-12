import { BaseStrategy } from "./baseStrategy.js";
import { rollingReturn } from "./lib/indicators.js";

export default class SentimentDivergence extends BaseStrategy {
  constructor() {
    super({
      name: "Sentiment Divergence",
      version: "1.1.0",
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
      },
    });
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const closes = bars.map((b) => b.close);
    const ret7 = rollingReturn(closes, this.params.lookbackShort);
    const ret30 = rollingReturn(closes, this.params.lookbackLong);
    const spot = marketData.spot || {};

    const signals = [];
    for (let i = this.params.lookbackLong; i < bars.length; i++) {
      const r7 = ret7[i] ?? spot.percentChange7d ?? 0;
      const r30 = ret30[i] ?? spot.percentChange30d ?? 0;

      // Primary: mean-reversion divergence (7d weak, 30d still positive)
      const divergenceBuy = r7 < this.params.buyShortThreshold && r30 > this.params.buyLongMin;

      let sig = "hold";
      let confidence = 0.55;

      if (divergenceBuy) {
        sig = "buy";
        confidence = 0.78;
      } else if (r7 > this.params.sellShortThreshold || r30 < this.params.sellLongThreshold) {
        sig = "sell";
        confidence = 0.74;
      }

      signals.push({
        timestamp: bars[i].timestamp,
        signal: sig,
        confidence,
        strength: confidence,
        ret7: r7,
        ret30: r30,
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
        "Mean-reversion thesis: short-term weakness vs positive longer-term trend.",
        "Entry (buy): 7-day return < -9.5% AND 30-day return > 0%.",
        "Exit (sell): 7-day return > +15% OR 30-day return < -15%.",
        "Uses CMC quotes (7d/30d % change) and OHLCV-derived returns.",
        "Simulation only — no live trading.",
      ],
      cmcEndpointsUsed: [
        "/v1/cryptocurrency/quotes/latest",
        "/v2/cryptocurrency/ohlcv/historical",
      ],
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["PriceMomentum7d", "PriceMomentum30d"],
        data_frequency: "daily",
        min_history_days: 60,
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
