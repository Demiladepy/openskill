# CMC Strategy Forge

**BNB Hackathon Track 2 (Strategy Skills)** — CoinMarketCap-powered, simulation-only strategy skills with backtestable specs, TWAK attestation, and marketplace export.

All application code lives in [`skill-reputation/`](skill-reputation/). See that folder’s [README](skill-reputation/README.md) for setup, scripts, and DoraHacks submission steps.

## Quick start

```bash
cd skill-reputation
cp skill/.env.example skill/.env
npm install
npm run strategy:all
npm run replay
npm run hackathon:verify
```

## Submission artifacts

After running the pipeline, upload to DoraHacks:

- GitHub repo URL
- Demo video (strategy → replay → export)
- `skill-reputation/examples/*.cmcskill.zip`
- `skill-reputation/replay/output/submission_manifest.json`

## Optional dev workflow

[gstack](https://github.com/garrytan/gstack) is an optional local Claude Code skill for `/autoplan`, `/review`, and `/browse`. Install it in your user skills directory (`~/.claude/skills/gstack`) — it is not part of this repo.
