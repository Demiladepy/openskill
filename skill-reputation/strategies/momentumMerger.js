import { BaseStrategy } from "./baseStrategy.js";
import { rsi, macd } from "./lib/indicators.js";

export default class MomentumMerger extends BaseStrategy {
  constructor() {
    super({
      name: "Momentum Merger",
      version: "1.1.0",
      riskProfile: "moderate",
      params: {
        maxDrawdownPct: 20,
        positionSizePct: 2,
        trailingStopPct: 5,
        rsiPeriod: 14,
        rsiBuy: 35,
        rsiSell: 65,
        fearBuy: 30,
        fearSell: 70,
      },
    });
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const closes = bars.map((b) => b.close);
    const r = rsi(closes, this.params.rsiPeriod);
    const { line, signal } = macd(closes, 12, 26, 9);
    const fear = marketData.fearGreed?.value ?? 50;

    const signals = [];
    for (let i = 1; i < bars.length; i++) {
      const bullishCross = line[i - 1] != null && signal[i - 1] != null && line[i - 1] <= signal[i - 1] && line[i] > signal[i];
      const bearishCross = line[i - 1] != null && signal[i - 1] != null && line[i - 1] >= signal[i - 1] && line[i] < signal[i];
      let sig = "hold";
      let confidence = 0.5;

      const rsiBuy = r[i] != null && r[i] < this.params.rsiBuy;
      const rsiSell = r[i] != null && r[i] > this.params.rsiSell;
      const macdFearBuy = bullishCross && fear < this.params.fearBuy;
      const macdFearSell = bearishCross && fear > this.params.fearSell;

      if (rsiBuy || macdFearBuy) {
        sig = "buy";
        confidence = rsiBuy && macdFearBuy ? 0.88 : 0.72;
      } else if (rsiSell || macdFearSell || bearishCross) {
        sig = "sell";
        confidence = rsiSell || macdFearSell ? 0.78 : 0.65;
      }

      signals.push({ timestamp: bars[i].timestamp, signal: sig, confidence, strength: confidence });
    }
    return signals;
  }

  backtest(historicalData, startDate, endDate) {
    this.validateParams();
    const signals = filterSignalsByDate(this.generateSignals(historicalData), startDate, endDate);
    return {
      signals,
      rulesPlainEnglish: [
        "Entry (buy): RSI(14) < 35 OR (MACD bullish crossover AND CMC Fear & Greed < 30).",
        "Exit (sell): RSI(14) > 65 OR (MACD bearish crossover AND Fear & Greed > 70) OR MACD bearish cross.",
        "Position sizing: 2% of equity per trade.",
        "Trailing stop: 5% from high water mark (simulation engine).",
        "Simulation only — no live trading (Track 2).",
      ],
      cmcEndpointsUsed: [
        "/v2/cryptocurrency/ohlcv/historical",
        "/v3/fear-and-greed/latest",
        "/v1/cryptocurrency/quotes/latest",
      ],
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["RSI", "MACD", "FearGreed"],
        data_frequency: "daily",
        min_history_days: 90,
      },
      entry_rules: ["RSI < 35", "MACD bullish cross + Fear < 30"],
      exit_rules: ["RSI > 65", "MACD bearish cross", "5% trailing stop"],
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

function filterSignalsByDate(signals, start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return signals.filter((sig) => {
    const t = new Date(sig.timestamp).getTime();
    return t >= s && t <= e;
  });
}
