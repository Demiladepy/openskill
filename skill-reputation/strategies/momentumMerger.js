import { BaseStrategy } from "./baseStrategy.js";
import { rsi, macd } from "./lib/indicators.js";

export default class MomentumMerger extends BaseStrategy {
  constructor() {
    super({
      name: "Momentum Merger",
      version: "1.0.0",
      riskProfile: "moderate",
      params: { maxDrawdownPct: 20, positionSizePct: 100, rsiPeriod: 14 },
    });
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const closes = bars.map((b) => b.close);
    const r = rsi(closes, this.params.rsiPeriod);
    const { line, signal } = macd(closes);
    const fear = marketData.fearGreed?.value ?? 50;

    const signals = [];
    for (let i = 1; i < bars.length; i++) {
      const bullishCross = line[i - 1] <= signal[i - 1] && line[i] > signal[i];
      const bearishCross = line[i - 1] >= signal[i - 1] && line[i] < signal[i];
      let sig = "hold";
      let confidence = 0.5;

      if (r[i] != null && r[i] < 30 && bullishCross && fear < 25) {
        sig = "buy";
        confidence = 0.82;
      } else if (r[i] != null && (r[i] > 70 || bearishCross)) {
        sig = "sell";
        confidence = 0.78;
      }

      signals.push({ timestamp: bars[i].timestamp, signal: sig, confidence, strength: confidence });
    }
    return signals;
  }

  backtest(historicalData, startDate, endDate) {
    this.validateParams();
    const bars = filterRange(historicalData.ohlcv || [], startDate, endDate);
    const bundle = { ...historicalData, ohlcv: bars };
    const signals = this.generateSignals(bundle);
    return {
      signals,
      rulesPlainEnglish: [
        "Entry: RSI(14) < 30 AND MACD bullish crossover AND CMC Fear & Greed < 25 (Extreme Fear).",
        "Exit: RSI(14) > 70 OR MACD bearish crossover.",
        "Position sizing: 100% capital on signal, full exit on opposite signal.",
        "Simulation only — no live trading (Track 2).",
      ],
      cmcEndpointsUsed: [
        "/v1/cryptocurrency/ohlcv/historical",
        "/v3/fear-and-greed/historical",
      ],
    };
  }

  exportSpec() {
    const spec = {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["RSI", "MACD", "FearGreed"],
        data_frequency: "daily",
        min_history_days: 90,
      },
      entry_rules: ["RSI < 30", "MACD bullish cross", "Fear & Greed < 25"],
      exit_rules: ["RSI > 70", "MACD bearish cross"],
      rules_plain_english: this.lastBacktest?.rulesPlainEnglish || [
        "Entry: RSI(14) < 30 AND MACD bullish crossover AND CMC Fear & Greed < 25.",
        "Exit: RSI(14) > 70 OR MACD bearish crossover.",
      ],
    };
    return spec;
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
