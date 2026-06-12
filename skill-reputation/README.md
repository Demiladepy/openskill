# CMC Strategy Forge

**CoinMarketCap-powered strategy skills for BNB Hackathon Track 2 (Strategy Skills).**

Generate **backtestable trading strategy specs** from **CoinMarketCap Data API** market data. This project is **simulation-only** — no live trading, no execution layer, no wallet integration.

> Data source: [CoinMarketCap Data API / Agent Hub](https://coinmarketcap.com/api/agent)

## Track 2 compliance

| Requirement | Status |
|-------------|--------|
| CMC Data API as data source | Yes |
| Backtestable spec output | Yes |
| No live trading | Yes |
| Strategy fingerprint (strategyKey) | Yes |
| Three example strategies | Yes |

## Directory structure

```text
skill-reputation/
├── skill/                 # CMC Skill manifest + scripts (SKILL.md)
├── strategies/            # Strategy templates + implementations
├── src/                   # CMC client, registry, backtest engine
├── backtest/              # Legacy MA crossover module
├── replay/                # PnL replay HTML generator
├── marketplace/           # .cmcskill export + validator
├── cli-skill/             # CMC CLI Skill (cmc skills install)
├── backtest_results/      # Generated specs + replay JSON
└── examples/              # Exported .cmcskill packages
```

## Quickstart

```bash
cd skill-reputation
cp skill/.env.example skill/.env
# Set CMC_API_KEY=... (or CMC_USE_MOCK=1 for offline demo)
npm install
npm run strategy -- momentum -- --from 2026-06-01 --to 2026-06-21
npm run replay
npm run export -- momentum
```

## Trust Wallet Agent Kit (TWAK) — 3-step flow

Track 2 eligibility uses Trust Wallet for autonomous attestation signing.

### 1) Install

```bash
npm install
npm install @trustwallet/agent-kit --save-optional -w cmc-strategy-validator-skill
# or globally: npm install -g @trustwallet/cli
```

### 2) Unlock (first-time setup)

```bash
npm run twak:setup
# saves ~/.twak/session.json — never commit this file
# set TWAK_UNLOCK_PASSPHRASE in skill/.env
```

### 3) Attest

```bash
# Simulation (default — no on-chain tx, for backtest/demo)
ATTEST_MODE=simulate npm run attest -w cmc-strategy-validator-skill -- --strategy momentum --score 85

# Live BSC testnet attestation
ATTEST_MODE=live npm run attest -w cmc-strategy-validator-skill -- --strategy momentum --score 85
```

TWAK session events are appended to `behavior-log.jsonl`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run registry` | Scan strategies, compute strategyKey fingerprints |
| `npm run strategy -- momentum` | Run backtest for a strategy |
| `npm run strategy:all` | Run all three strategies |
| `npm run backtest` | Alias: momentum backtest |
| `npm run replay` | Generate HTML PnL replay + submission manifest |
| `npm run export -- momentum` | Export `.cmcskill.zip` package |
| `npm run export:scan` | Export all strategies from latest scan |
| `npm run validate` | Validate package for submission |
| `npm run hackathon:verify` | Full submission checklist + manifest |
| `npm run twak:setup` | First-time TWAK wallet setup |
| `npm run cli-skill -- run --strategy momentum` | Run CMC CLI quant skill |
| `npm run agent:register` | Register ERC-8004 agent identity |
| `npm run agent:run` | Start ERC-8183 job server |
| `npm run marketplace:post` | Post a backtest job to your agent |
| `npm run marketplace:verify` | Verify job delivery |

## BNB AI Agent SDK (ERC-8004 + ERC-8183)

Turn the validator into an on-chain agent marketplace. See [`bnbagent/README.md`](bnbagent/README.md).

```bash
pip install -r bnbagent/requirements.txt
cp bnbagent/.env.agent.example bnbagent/.env.agent
npm run agent:register
npm run agent:run
npm run marketplace:post -- --strategy momentum --from 2026-06-01 --to 2026-06-21
```

## CMC CLI Skill

The [`cli-skill/`](cli-skill/) package is a **CoinMarketCap Agent Hub CLI Skill** with Sharpe, max drawdown, and volatility scaling utilities.

```bash
cd cli-skill && npm install
CMC_USE_MOCK=1 npm run run -- --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json
```

Install for other developers: `cmc skills install <repo-url>/skill-reputation/cli-skill`

## Three strategies

1. **Momentum Merger** — RSI + MACD + CMC Fear & Greed
2. **Sentiment Divergence** — social sentiment vs price
3. **Regime Detector** — funding + open interest regimes

## How to submit to Track 2 (DoraHacks)

1. Register on DoraHacks for BNB Hackathon Track 2
2. Push this repo to GitHub (`https://github.com/Demiladepy/openskill`)
3. Run all three strategies and export packages:
   ```bash
   npm run strategy:all
   npm run export -- momentum
   npm run export -- sentiment
   npm run export -- regime
   ```
4. Submit:
   - GitHub repo link
   - Demo video (2–3 min): run strategy → replay HTML → export `.cmcskill`
   - `.cmcskill` backtestable spec from `examples/`

**This is NOT a live trading agent.** Judges evaluate simulation output only.

## Environment variables

See `skill/.env.example`:

- `CMC_API_KEY` — required for live CoinMarketCap data
- `CMC_USE_MOCK=1` — offline demo with warning banner
- `CMC_MIN_REQUEST_INTERVAL_MS=1200` — rate limit pacing
- `ATTEST_MODE=simulate|live` — TWAK attestation mode (default simulate)
- `TWAK_UNLOCK_PASSPHRASE` — unlock phrase for `~/.twak/session.json`
- `BNB_RPC_URL` — BSC testnet RPC for live attestation
- `CMC_STRATEGY_VAULT_CONTRACT` — on-chain attestation contract address

## Demo video outline

1. `npm run strategy -- momentum -- --from 2026-06-01 --to 2026-06-21`
2. Open `replay/output/replay_report.html`
3. `npm run export -- momentum`
4. `npm run hackathon:verify` — generates `submission_manifest.json`
5. Explain CMC Data API data flow (spot, social, derivatives, Fear & Greed)
