# Forge Skills

**Quant strategy skills for AI agents — CoinMarketCap · Trust Wallet · BNB Chain**

[![Track 2](https://img.shields.io/badge/BNB%20Hack-Strategy%20Skills-blue)](https://dorahacks.io/hackathon/bnbhack-twt-cmc/)
[![Hackathon](https://img.shields.io/badge/DoraHacks-Submit%20BUIDL-orange)](https://dorahacks.io/hackathon/bnbhack-twt-cmc/)

> **Track 2 — Strategy Skills.** Installable CMC skill packages, live backtests, Forge MCP, ERC-8004 identity. **Simulation only** — research and metrics, not live trading.

| | |
|---|---|
| **GitHub** | [github.com/Demiladepy/openskill](https://github.com/Demiladepy/openskill) |
| **Hackathon** | [DoraHacks BNB Hack × CMC × Trust Wallet](https://dorahacks.io/hackathon/bnbhack-twt-cmc/) |
| **Deadline** | June 21, 2026 · 12:00 UTC |
| **Docs UI** | [`demos/demo-ui/`](./demos/demo-ui/) (optional Vercel deploy) |
| **Demo video** | Script: [`DEMO.md`](./DEMO.md) (~3 min) |

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 18+** | All backtests, MCP, attestation scripts |
| **Python 3.10+** | ERC-8004 registration + ERC-8183 marketplace demo |
| **CMC API key** | [pro.coinmarketcap.com](https://pro.coinmarketcap.com/account) — or set `CMC_USE_MOCK=1` offline |
| **BSC testnet wallet** | Only for `npm run attest` (needs small tBNB for gas) |
| **Trust Wallet CLI** | Optional — `npm run twak:check` |

```bash
npm install
pip install -r bnbagent/requirements.txt
cp .env.example .env
```

---

## Judges — start here

```bash
git clone https://github.com/Demiladepy/openskill
cd openskill/skill-reputation
npm install
cp .env.example .env   # add CMC_API_KEY for live data, or CMC_USE_MOCK=1 offline
npm run strategy:all
npm run verify
```

**Full demo path:** `npm run strategy:all && npm run replay && npm run export:skills`

| What to check | Where |
|---------------|--------|
| Best backtest | **Regime / BTC · Sharpe 2.17** → `backtest_results/regime_BTC.json` |
| CMC skill format | `skills/cmc-strategy-{momentum,sentiment,regime}/SKILL.md` |
| Skill export zip | `examples/cmc-strategy-skills.zip` after `npm run export:skills` |
| Replay report | `replay/output/replay_report.html` |
| MCP (local) | `npm run mcp:forge` + [`forge-mcp-config.json`](./forge-mcp-config.json) |
| Checklist | [`SUBMISSION.md`](./SUBMISSION.md) · [`DEMO.md`](./DEMO.md) |

**No Render or public server required** — judges clone GitHub and run locally. Optional hosted agent server: [`bnbagent/RENDER_DEPLOY.md`](./bnbagent/RENDER_DEPLOY.md) (later).

---

## On-chain proofs (BSC testnet)

| Proof | Link |
|-------|------|
| **ERC-8004 agent** | Agent ID **1460** · [BscScan registration](https://testnet.bscscan.com/tx/0x1544ee04b206db1c8a3e8e66d5d0eb393bc73aa0fd29181d83efdfc94000d413) |
| **8004scan** | [testnet.8004scan.io/agent/1460](https://testnet.8004scan.io/agent/1460) |
| **Strategy attestation** | [BscScan attestation](https://testnet.bscscan.com/tx/0xe8870d221a00532e9320bd69f10ac533911c752491ba4d183931ee6c03970753) |
| **Wallet** | `0x6ADAEd26bB074580457A89553B674a332d03e1b8` |
| **Registry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |

Agent discovery is **GitHub-first**: on-chain `agentURI` points to repo, skills tree, and Forge MCP config — no hosted job server needed for submission.

Reproduce locally (requires `.env` with wallet — **never commit**):

```bash
npm run wallet:address      # verify derived address
npm run agent:register      # ERC-8004 — gas-free on testnet (MegaFuel)
npm run attest              # strategy fingerprint tx (needs tBNB for gas)
npm run check:secrets       # run before every git push
```

Trust Wallet users: set `AGENT_MNEMONIC` (recovery phrase) or `AGENT_PRIVATE_KEY` in `.env` — see [Environment](#environment).

---

## DoraHacks — copy into your BUIDL

**Track:** Strategy Skills (Track 2) · **Sponsors:** CoinMarketCap, Trust Wallet, BNB Chain

**One-line pitch:** Forge Skills is the Track 2 research layer on BNB's agent stack — CMC Skills + Forge MCP → ERC-8004 identity → local ERC-8183 backtest jobs → simulation-only metrics judges can reproduce in three commands.

**Project description (paste into BUIDL):**

> Forge Skills ships installable quant strategy packages for AI agents on the BNB Hackathon Track 2 stack. Three strategies (momentum, sentiment, regime) pull live CoinMarketCap signals, backtest on BTC/ETH/BNB, and export official CMC Agent Hub skill zips. A Forge MCP server exposes six tools for agents and judges. On-chain trust is live on BSC testnet: ERC-8004 agent **1460**, strategy attestation, and GitHub-first discovery (no hosted server required). Commerce and payments layers are demonstrated locally via ERC-8183 job posting and x402/Greenfield roadmap stubs. **Simulation only** — backtest metrics and skill exports, not live trading. Clone, `npm run strategy:all && npm run verify`, and compare Regime/BTC Sharpe **2.17** against `backtest_results/regime_BTC.json`.

**Links to paste:**

| Field | Value |
|-------|--------|
| Repository | `https://github.com/Demiladepy/openskill` |
| README / docs | `https://github.com/Demiladepy/openskill/tree/main/skill-reputation` |
| 8004scan | `https://testnet.8004scan.io/agent/1460` |
| Registration tx | `https://testnet.bscscan.com/tx/0x1544ee04b206db1c8a3e8e66d5d0eb393bc73aa0fd29181d83efdfc94000d413` |
| Attestation tx | `https://testnet.bscscan.com/tx/0xe8870d221a00532e9320bd69f10ac533911c752491ba4d183931ee6c03970753` |
| Demo video | Record using [`DEMO.md`](./DEMO.md) — upload to YouTube/Loom and paste URL |

---

## What Forge Skills ships

| Step | What happens | Proof |
|------|----------------|-------|
| 1 | Live CoinMarketCap signals | `src/cmcDataClient.js`, `src/cmcSignals.js` |
| 2 | Backtest with honest metrics | `backtest_results/*.json` (9 files) |
| 3 | Official CMC skill format | `skills/cmc-strategy-*/SKILL.md` |
| 4 | On-chain trust (optional) | ERC-8004 + BSC attestation + TWAK-compatible signing |

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

## Sponsor stack

| Sponsor | Integration | Verify |
|---------|-------------|--------|
| **CoinMarketCap** | REST API, optional MCP, official `SKILL.md` | `npm run strategy:all` |
| **Trust Wallet** | TWAK CLI — token risk + attestation signing | `npm run twak:check` |
| **BNB Chain** | ERC-8004 (agent **1460**) + BSC attestation + BNBAgent SDK | `npm run agent:register` |

### BAP-692 alignment

| Layer | Standard | Status in Forge Skills |
|-------|----------|------------------------|
| Identity & trust | ERC-8004 | **Live** — agent 1460 on BSC testnet |
| Capability | Agent Skills + MCPs | CMC skills + Forge MCP + `@bnb-chain/mcp` |
| Commerce | ERC-8183 | Local job demo — `npm run marketplace:post` |
| Payments | x402 + MPP | Roadmap stub (`X402_DEMO=1`) |
| Memory | BNB Greenfield | Roadmap — `npm run greenfield:pin` |

---

## For AI agents

**Install skills:**

```bash
npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills
```

**Example prompt (Cursor / Claude Code):**

```
Run the CMC regime backtest on BTC for 2026-03-01 to 2026-06-01.
Use skills/cmc-strategy-regime/SKILL.md. Return Sharpe, drawdown, trades,
and backtest_results/regime_BTC.json path.
```

### Forge Skills MCP

```bash
npm run mcp:forge
```

| Tool | Purpose |
|------|---------|
| `forge_list_skills` | Installable skills + registry |
| `forge_get_backtest` | Metrics for strategy × asset |
| `forge_get_signals` | Live CMC snapshot |
| `forge_verify_submission` | Hackathon checklist |
| `forge_agent_status` | ERC-8004 registration state |
| `forge_bnb_stack` | BAP-692 layer map |

Config: [`forge-mcp-config.json`](./forge-mcp-config.json) · BNB MCP: [`bnb-mcp-config.json`](./bnb-mcp-config.json)

**Cursor MCP** (Settings → MCP — set `cwd` to your clone):

```json
{
  "mcpServers": {
    "forge-skills": {
      "command": "node",
      "args": ["scripts/forgeMcpServer.js"],
      "cwd": "/absolute/path/to/skill-reputation"
    }
  }
}
```

Interactive docs + Ask Docs → [`demos/demo-ui/`](./demos/demo-ui/)

---

## Repository layout

```
skill-reputation/
├── skills/cmc-strategy-*/     # Installable CMC Agent Hub skills
├── backtest_results/          # JSON metrics (9 files after strategy:all)
├── examples/                  # cmc-strategy-skills.zip after export:skills
├── replay/output/             # replay_report.html
├── scripts/                   # MCP server, verify, wallet helpers
├── bnbagent/                  # ERC-8004 + ERC-8183 Python SDK integration
├── demos/demo-ui/             # Optional docs UI (Vercel)
├── forge-mcp-config.json      # Forge MCP for Cursor / Claude
└── SUBMISSION.md · DEMO.md    # Checklist + video script
```

---

## Architecture

```
CoinMarketCap REST (+ optional MCP)
         │
         ▼
  cmcSignals.js ◄── TWAK CLI (optional risk)
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
                    bnbagent → ERC-8004 (GitHub discovery)
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run strategy:all` | All backtests (9 JSON files) |
| `npm run strategy:{momentum,sentiment,regime}` | Single strategy backtest |
| `npm run replay` | PnL replay HTML |
| `npm run export:skills` | CMC skill zips for submission |
| `npm run verify` | Hackathon checklist |
| `npm run attest` | BSC testnet attestation |
| `npm run agent:register` | ERC-8004 (gas-free testnet) |
| `npm run agent:discover` | Preview agentURI before register |
| `npm run agent:server` | Local ERC-8183 job server |
| `npm run wallet:address` | Verify wallet from `.env` |
| `npm run mcp:forge` | Forge MCP server (6 tools) |
| `npm run marketplace:post` | ERC-8183 backtest job (local) |
| `npm run marketplace:verify` | Verify posted job result |
| `npm run greenfield:pin` | BNB Greenfield artifact stub |
| `npm run twak:check` | Verify TWAK CLI |
| `npm run check:secrets` | Pre-push secret scan |

---

## Environment

Copy [`.env.example`](./.env.example) → `.env` (**never commit** `.env` or `bnbagent/.env.agent`).

| Variable | Purpose |
|----------|---------|
| `CMC_API_KEY` | Live CoinMarketCap data |
| `CMC_USE_MOCK=0` | Force live data (not mock) |
| `AGENT_MNEMONIC` | Trust Wallet recovery phrase → BSC signing |
| `AGENT_PRIVATE_KEY` | Alternative: exported hex key |
| `ATTEST_MODE=live` | Post real attestation txs |
| `TWAK_ENABLED=1` | TWAK CLI enrichment during backtests |
| `MCP_ENABLED=1` | CMC MCP technicals |
| `AGENT_DISCOVERY_MODE=github` | Default — no Render URL needed |

```bash
npm run check:secrets   # always run before git push
```

---

## FAQ

**What does “simulation only” mean?**  
Track 2 requires **backtestable strategy skills**, not live exchange trading. You get JSON metrics, equity curves, and skill zips — not autonomous order execution. This is a **hackathon rule**, not a missing integration. BSC testnet (ERC-8004 + attestation) is already live for this project.

**Do I need Render?**  
**No.** Submit with GitHub + on-chain links above. Render is optional if you later want a public ERC-8183 job URL.

**Do I need tBNB for ERC-8004 registration?**  
**No** — MegaFuel paymaster sponsors registration on BSC testnet. Attestation txs need a small amount of tBNB for gas.

**Why synthetic OHLCV?** CMC free tier may block historical candles. We synthesize daily bars from live spot + official % changes, labeled `cmc-synthetic-ohlcv`.

**Does TWAK work on Vercel?** No — TWAK CLI runs locally. The docs UI shows setup commands; run `npm run twak:check` on your machine.

---

## Docs

| Resource | Path |
|----------|------|
| Submission checklist | [SUBMISSION.md](./SUBMISSION.md) |
| Demo video script | [DEMO.md](./DEMO.md) |
| Optional Render deploy | [bnbagent/RENDER_DEPLOY.md](./bnbagent/RENDER_DEPLOY.md) |
| BNB AI Agent solutions | [bnbchain.org/solutions/ai-agent](https://www.bnbchain.org/en/solutions/ai-agent) |

---

## Security

- Never commit `.env` — gitignored; verify with `npm run check:secrets`
- Use a dedicated BSC **testnet** wallet only
- Do not paste recovery phrases in issues, PRs, or DoraHacks comments

---

## License

Hackathon submission — see repo root for license terms.
