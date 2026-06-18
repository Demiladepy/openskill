export const BRAND = {
  name: "Forge Skills",
  tagline: "Quant strategy skills for AI agents",
  product: "Powered by CoinMarketCap · BNB Hackathon Track 2",
};

export const OVERVIEW_COPY = {
  title: "Forge Skills Overview",
  lead:
    "Forge Skills are installable quant research packages for AI agents. Each skill teaches your agent how to backtest a crypto strategy using live CoinMarketCap data, export results in CMC's official format, and optionally attest a fingerprint on BSC testnet.",
  problem:
    "Developers no longer wire RSI by hand. They paste a prompt, point an agent at a SKILL.md file, and let the pipeline run. Forge Skills is built for that workflow — search, copy, paste, execute.",
  simulation:
    "Every strategy runs in simulation mode only. Backtests produce JSON metrics and equity curves. No live orders are sent to any exchange.",
};

export const SPEC_COPY = {
  intro:
    "Forge Skills follow the same progressive-disclosure model as Agent Skills and CoinMarketCap's official skills repository. Your agent loads only what it needs, when it needs it — keeping context small and responses fast.",
  code:
    "Code refers to the CLI pipeline in skill-reputation/ (npm run strategy:all, npm run export:skills). The agent invokes these commands; it does not reimplement strategy logic.",
  resources:
    "Resources are artifacts produced by the pipeline: backtest_results/*.json, replay/output/replay_report.html, and examples/cmc-strategy-skills.zip. They load only when the user asks for proof or submission files.",
};

export const STRUCTURE_COPY = {
  intro:
    "Each skill is a self-contained folder. The SKILL.md file is the contract between your agent and the strategy — frontmatter for discovery, markdown body for execution instructions.",
};

export const PRACTICES_COPY = {
  creators: [
    "Write descriptions an agent can route on: include asset (BTC/ETH/BNB), data source (CMC), and outcome (backtest).",
    "List every CoinMarketCap endpoint under CMC Data Sources — judges verify sponsor integration.",
    "Include copy-paste Usage prompts so pipe-coders never guess the right phrasing.",
    "Always state simulation-only. Never imply live trading.",
  ],
  agents: [
    "Load Level 1 metadata at startup; read full SKILL.md only when the user triggers a strategy.",
    "Run commands from skill-reputation/, not the repo root.",
    "Return file paths (backtest_results/*.json) in every response so results are auditable.",
    "Run npm run verify before telling the user the submission is ready.",
  ],
};
