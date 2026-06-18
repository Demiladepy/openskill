# CMC Strategy Forge / Forge Skills

**BNB Hackathon · Track 2 — Strategy Skills**

Quant research that AI agents can install, run, and verify. Live CoinMarketCap data, TWAK risk scoring, BNB Chain attestation — simulation only.

**Start here:** [`skill-reputation/`](./skill-reputation/)  
**Interactive docs:** deploy [`skill-reputation/demos/demo-ui/`](./skill-reputation/demos/demo-ui/) on Vercel

---

## Quick start

```bash
cd skill-reputation
npm install && cp .env.example .env
# Add CMC_API_KEY, then:
npm run strategy:all
```

**Judge path:** `npm run strategy:all && npm run replay && npm run export:skills`

Full documentation → **[skill-reputation/README.md](./skill-reputation/README.md)**

---

## What ships

| Output | Command |
|--------|---------|
| 9 backtest JSON files | `npm run strategy:all` |
| PnL replay HTML | `npm run replay` |
| CMC skill zips | `npm run export:skills` |
| Submission checklist | `npm run verify` |

**Best live result:** Regime/BTC · Sharpe **2.17** · window Mar–Jun 2026

---

## Sponsor integrations

| CoinMarketCap | Trust Wallet | BNB Chain |
|---------------|--------------|-----------|
| REST + MCP + Skills format | TWAK CLI risk + signing | ERC-8004 + BSC attestations |

The [docs UI](./skill-reputation/demos/demo-ui/) shows live integration status, sponsor stack, Ask Docs chatbot, and copy-paste agent prompts. TWAK and BNB registration run via CLI on your machine.

---

## Links

- [DoraHacks submission](https://dorahacks.io/hackathon/bnbhack-twt-cmc/)
- [CMC Agent Hub](https://coinmarketcap.com/api/agent/)
- [TWAK Portal](https://portal.trustwallet.com/dashboard/apps)
- [BNB Agent SDK](https://github.com/bnb-chain/bnbagent-sdk)
- [SUBMISSION.md](./skill-reputation/SUBMISSION.md) · [DEMO.md](./skill-reputation/DEMO.md)

**Deadline:** June 21, 2026 · 12:00 UTC

---

Simulation only. Never commit `.env`. Run `npm run check:secrets` before push.
