# CMC Strategy Forge

> CoinMarketCap-powered quant strategy skills for BNB Hackathon Track 2.
> Backtests crypto strategies using CMC pre-computed signals. Ships installable CMC skills. Attests results on BNB Chain.

*GitHub repo: [Demiladepy/openskill](https://github.com/Demiladepy/openskill) — all code is in this directory.*

**Simulation only** — no live trading.

## Quick Start

```bash
cd skill-reputation
npm install
cp .env.example .env
# Set CMC_API_KEY and AGENT_PRIVATE_KEY (BSC testnet throwaway wallet)

npm run strategy:all    # 1. Run all strategies
npm run replay          # 2. PnL replay report
npm run attest          # 3. Attest on BSC testnet (when AGENT_PRIVATE_KEY set)
npm run export:skills   # 4. Export CMC-compatible skill zips
npm run verify          # 5. Submission checklist
```

Three commands for a minimal judge demo: `strategy:all` → `replay` → `attest`.

## Strategies

### 1. Momentum Merger

Combines CMC pre-computed momentum (7d/24h percent changes or MCP RSI/MACD) with historical Fear & Greed. Buys when RSI is oversold or MACD turns bullish during extreme fear; exits on overbought RSI, bearish MACD, or elevated greed. Uses quotes, Fear & Greed, global metrics, and optional MCP technicals.

### 2. Sentiment Divergence

Detects divergence between short-term price weakness (7d return) and longer-term structure (30d return), amplified by CMC Fear & Greed and volume/market-cap ratio spikes during capitulation. Uses quotes percent changes, Fear & Greed history, and global volume metrics.

### 3. Regime Detector

Classifies market regime from CMC global metrics (BTC dominance, total market cap change) plus asset 7d/30d percent changes. Enters on trending-up regimes (risk-on); exits on trending-down (flight to safety). Uses global metrics, quotes, and OHLCV for confirmation.

## Backtest Results

Mock demo window `2026-03-01 → 2026-06-01` (set `CMC_API_KEY` for live CMC data):

| Strategy | Asset | Sharpe | Max DD | Trades | Win Rate | Return |
|----------|-------|--------|--------|--------|----------|--------|
| Momentum | BTC | 0.00 | 0.06% | 1 | 100% | 0.47% |
| Momentum | ETH | 0.00 | 0.06% | 1 | 100% | 0.47% |
| Momentum | BNB | 0.00 | 0.06% | 1 | 100% | 0.47% |
| Sentiment | BTC | 0.00 | 0.30% | 1 | 100% | 2.52% |
| Sentiment | ETH | 0.00 | 0.30% | 1 | 100% | 2.52% |
| Sentiment | BNB | 0.00 | 0.30% | 1 | 100% | 2.52% |
| Regime | BTC | 0.00 | 2.83% | 1 | 100% | 7.62% |
| Regime | ETH | 0.00 | 2.83% | 1 | 100% | 7.62% |
| Regime | BNB | 0.00 | 2.83% | 1 | 100% | 7.62% |

Reproduce: `CMC_USE_MOCK=1 npm run strategy:all` or live with `CMC_API_KEY`. Full JSON in `backtest_results/`.

## CMC Integration

- **CMC Data API** — quotes, OHLCV, Fear & Greed, global metrics (`src/cmcDataClient.js`, `src/cmcSignals.js`)
- **CMC MCP** — pre-computed RSI/MACD when `MCP_ENABLED=1` (`src/cmcMcpClient.js`)
- **CMC Skills format** — installable skills in `skills/cmc-strategy-*/SKILL.md`

```bash
# CMC Strategy Forge skills (openskill repo)
npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills
```

## On-Chain Attestation

TWAK-compatible **self-custody signing** on BSC testnet (`skill/scripts/attest.js`):

1. Set `AGENT_PRIVATE_KEY` in `skill/.env`
2. Fund wallet via [BSC testnet faucet](https://testnet.bnbchain.org/faucet-smart)
3. `npm run attest` → prints tx hash

After live attestation, verify at `https://testnet.bscscan.com/tx/<your-tx-hash>`.

Each backtest JSON includes an `attestation` block (digest, signature, txHash, explorer).

## Sponsor Stack Integration

| Sponsor | Integration | Status |
|---------|-------------|--------|
| CoinMarketCap | Data API + MCP + Skills format | Live |
| Trust Wallet | TWAK-compatible attestation signing | Live (BSC testnet) |
| BNB Chain | ERC-8004 agent + BSC attestation | Live (BSC testnet) |

## Architecture

```
CMC Data API / MCP
       ↓
  cmcSignals.js  ──→  3 strategies  ──→  backtestEngine.js
       ↓                                        ↓
 backtest_results/*.json  ←──────────  attest.js (BSC tx)
       ↓
  replay/ + skills/export
```

## Additional Features

These are supported but **not part of the 3-minute judge demo**:

| Feature | Path | Command |
|---------|------|---------|
| CLI skill | `cli-skill/` | `cd cli-skill && npm run run -- --strategy momentum` |
| PnL replay HTML | `replay/` | `npm run replay` |
| Skill export | `marketplace/exporter.js` | `npm run export:skills` |
| BNB Agent SDK | `bnbagent/` | `python bnbagent/register_agent.py --live` |
| Demo UI | `demos/demo-ui/` | Optional Next.js shell |
| TWAK setup | `skill/scripts/twakSetup.js` | `npm run twak:setup` |
| Legacy Hardhat contract | `legacy/contracts/` | Out of scope for Track 2 |

## Environment

Copy `.env.example` → `.env` in this directory (`skill-reputation/`):

| Variable | Purpose |
|----------|---------|
| `CMC_API_KEY` | CoinMarketCap Data API |
| `MCP_ENABLED=1` | CMC MCP pre-computed technicals |
| `AGENT_PRIVATE_KEY` | BSC testnet attestation + agent |
| `ATTEST_MODE=live` | Default when key is set |

## DoraHacks submission

1. GitHub repo URL
2. Demo video: `strategy:all` → `replay` → `attest` → `export:skills` (under 3 min)
3. `skills/cmc-strategy-*/SKILL.md` + `examples/cmc-strategy-skills.zip`
4. `npm run verify` checklist output
