/**
 * CMC Data Sources Used:
 * - /v1/cryptocurrency/quotes/latest (pre-computed percent changes, volume)
 * - /v3/fear-and-greed/latest + historical (market sentiment)
 * - /v1/global-metrics/quotes/latest (BTC dominance, total market cap)
 * - CMC MCP: get_crypto_technical_analysis (pre-computed RSI, MACD when MCP_ENABLED=1)
 */
import { BaseStrategy } from "./baseStrategy.js";
import { rollingReturn, rsi, macd } from "./lib/indicators.js";
import { fearGreedForBar } from "../src/cmcSignals.js";

export default class MomentumMerger extends BaseStrategy {
  constructor() {
    super({
      name: "Momentum Merger",
      version: "1.3.0",
      riskProfile: "moderate",
      params: {
        maxDrawdownPct: 20,
        positionSizePct: 8,
        trailingStopPct: 5,
        minBuyConfidence: 0.6,
        minBuyScore: 3,
        minSellScore: 3,
        rsiBuy: 40,
        rsiSell: 60,
        fearBuy: 40,
        fearSell: 65,
      },
    });
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const closes = bars.map((b) => b.close);
    const ret7 = rollingReturn(closes, 7);
    const rsiSeries = rsi(closes, 14);
    const { line: macdLine, signal: macdSignal } = macd(closes);
    const cmc = marketData.cmcSignals || {};
    const mcpTech = cmc.technicals || marketData.cmcTechnicals || {};
    const priceSignals = cmc.price || {};

    const signals = [];
    for (let i = 30; i < bars.length; i++) {
      const fear = fearGreedForBar(marketData, bars[i].timestamp);
      const change7d = ret7[i] ?? priceSignals.change_7d ?? 0;

      const barRsi = mcpTech.rsi ?? rsiSeries[i];
      const macdHist =
        mcpTech.macd_histogram ??
        (macdLine[i] != null && macdSignal[i] != null ? macdLine[i] - macdSignal[i] : null);

      let buyScore = 0;
      let sellScore = 0;

      if (barRsi != null && barRsi < this.params.rsiBuy) buyScore += 2;
      if (barRsi != null && barRsi > this.params.rsiSell) sellScore += 2;
      if (macdHist != null && macdHist > 0) buyScore += 1;
      if (macdHist != null && macdHist < 0) sellScore += 1;
      if (fear < this.params.fearBuy) buyScore += 2;
      if (fear > this.params.fearSell) sellScore += 2;
      if (change7d < -4) buyScore += 1;
      if (change7d > 6) sellScore += 1;

      // MACD crossover boost
      if (i > 0 && macdLine[i] != null && macdSignal[i] != null) {
        const prevCross = (macdLine[i - 1] ?? 0) - (macdSignal[i - 1] ?? 0);
        const currCross = macdLine[i] - macdSignal[i];
        if (prevCross <= 0 && currCross > 0) buyScore += 2;
        if (prevCross >= 0 && currCross < 0) sellScore += 2;
      }

      let sig = "hold";
      let confidence = 0.5;

      if (buyScore >= this.params.minBuyScore && buyScore > sellScore) {
        sig = "buy";
        confidence = Math.min(0.95, 0.5 + buyScore * 0.08);
      } else if (sellScore >= this.params.minSellScore && sellScore > buyScore) {
        sig = "sell";
        confidence = Math.min(0.9, 0.5 + sellScore * 0.08);
      }

      signals.push({
        timestamp: bars[i].timestamp,
        signal: sig,
        confidence,
        strength: confidence,
        buy_score: buyScore,
        sell_score: sellScore,
        cmc_rsi: barRsi,
        cmc_macd_histogram: macdHist,
        cmc_fear_greed: fear,
        cmc_change_7d: change7d,
      });
    }
    return signals;
  }

  backtest(historicalData, startDate, endDate) {
    this.validateParams();
    const signals = filterSignalsByDate(this.generateSignals(historicalData), startDate, endDate);
    const endpoints = [
      "/v1/cryptocurrency/quotes/latest",
      "/v3/fear-and-greed/latest",
      "/v1/global-metrics/quotes/latest",
    ];
    if (historicalData.cmcSignals?.technicals) {
      endpoints.push("CMC MCP: get_crypto_technical_analysis");
    }
    return {
      signals,
      rulesPlainEnglish: [
        "Score-based momentum: RSI, MACD histogram/crossover, CMC Fear & Greed, 7d return.",
        `Entry (buy): composite buy score ≥ ${this.params.minBuyScore} (MCP RSI/MACD when enabled).`,
        `Exit (sell): composite sell score ≥ ${this.params.minSellScore}.`,
        `Position sizing: ${this.params.positionSizePct}% of equity. Trailing stop: ${this.params.trailingStopPct}%. Simulation only.`,
      ],
      cmcEndpointsUsed: endpoints,
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["RSI", "MACD", "FearGreed", "PercentChange7d"],
        data_frequency: "daily",
        min_history_days: 90,
        mcp_tools: ["get_crypto_technical_analysis", "get_crypto_quotes_latest"],
      },
      entry_rules: [`Buy score ≥ ${this.params.minBuyScore}`, "CMC Fear & Greed < 40 adds weight"],
      exit_rules: [`Sell score ≥ ${this.params.minSellScore}`, `${this.params.trailingStopPct}% trailing stop`],
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
