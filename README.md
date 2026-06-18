# CMC Strategy Forge

**BNB Hackathon · Track 2 — Strategy Skills**

> *Quant research that agents can actually run.*  
> Backtest crypto strategies on **CoinMarketCap data**, ship them as **installable CMC skills**, and attest results on **BNB Chain** — simulation only, no live trading.

**Repo:** [`Demiladepy/openskill`](https://github.com/Demiladepy/openskill)  
**Code lives in:** [`skill-reputation/`](./skill-reputation/) ← start here

---

## The idea in one sentence

Most hackathon “AI traders” are vibes in a README. **CMC Strategy Forge** is a reproducible pipeline: **CMC signals in → backtest out → skill zip + optional BSC attestation** — so a judge can clone, run three commands, and verify the numbers.

---

## 60-second start

```bash
cd skill-reputation
npm install
cp .env.example .env
# Add CMC_API_KEY (and later AGENT_PRIVATE_KEY for on-chain demo)
npm run strategy:all
```

**Judge path (3 commands):**

```bash
npm run strategy:all && npm run replay && npm run attest
```

Full guide → **[skill-reputation/README.md](./skill-reputation/README.md)**

---

## What’s in the box

| Folder | What it does |
|--------|----------------|
| [`skill-reputation/`](./skill-reputation/) | **Main app** — strategies, backtest engine, CMC integration |
| [`skill-reputation/skills/`](./skill-reputation/skills/) | Three **CMC-format** agent skills (installable) |
| [`skill-reputation/backtest_results/`](./skill-reputation/backtest_results/) | JSON outputs + equity curves |
| [`skill-reputation/bnbagent/`](./skill-reputation/bnbagent/) | BNB AI Agent SDK (ERC-8004) — optional |
| [`skill-reputation/demos/demo-ui/`](./skill-reputation/demos/demo-ui/) | Optional Vercel dashboard |

---

## Three strategies

1. **Momentum Merger** — RSI, MACD, Fear & Greed, CMC % changes  
2. **Sentiment Divergence** — short vs long-term return divergence + sentiment  
3. **Regime Detector** — BTC dominance, macro regime, trend/volatility  

All consume **CMC pre-computed signals** (REST + optional MCP). Details in the [main README](./skill-reputation/README.md#strategies).

---

## Sponsor stack (what we integrated)

| Sponsor | How we use it |
|---------|----------------|
| **CoinMarketCap** | Data API, MCP technicals, official Skills format |
| **Trust Wallet** | TWAK-compatible self-custody attestation on BSC testnet |
| **BNB Chain** | Strategy fingerprint txs + ERC-8004 agent registration |

---

## Docs map

| Doc | Purpose |
|-----|---------|
| [skill-reputation/README.md](./skill-reputation/README.md) | **Full documentation** — setup, architecture, results |
| [skill-reputation/DEMO.md](./skill-reputation/DEMO.md) | 3-minute judge video script |
| [skill-reputation/SUBMISSION.md](./skill-reputation/SUBMISSION.md) | DoraHacks checklist |
| [skill-reputation/PROMPTS.md](./skill-reputation/PROMPTS.md) | Build tracker |

---

## Links

- [DoraHacks — BNB Hack](https://dorahacks.io/hackathon/bnbhack-twt-cmc/)
- [CMC Agent Hub](https://coinmarketcap.com/api/agent/)
- [CMC Hackathon](https://coinmarketcap.com/api/hackathon/)
- Demo video: *(add before submission)*
- **Vercel demo UI:** Root Directory = `skill-reputation/demos/demo-ui`

---

## Important

- **Simulation only** — no live order execution.  
- **Never commit** `.env` (contains API keys / wallet keys). Run `npm run check:secrets` before push.
