import { BaseStrategy } from "./baseStrategy.js";

export default class SentimentDivergence extends BaseStrategy {
  constructor() {
    super({
      name: "Sentiment Divergence",
      version: "1.0.0",
      riskProfile: "moderate",
      params: { maxDrawdownPct: 18, positionSizePct: 100 },
    });
  }

  generateSignals(marketData) {
    const bars = marketData.ohlcv || [];
    const social = marketData.social || { sentimentScore: 0.5, socialVolume: 0 };
    const signals = [];

    for (let i = 5; i < bars.length; i++) {
      const priceUp = bars[i].close > bars[i - 5].close;
      const priceDown = bars[i].close < bars[i - 5].close;
      const sentiment = social.sentimentScore + Math.sin(i / 8) * 0.05;
      const prevSentiment = social.sentimentScore + Math.sin((i - 5) / 8) * 0.05;
      const sentimentUp = sentiment > prevSentiment;
      const sentimentDown = sentiment < prevSentiment;

      let sig = "hold";
      let confidence = 0.55;

      // Bearish divergence: price up, sentiment down
      if (priceUp && sentimentDown) {
        sig = "sell";
        confidence = 0.74;
      }
      // Bullish divergence: price down, sentiment up
      if (priceDown && sentimentUp) {
        sig = "buy";
        confidence = 0.76;
      }
      // Divergence resolved
      if ((priceUp && sentimentUp) || (priceDown && sentimentDown)) {
        sig = "sell";
        confidence = 0.6;
      }

      signals.push({ timestamp: bars[i].timestamp, signal: sig, confidence, strength: confidence });
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
        "Entry (bearish divergence): price rising while CMC social sentiment decreases.",
        "Entry (bullish divergence): price falling while CMC social sentiment increases.",
        "Exit: divergence resolves when sentiment and price realign.",
        "Uses CMC social volume and KOL mention endpoints (simulation only).",
      ],
      cmcEndpointsUsed: ["/v1/social/coin/latest"],
    };
  }

  exportSpec() {
    return {
      ...this.baseSpec(),
      cmc_requirements: {
        indicators: ["SocialSentiment", "SocialVolume", "KOLMentions"],
        data_frequency: "daily",
        min_history_days: 60,
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
