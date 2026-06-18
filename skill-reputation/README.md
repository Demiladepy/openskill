# Forge Skills

**Quant strategy skills for AI agents — powered by CoinMarketCap, Trust Wallet, and BNB Chain.**

[![Track 2](https://img.shields.io/badge/BNB%20Hack-Strategy%20Skills-blue)](https://dorahacks.io/hackathon/bnbhack-twt-cmc/)
[![Docs](https://img.shields.io/badge/docs-Forge%20Skills-green)](./demos/demo-ui/)

> Installable research packages for AI agents. Pull live CMC data → backtest three strategies → export official skill zips → optionally attest on BSC testnet. **Simulation only.**

**Repo:** [github.com/Demiladepy/openskill](https://github.com/Demiladepy/openskill)  
**Docs UI:** deploy `skill-reputation/demos/demo-ui` on Vercel (Root Directory setting)

> **Judge quick path:** `git clone` → `npm install` → `npm run strategy:all` → `npm run verify`  
> Best result: **Regime/BTC Sharpe 2.17** · Skills: `skills/cmc-strategy-*/` · MCP: `npm run mcp:forge`  
> BAP-692 stack: ERC-8004 (`npm run agent:register`) + Forge MCP + ERC-8183 jobs (`npm run marketplace:post`)  
> Links: [8004scan testnet](https://testnet.8004scan.io/) · [BNB AI Agent solutions](https://www.bnbchain.org/en/solutions/ai-agent)

---

## The problem

Track 2 asks for **Strategy Skills** — quant research agents can discover, install, and run. Most submissions stop at a README. Forge Skills ships the **full loop**:

| Step | What happens | Proof |
|------|----------------|-------|
| 1 | Live CoinMarketCap signals | `src/cmcDataClient.js`, `src/cmcSignals.js` |
| 2 | Backtest with honest metrics | `backtest_results/*.json` (9 files) |
| 3 | CMC official skill format | `skills/cmc-strategy-*/SKILL.md` |
| 4 | Optional on-chain trust | TWAK signing + BSC attestation + ERC-8004 |

A judge clones the repo, runs three commands, and verifies numbers — no hand-waving.

---

## 60-second start

```bash
git clone https://github.com/Demiladepy/openskill
cd openskill/skill-reputation
npm install
cp .env.example .env
# Add CMC_API_KEY from https://pro.coinmarketcap.com/account
```

```bash
npm run strategy:all    # 3 strategies × BTC, ETH, BNB
npm run replay          # equity report HTML
npm run verify          # submission checklist
```

**Judge demo path:**

```bash
npm run strategy:all && npm run replay && npm run export:skills
```

---

## Sponsor stack

| Layer | Sponsor | Integration | Verify |
|-------|---------|-------------|--------|
| **Data & Skills** | CoinMarketCap | REST API, optional MCP, official `SKILL.md` format | `npm run strategy:all` |
| **Risk & Signing** | Trust Wallet | TWAK CLI — token risk + attestation signing | `npm run twak:check` |
| **Chain & Identity** | BNB Chain | ERC-8004 registration (gas-free testnet) + BSC attestations | `npm run agent:register` |

### CoinMarketCap

- Quotes, Fear & Greed, global metrics via `src/cmcDataClient.js`
- Optional MCP RSI/MACD when `MCP_ENABLED=1`
- Three installable skills: `skills/cmc-strategy-{momentum,sentiment,regime}/`

### Trust Wallet (TWAK)

```bash
npm install -g @trustwallet/cli   # or curl installer from agent-kit.trustwallet.com
twak setup                        # portal.trustwallet.com/dashboard/apps
TWAK_ENABLED=1 npm run twak:check
```

- **Token risk** enriches `cmcSignals.js` before strategy entry
- **Attestation signing** via `twak wallet sign` (viem fallback)
- **MCP for agents:** `twak serve` — see `twak-mcp-config.json`

### BNB Chain

```bash
pip install "bnbagent[server]"
npm run agent:register   # gas-free ERC-8004 on BSC testnet (MegaFuel)
npm run attest           # strategy fingerprint on BscScan
```

Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`

**BAP-692 alignment:** Identity (ERC-8004) + Skills/MCP (Forge, CMC, TWAK, `@bnb-chain/mcp`) + Commerce demo (ERC-8183 jobs) + Payments/Memory roadmap (x402 stub, Greenfield pin). See [`bnbagent/RENDER_DEPLOY.md`](./bnbagent/RENDER_DEPLOY.md).

---

## Backtest results (live CMC)

Window **2026-03-01 → 2026-06-01** · data source `cmc-mixed`

| Strategy | Asset | Sharpe | Max DD | Trades | Return |
|----------|-------|--------|--------|--------|--------|
| Momentum | BTC | -1.75 | 0.82% | 4 | -0.13% |
| Momentum | ETH | -25.94 | 1.24% | 4 | -1.19% |
| Momentum | BNB | -10.05 | 0.38% | 3 | -0.29% |
| Sentiment | BTC | -0.71 | 1.18% | 1 | -0.15% |
| Sentiment | ETH | -6.90 | 1.20% | 1 | -1.14% |
| Sentiment | BNB | -8.30 | 0.49% | 1 | -0.48% |
| **Regime** | **BTC** | **2.17** | 1.09% | 1 | **+0.55%** |
| Regime | ETH | 0 | 0% | 0 | 0% |
| Regime | BNB | 0 | 0% | 0 | 0% |

Reproduce: `npm run strategy:all` with `CMC_API_KEY` and `CMC_USE_MOCK=0`.

---

## For AI agents

```bash
npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills
```

Paste into Cursor / Windsurf / Claude Code:

```
@skill-reputation
Run the CMC momentum backtest on BTC for 2026-03-01 to 2026-06-01.
Use skills/cmc-strategy-momentum/SKILL.md. Return Sharpe, drawdown, trades,
and the path to backtest_results/momentum_BTC.json.
```

Interactive docs + Ask Docs chatbot → [`demos/demo-ui/`](./demos/demo-ui/)

### Forge Skills MCP (agent-native API)

Expose backtests and CMC signals to Cursor / Claude via MCP:

```bash
npm run mcp:forge   # stdio server — add to Cursor MCP settings
```

| Tool | Purpose |
|------|---------|
| `forge_list_skills` | Installable skills + registry |
| `forge_get_backtest` | Metrics for strategy × asset (e.g. regime/BTC) |
| `forge_get_signals` | Live CMC snapshot (+ optional TWAK risk) |
| `forge_verify_submission` | Runs `npm run verify` checklist |
| `forge_agent_status` | ERC-8004 registration + endpoints |
| `forge_bnb_stack` | BAP-692 four-layer map + contract addresses |

Cursor config snippet → [`forge-mcp-config.json`](./forge-mcp-config.json) · Official BNB MCP → [`bnb-mcp-config.json`](./bnb-mcp-config.json)

---

## Architecture

```
CoinMarketCap REST (+ optional MCP)
         │
         ▼
  cmcSignals.js ◄── TWAK CLI (risk + price)
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
 momentum  sentiment    regime
    └────┬────┴────────────┘
         ▼
  backtestEngine.js → backtest_results/*.json
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
 replay   export:skills   attest.js → BSC testnet
                              │
                    bnbagent → ERC-8004
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run strategy:all` | All backtests (9 JSON files) |
| `npm run replay` | PnL replay HTML |
| `npm run export:skills` | CMC skill zips for submission |
| `npm run verify` | Hackathon checklist |
| `npm run attest` | BSC testnet attestation |
| `npm run twak:check` | Verify TWAK CLI |
| `npm run agent:register` | ERC-8004 agent (gas-free) |
| `npm run mcp:forge` | Forge Skills MCP server (6 tools) |
| `npm run marketplace:post` | Post ERC-8183 backtest job (HTTP demo) |
| `npm run marketplace:verify` | Verify agent registration + jobs |
| `npm run greenfield:pin` | Greenfield memory layer artifact manifest |
| `npm run check:secrets` | Pre-push secret scan |

---

## Environment

Copy `.env.example` → `.env` (never commit).

| Variable | Purpose |
|----------|---------|
| `CMC_API_KEY` | Live CoinMarketCap data |
| `CMC_USE_MOCK=0` | Force live (not mock) |
| `TWAK_ENABLED=1` | TWAK CLI enrichment |
| `MCP_ENABLED=1` | CMC MCP technicals |
| `AGENT_PRIVATE_KEY` | BSC testnet signing |
| `ATTEST_MODE=live` | Post attestation txs |

---

## Docs & submission

| Resource | Path |
|----------|------|
| Interactive docs | `demos/demo-ui/` |
| Judge script | [DEMO.md](./DEMO.md) |
| Checklist | [SUBMISSION.md](./SUBMISSION.md) |
| Hackathon | [DoraHacks BNB Hack](https://dorahacks.io/hackathon/bnbhack-twt-cmc/) |

**Deadline:** June 21, 2026 · 12:00 UTC

---

## FAQ

**Why synthetic OHLCV?** CMC free tier may block historical candles. We synthesize daily bars from live spot + official % changes, labeled `cmc-synthetic-ohlcv`.

**Does TWAK work on Vercel?** No — TWAK CLI runs locally. The docs UI shows integration status and setup commands; run `npm run twak:check` on your machine.

**Do I need tBNB for ERC-8004?** No — bnbagent SDK uses MegaFuel paymaster on BSC testnet for gas-free registration.

**Render agent server down?** Forge MCP + Vercel docs still work. See [`bnbagent/RENDER_DEPLOY.md`](./bnbagent/RENDER_DEPLOY.md) for dual Render/local deployment.

**Simulation only?** Yes. No live orders. Backtests produce JSON metrics and equity curves for research.

---

## BAP-692 roadmap (post-hackathon)

| Layer | Status | Next step |
|-------|--------|-----------|
| Identity (ERC-8004) | Live | Re-register when Render URL changes |
| Commerce (ERC-8183) | HTTP demo | Full escrow via EvaluatorRouter |
| Payments (x402) | Stub | `X402_DEMO=1` on agent server |
| Memory (Greenfield) | Manifest | `npm run greenfield:pin` → upload via `@bnb-chain/mcp` |

---

## Security

- Never commit `.env` — run `npm run check:secrets` before push
- Use a throwaway BSC testnet wallet only

---

## License

Hackathon submission — see repo root for license terms.
