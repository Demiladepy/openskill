# CMC Strategy Forge

**CoinMarketCap-powered quant strategy skills for BNB Hackathon Track 2.**

GitHub: [Demiladepy/openskill](https://github.com/Demiladepy/openskill) · This folder is the entire application.

---

## Why this exists

Track 2 asks for **Strategy Skills** — quant research that agents can discover, install, and run. The hard part isn’t writing a strategy class. It’s the **full loop**:

1. Pull **real market signals** (not hand-waved mock data)
2. **Backtest** with honest metrics (Sharpe, drawdown, trades)
3. Ship in **CMC’s official skills format**
4. Optionally **attest** a fingerprint on-chain

CMC Strategy Forge does all four in one repo. A judge clones it, runs `npm run strategy:all`, and gets nine backtest JSON files, a replay HTML report, and exportable skill zips.

**Simulation only.** No live trading. No “trust me bro” equity curves.

---

## What you get

| Output | Location | Command |
|--------|----------|---------|
| Backtest JSON (9 pairs) | `backtest_results/*.json` | `npm run strategy:all` |
| Strategy specs | `backtest_results/*_spec.json` | (same run) |
| PnL replay HTML | `replay/output/replay_report.html` | `npm run replay` |
| CMC skill zips | `examples/cmc-strategy-*.zip` | `npm run export:skills` |
| Submission checklist | stdout | `npm run verify` |

---

## Quick start

### 1. Install

```bash
cd skill-reputation
npm install
cp .env.example .env
```

### 2. Configure `.env`

| Variable | Required? | What it does |
|----------|-----------|--------------|
| `CMC_API_KEY` | **Yes** (for live data) | [CoinMarketCap Pro](https://pro.coinmarketcap.com/account) API key |
| `CMC_USE_MOCK=0` | Yes | Forces live CMC (not mock) |
| `MCP_ENABLED=1` | Optional | CMC MCP pre-computed RSI/MACD for demos |
| `AGENT_PRIVATE_KEY` | Optional | BSC testnet wallet for attestation |
| `ATTEST_MODE=live` | With key | Posts attestation tx to BSC testnet |
| `BNB_RPC_URL` | Optional | Defaults to public BSC testnet RPC |

**Free-tier note:** Historical OHLCV endpoints may return 403. The client **synthesizes daily bars** from live CMC spot + % changes (`cmc-synthetic-ohlcv`). Spot quotes, Fear & Greed, and global metrics are real.

### 3. Run the pipeline

```bash
npm run strategy:all    # Backtest momentum, sentiment, regime × BTC, ETH, BNB
npm run replay          # HTML equity report
npm run export:skills   # CMC marketplace zips
npm run verify          # Pre-flight checklist
```

**Minimal judge demo (3 commands):**

```bash
npm run strategy:all && npm run replay && npm run attest
```

### 4. On-chain (optional, for sponsor prizes)

```bash
# Fund a throwaway BSC testnet wallet first:
# https://testnet.bnbchain.org/faucet-smart

npm run attest
cd bnbagent && python register_agent.py --live
```

Paste BscScan links into this README before submission.

---

## Strategies

Each strategy lives in `strategies/` and documents its CMC data sources in the file header.

### 1. Momentum Merger (`momentumMerger.js`)

**Thesis:** Momentum + sentiment extremes predict short-term reversals and continuations.

**CMC inputs:**
- `/v1/cryptocurrency/quotes/latest` — % changes, volume
- `/v3/fear-and-greed/historical` — per-bar sentiment
- `/v1/global-metrics/quotes/latest` — macro context
- MCP `get_crypto_technical_analysis` — RSI, MACD when enabled

**Logic:** Score-based entries from RSI, MACD crossover, Fear & Greed, 7d return. Trailing stop 5%. Position size 8% of equity.

```bash
npm run strategy:momentum
```

### 2. Sentiment Divergence (`sentimentDivergence.js`)

**Thesis:** When price weakens short-term but longer-term structure holds, sentiment often lags — mean-reversion opportunity.

**CMC inputs:** Quotes % changes, Fear & Greed history, global volume / market-cap ratio.

**Logic:** 7d vs 30d return divergence + fear capitulation (F&G drop). Exits on momentum recovery.

```bash
npm run strategy:sentiment
```

### 3. Regime Detector (`regimeDetector.js`)

**Thesis:** Macro regime (risk-on vs risk-off) from BTC dominance and trend filters which strategies work.

**CMC inputs:** Global metrics, derivatives funding/OI, OHLCV for SMA/ATR.

**Logic:** Classify TRENDING UP / DOWN / VOLATILE. Enter long in risk-on trending regimes only.

```bash
npm run strategy:regime
```

---

## Backtest results

**Window:** `2026-03-01` → `2026-06-01` · **Assets:** BTC, ETH, BNB  
**Data:** Live CMC (`cmc-mixed` — real quotes/sentiment; synthetic OHLCV on free tier)

| Strategy | Asset | Sharpe | Max DD | Trades | Win % | Return |
|----------|-------|--------|--------|--------|-------|--------|
| Momentum | BTC | -1.75 | 0.82% | 4 | 50% | -0.13% |
| Momentum | ETH | -25.94 | 1.24% | 4 | 25% | -1.19% |
| Momentum | BNB | -10.05 | 0.38% | 3 | 33% | -0.29% |
| Sentiment | BTC | -0.71 | 1.18% | 1 | 0% | -0.15% |
| Sentiment | ETH | -6.90 | 1.20% | 1 | 0% | -1.14% |
| Sentiment | BNB | -8.30 | 0.49% | 1 | 0% | -0.48% |
| Regime | BTC | **2.17** | 1.09% | 1 | 100% | **0.55%** |
| Regime | ETH | 0 | 0% | 0 | — | 0% |
| Regime | BNB | 0 | 0% | 0 | — | 0% |

*Reproduce:* `npm run strategy:all` with `CMC_API_KEY` set. Mock mode: `CMC_USE_MOCK=1 npm run strategy:all`.

**Honest read:** Regime/BTC is the strongest live result. Momentum and sentiment need tuning — that’s real quant work, not a bug. The pipeline produces trades, metrics, and auditable JSON either way.

---

## CMC integration

### Data API (`src/cmcDataClient.js`)

- Quotes, global metrics, Fear & Greed (latest + historical)
- Rate-limited (2s between calls for free tier)
- Per-endpoint fallback — one failure doesn’t kill the run

### Signal layer (`src/cmcSignals.js`)

Aggregates CMC pre-computed signals so strategies don’t reimplement indicators from scratch:

```bash
npm run cmc:signals -- BTC
```

### MCP (`src/cmcMcpClient.js`)

When `MCP_ENABLED=1`:

```bash
npm run cmc:mcp
```

Point-in-time RSI/MACD from [CMC MCP](https://mcp.coinmarketcap.com/mcp). Backtests use REST + Fear & Greed history for bar-by-bar simulation.

### CMC Skills format (`skills/`)

Three installable skills matching [official CMC skills structure](https://github.com/coinmarketcap-official/skills-for-ai-agents-by-CoinMarketCap):

```bash
npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills
```

| Skill folder | Strategy |
|--------------|----------|
| `skills/cmc-strategy-momentum/` | Momentum Merger |
| `skills/cmc-strategy-sentiment/` | Sentiment Divergence |
| `skills/cmc-strategy-regime/` | Regime Detector |

Meta-skill: `skill/SKILL.md` (suite overview).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CoinMarketCap Data API  (+ optional MCP)                   │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
                   src/cmcSignals.js
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   momentumMerger   sentimentDivergence   regimeDetector
         │                  │                  │
         └──────────────────┼──────────────────┘
                            ▼
                  src/backtestEngine.js
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    backtest_results/*.json      skill/scripts/attest.js
              │                           │
              ▼                           ▼
    replay/pnlReplay.js            BSC testnet tx
              │
              ▼
    marketplace/exporter.js → examples/*.zip
```

**Key files:**

| File | Role |
|------|------|
| `strategies/index.js` | CLI: `strategy:all`, writes results |
| `src/backtestEngine.js` | Simulation, Sharpe, drawdown, slippage |
| `src/lib/buildStrategySpec.js` | PositionSight-style `*_spec.json` |
| `marketplace/exporter.js` | CMC skill zip export |
| `scripts/hackathonVerify.js` | One-command submission check |
| `scripts/checkSecrets.js` | Pre-push secret scan |

---

## On-chain attestation (TWAK-compatible)

We use **self-custody local signing** on BSC testnet (viem). Structured for drop-in `@trustwallet/agent-kit` when it ships.

1. Create a **throwaway** Trust Wallet or MetaMask wallet on **BSC Testnet**
2. Fund via [testnet faucet](https://testnet.bnbchain.org/faucet-smart)
3. Set `AGENT_PRIVATE_KEY` in `.env`
4. Run `npm run attest`

Each `backtest_results/*.json` includes an `attestation` block: `digest`, `signature`, `txHash`, `explorer`.

**ERC-8004 agent registration:**

```bash
cd bnbagent
pip install -r requirements.txt
python register_agent.py --live
```

---

## Sponsor integration status

| Sponsor | Integration | Judge can verify |
|---------|-------------|------------------|
| **CoinMarketCap** | Data API + MCP + Skills format | `npm run strategy:all`, `skills/`, `npm run cmc:signals` |
| **Trust Wallet** | TWAK-compatible attestation signing | BscScan tx from `npm run attest` |
| **BNB Chain** | BSC testnet txs + ERC-8004 | `register_agent.py --live` tx |

---

## npm scripts

| Command | What it does |
|---------|--------------|
| `npm run strategy:all` | All 3 strategies × BTC, ETH, BNB |
| `npm run strategy:momentum` | Single strategy run |
| `npm run strategy:sentiment` | Single strategy run |
| `npm run strategy:regime` | Single strategy run |
| `npm run replay` | Generate `replay_report.html` |
| `npm run attest` | BSC testnet attestation |
| `npm run export:skills` | Export CMC skill zips |
| `npm run verify` | Submission checklist |
| `npm run check:secrets` | Scan for leaked keys before push |
| `npm run cmc:signals` | Live CMC signal snapshot |
| `npm run cmc:mcp` | MCP tools CLI demo |

---

## Optional extras (not required for judges)

| Feature | Path |
|---------|------|
| CLI skill | `cli-skill/` |
| Demo UI (Vercel) | `demos/demo-ui/` |
| BNB Agent server | `bnbagent/agent_server.py` |
| Legacy Hardhat contract | `legacy/contracts/` (archived) |

---

## DoraHacks submission

**Deadline:** June 21, 2026 · 12:00 UTC

1. Repo: `https://github.com/Demiladepy/openskill`
2. Demo video (~3 min) — script in [DEMO.md](./DEMO.md)
3. Artifacts: `skills/`, `examples/cmc-strategy-skills.zip`, `replay/output/replay_report.html`
4. Run `npm run verify` and paste checklist
5. BscScan attestation + ERC-8004 tx links

Full checklist → [SUBMISSION.md](./SUBMISSION.md)

---

## FAQ

**Why is OHLCV “synthetic” on my API key?**  
CMC free tier blocks `/v2/cryptocurrency/ohlcv/historical`. We anchor bars to live spot + official % changes. Paid tier gets full candles.

**Why did `CMC_USE_MOCK=1` still run mock with my key?**  
That env var forces mock. Set `CMC_USE_MOCK=0` or unset it.

**Helius / Alchemy?**  
Not needed. CMC for data; public BSC RPC for txs. Helius is Solana-only.

**Is the demo UI required?**  
No. Judges run CLI. UI is optional (`demos/demo-ui`).

**Will export work on Vercel?**  
Export API needs the full monorepo filesystem — use CLI `npm run export:skills` locally for submission zips.

---

## Security

- **Never commit** `.env` — it’s gitignored
- Run `npm run check:secrets` before every push
- Use a **dedicated testnet wallet** only — never your main wallet private key

---

## License

Hackathon submission. See repo root for license terms.
