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
