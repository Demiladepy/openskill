# Judge Demo Walkthrough — CMC Strategy Forge

**Time:** ~3 minutes | **Path:** `skill-reputation/`

## Before you start

```bash
cd skill-reputation
npm install
cp .env.example .env
```

Set in `.env`:
- `CMC_API_KEY` — from [pro.coinmarketcap.com](https://pro.coinmarketcap.com/login) (or `CMC_USE_MOCK=1` for offline)
- `AGENT_PRIVATE_KEY` — BSC testnet wallet (optional for attestation demo)

## Demo script (record this)

### 1. Run all strategies (45s)

```bash
npm run strategy:all
```

**Say:** "Three quant strategies — momentum, sentiment, regime — each backtested on BTC, ETH, BNB using CoinMarketCap pre-computed signals."

**Show:** Summary table with Sharpe, trades, return.

### 2. Open one result file (30s)

```bash
# Windows
notepad backtest_results\momentum_BTC.json
```

**Point out:** `cmcSignalSource`, `rulesPlainEnglish`, `attestation` block, `metrics.trades`.

### 3. PnL replay (30s)

```bash
npm run replay
```

Open `replay/output/replay_report.html` in browser.

**Say:** "Equity curve and trade log — simulation only, no live trading."

### 4. CMC skills format (30s)

```bash
ls skills/cmc-strategy-*/SKILL.md
npm run export:skills
```

**Say:** "Installable CMC Agent Hub skills — same format as official CMC skills repo."

### 5. On-chain attestation (30s, needs key)

```bash
npm run attest
```

**Say:** "TWAK self-custody signing model — strategy fingerprint posted to BSC testnet."

Open the `explorer` URL from JSON output on BscScan.

### 6. Optional: CMC MCP (15s)

```bash
# MCP_ENABLED=1 in .env
node scripts/cmcSignalsCli.js BTC
```

**Say:** "Point-in-time MCP technicals; backtest uses REST percent changes + Fear & Greed history."

### 7. BNB BAP-692 stack (60s)

```bash
# Cursor: add forge-mcp-config.json → call forge_get_backtest regime/BTC
npm run agent:register          # ERC-8004 — show testnet.8004scan.io
npm run marketplace:post -- --strategy regime --asset BTC   # ERC-8183 job demo
npm run mcp:forge               # Forge MCP (forge_bnb_stack, forge_agent_status)
```

**Say:** "Forge Skills maps onto BNB's four-layer agent stack — CMC Skills + Forge MCP for capability, ERC-8004 for identity, ERC-8183 for backtest jobs, x402 and Greenfield on the roadmap."

Open docs UI **Sponsor stack** section → BAP-692 layer panel.

**Render fallback:** If public agent server is down, show local `npm run agent:server` + Forge MCP (always works).

## Verify everything

```bash
npm run verify
```

## Video checklist

- [ ] Terminal shows `strategy:all` table
- [ ] README backtest table matches your run
- [ ] BscScan tx link (if live attestation)
- [ ] `skills/cmc-strategy-momentum/SKILL.md` visible
- [ ] Under 5 minutes total
