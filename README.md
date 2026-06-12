# CMC Strategy Forge

**BNB Hackathon Track 2 — Strategy Skills**

CoinMarketCap-powered quant strategy skills platform. Backtests crypto strategies using CMC pre-computed signals, exports installable CMC skills, and attests strategy fingerprints on BNB Chain.

> **Repo note:** This GitHub repo is named [`openskill`](https://github.com/Demiladepy/openskill). All application code lives in **`skill-reputation/`** — start there.

## Get Started

```bash
cd skill-reputation
npm install
cp .env.example .env
# Add CMC_API_KEY and AGENT_PRIVATE_KEY to .env
npm run strategy:all
```

Judge demo (3 commands):

```bash
cd skill-reputation
npm install && cp .env.example .env
npm run strategy:all && npm run replay && npm run attest
```

→ Full documentation: [skill-reputation/README.md](./skill-reputation/README.md)

## What's inside

| Path | Purpose |
|------|---------|
| [`skill-reputation/`](skill-reputation/) | **Main project** — strategies, backtests, CMC integration, attestation |
| [`skill-reputation/skills/`](skill-reputation/skills/) | Installable CMC-format strategy skills |
| [`skill-reputation/bnbagent/`](skill-reputation/bnbagent/) | BNB AI Agent SDK (ERC-8004) — optional |
| [`skill-reputation/demos/`](skill-reputation/demos/) | Optional demo UI — not part of judge path |
| [`skill-reputation/legacy/`](skill-reputation/legacy/) | Archived Hardhat contract — out of scope |

## Links

- [BNB Hackathon (DoraHacks)](https://dorahacks.io/hackathon/bnbhack-twt-cmc/)
- [CMC Agent Hub](https://coinmarketcap.com/api/agent/)
- [CMC Hackathon page](https://coinmarketcap.com/api/hackathon/)
- Demo video: *(add link before submission)*
