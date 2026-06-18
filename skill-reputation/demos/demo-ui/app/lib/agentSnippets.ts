export const AGENT_SNIPPETS = {
  installSkills: `npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills`,

  cloneAndRun: `git clone https://github.com/Demiladepy/openskill.git
cd openskill/skill-reputation
npm install
cp .env.example .env
# Add CMC_API_KEY to .env
npm run strategy:all`,

  envTemplate: `CMC_API_KEY=your_key_from_pro.coinmarketcap.com
CMC_USE_MOCK=0
MCP_ENABLED=0
ATTEST_MODE=live
AGENT_PRIVATE_KEY=your_bsc_testnet_private_key
BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/`,

  judgeDemo: `npm run strategy:all && npm run replay && npm run attest`,

  cursorContext: `@skill-reputation

You are using CMC Strategy Forge — CoinMarketCap quant strategy skills for BNB Hackathon Track 2.
Read skills/cmc-strategy-momentum/SKILL.md (or sentiment/regime).
Run backtests with: npm run strategy:all
Simulation only — no live trading.`,

  promptMomentum: `Run the CMC momentum strategy backtest on BTC for 2026-03-01 to 2026-06-01.
Use skill-reputation/skills/cmc-strategy-momentum/SKILL.md.
Show Sharpe, max drawdown, trade count, and path to backtest_results/momentum_BTC.json.`,

  promptSentiment: `Run the CMC sentiment divergence backtest on ETH using skills/cmc-strategy-sentiment/SKILL.md.
Use CMC Fear & Greed + 7d/30d return divergence. Report metrics from backtest_results/.`,

  promptRegime: `Run the regime detector strategy on BNB using skills/cmc-strategy-regime/SKILL.md.
Explain the regime classification and show backtest metrics.`,

  promptExport: `Export all three CMC strategy skills as zips for marketplace submission.
Run: npm run export:skills
Confirm examples/cmc-strategy-skills.zip exists.`,

  promptAttest: `Attest the momentum strategy backtest on BSC testnet.
Set AGENT_PRIVATE_KEY in .env, run npm run attest, return BscScan explorer URL.`,
};

export const AGENT_PROMPT_CARDS = [
  { title: "Install skills (agent / CLI)", key: "installSkills" as const },
  { title: "Clone & run pipeline", key: "cloneAndRun" as const },
  { title: ".env template", key: "envTemplate" as const },
  { title: "Cursor / Windsurf context", key: "cursorContext" as const },
  { title: "Prompt: momentum backtest", key: "promptMomentum" as const },
  { title: "Prompt: sentiment backtest", key: "promptSentiment" as const },
  { title: "Prompt: regime backtest", key: "promptRegime" as const },
  { title: "Prompt: export skills", key: "promptExport" as const },
  { title: "Prompt: BSC attestation", key: "promptAttest" as const },
];
