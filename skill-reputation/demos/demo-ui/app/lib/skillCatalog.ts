export type SkillCatalogEntry = {
  id: string;
  folder: string;
  title: string;
  tagline: string;
  description: string;
  signals: string[];
  tags: string[];
  accent: "momentum" | "sentiment" | "regime";
  highlight?: string;
  bestSharpe?: { asset: string; value: string };
};

export const SKILL_CATALOG: SkillCatalogEntry[] = [
  {
    id: "cmc-strategy-momentum",
    folder: "skills/cmc-strategy-momentum/",
    title: "Momentum Merger",
    tagline: "RSI · MACD · Fear & Greed",
    description:
      "Score-based entries when CMC pre-computed momentum aligns — composite buy score with trailing-stop exits.",
    signals: ["RSI", "MACD histogram", "Fear & Greed", "7d / 24h % change"],
    tags: ["momentum", "backtesting", "quant"],
    accent: "momentum",
  },
  {
    id: "cmc-strategy-sentiment",
    folder: "skills/cmc-strategy-sentiment/",
    title: "Sentiment Divergence",
    tagline: "Capitulation · volume / mcap",
    description:
      "Finds divergence between price momentum and crowd sentiment — useful when fear extremes disagree with trend.",
    signals: ["Fear & Greed history", "7d vs 30d returns", "Volume / market-cap ratio"],
    tags: ["sentiment", "backtesting", "quant"],
    accent: "sentiment",
  },
  {
    id: "cmc-strategy-regime",
    folder: "skills/cmc-strategy-regime/",
    title: "Regime Detector",
    tagline: "BTC dominance · SMA · ATR",
    description:
      "Only sizes up in risk-on trending regimes — conservative entries driven by global CMC metrics.",
    signals: ["BTC dominance", "Global market cap", "SMA trend", "ATR volatility"],
    tags: ["regime", "backtesting", "quant"],
    accent: "regime",
    highlight: "Best live backtest in submission window",
    bestSharpe: { asset: "BTC", value: "2.17" },
  },
];
