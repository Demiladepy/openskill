/**
 * CMC Data Sources Used:
 * - /v1/cryptocurrency/quotes/latest (pre-computed percent changes, volume)
 * - /v3/fear-and-greed/latest + historical (market sentiment)
 * - /v1/global-metrics/quotes/latest (BTC dominance, total market cap)
 * - CMC MCP: get_crypto_technical_analysis (pre-computed RSI, MACD when MCP_ENABLED=1)
 */
import { BaseStrategy } from "./baseStrategy.js";
import { rollingReturn } from "./lib/indicators.js";
import { fearGreedForBar } from "../src/cmcSignals.js";

export default class MomentumMerger extends BaseStrategy {
  constructor() {
    super({
      name: "Momentum Merger",
      version: "1.2.0",
      riskProfile: "moderate",
      params: {
        maxDrawdownPct: 20,
        positionSizePct: 2,
        trailingStopPct: 5,
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
    const ret7 = rollingReturn(closes, 7);
    const cmc = marketData.cmcSignals || {};
    const tech = cmc.technicals || marketData.cmcTechnicals || {};
    const mcpRsi = tech.rsi;
    const mcpMacdHist = tech.macd_histogram;
    const priceSignals = cmc.price || {};

    const signals = [];
    for (let i = 8; i < bars.length; i++) {
      const fear = fearGreedForBar(marketData, bars[i].timestamp);
      const change7d = ret7[i] ?? priceSignals.change_7d ?? 0;
      const change24h = priceSignals.change_24h ?? 0;

      let sig = "hold";
      let confidence = 0.5;

      // CMC MCP pre-computed RSI / MACD (primary when available)
      const rsiOversold = mcpRsi != null ? mcpRsi < this.params.rsiBuy : change7d < -5;
      const rsiOverbought = mcpRsi != null ? mcpRsi > this.params.rsiSell : change7d > 8;
      const macdBullish = mcpMacdHist != null ? mcpMacdHist > 0 : change24h > 0 && change7d < 0;
      const macdBearish = mcpMacdHist != null ? mcpMacdHist < 0 : change24h < 0;

      const fearBuy = fear < this.params.fearBuy;
      const fearSell = fear > this.params.fearSell;

      if (rsiOversold || (macdBullish && fearBuy)) {
        sig = "buy";
        confidence = rsiOversold && macdBullish ? 0.88 : 0.74;
      } else if (rsiOverbought || (macdBearish && fearSell) || macdBearish) {
        sig = "sell";
        confidence = 0.72;
      }

      signals.push({
        timestamp: bars[i].timestamp,
        signal: sig,
        confidence,
        strength: confidence,
        cmc_rsi: mcpRsi,
        cmc_macd_histogram: mcpMacdHist,
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
        "Uses CMC pre-computed RSI/MACD via MCP when MCP_ENABLED=1, else CMC quote momentum + Fear & Greed.",
        "Entry (buy): CMC RSI < 35 OR (MACD histogram positive AND Fear & Greed < 30).",
        "Exit (sell): CMC RSI > 65 OR MACD histogram negative OR Fear & Greed > 70.",
        "Position sizing: 2% of equity. Trailing stop: 5%. Simulation only.",
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
      entry_rules: ["CMC RSI < 35", "CMC MACD bullish + Fear < 30"],
      exit_rules: ["CMC RSI > 65", "CMC MACD bearish", "5% trailing stop"],
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
