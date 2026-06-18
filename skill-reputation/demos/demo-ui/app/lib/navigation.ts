export type NavItem = {
  id: string;
  label: string;
  group?: string;
};

export const NAV: NavItem[] = [
  { id: "overview", label: "Overview", group: "Start" },
  { id: "quick-start", label: "Quick start", group: "Start" },
  { id: "strategies", label: "Strategies", group: "Skills" },
  { id: "backtest-results", label: "Backtest results", group: "Skills" },
  { id: "export-skills", label: "Export skills", group: "Marketplace" },
  { id: "attestations", label: "BSC attestations", group: "On-chain" },
  { id: "cmc-integration", label: "CMC integration", group: "Reference" },
  { id: "verify", label: "Verify submission", group: "Reference" },
];

export const GITHUB_URL = "https://github.com/Demiladepy/openskill";

export const BACKTEST_ROWS = [
  { strategy: "Momentum", asset: "BTC", sharpe: "-1.75", dd: "0.82%", trades: 4, win: "50%", ret: "-0.13%" },
  { strategy: "Momentum", asset: "ETH", sharpe: "-25.94", dd: "1.24%", trades: 4, win: "25%", ret: "-1.19%" },
  { strategy: "Momentum", asset: "BNB", sharpe: "-10.05", dd: "0.38%", trades: 3, win: "33%", ret: "-0.29%" },
  { strategy: "Sentiment", asset: "BTC", sharpe: "-0.71", dd: "1.18%", trades: 1, win: "0%", ret: "-0.15%" },
  { strategy: "Sentiment", asset: "ETH", sharpe: "-6.90", dd: "1.20%", trades: 1, win: "0%", ret: "-1.14%" },
  { strategy: "Sentiment", asset: "BNB", sharpe: "-8.30", dd: "0.49%", trades: 1, win: "0%", ret: "-0.48%" },
  { strategy: "Regime", asset: "BTC", sharpe: "2.17", dd: "1.09%", trades: 1, win: "100%", ret: "0.55%" },
  { strategy: "Regime", asset: "ETH", sharpe: "0", dd: "0%", trades: 0, win: "—", ret: "0%" },
  { strategy: "Regime", asset: "BNB", sharpe: "0", dd: "0%", trades: 0, win: "—", ret: "0%" },
];
