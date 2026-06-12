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

## CMC CLI Skill (Agent Hub)

Installable quant strategy pack for `cmc skills install`:

```bash
cd skill-reputation/cli-skill
npm install

# Offline demo (no API key)
$env:CMC_USE_MOCK='1'   # PowerShell
npm run run -- --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json

# Metrics on saved output
npm run run -- --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json > result.json
npm run metrics -- --file result.json
```

Production install:

```bash
cmc skills install https://github.com/Demiladepy/openskill/tree/main/skill-reputation/cli-skill
cmc skill run cmc-quant-strategy-pack run --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json
```

See [`skill-reputation/cli-skill/README.md`](skill-reputation/cli-skill/README.md) for full docs.

## BNB AI Agent SDK

Register your validator as an ERC-8004 agent and accept ERC-8183 backtest jobs:

```bash
cd skill-reputation
pip install -r bnbagent/requirements.txt
npm run agent:register
npm run agent:run
```

Details: [`skill-reputation/bnbagent/README.md`](skill-reputation/bnbagent/README.md)

## Submission artifacts

After running the pipeline, upload to DoraHacks:

- GitHub repo URL
- Demo video (strategy → replay → export)
- `skill-reputation/examples/*.cmcskill.zip`
- `skill-reputation/replay/output/submission_manifest.json`

## Optional dev workflow

[gstack](https://github.com/garrytan/gstack) is an optional local Claude Code skill for `/autoplan`, `/review`, and `/browse`. Install it in your user skills directory (`~/.claude/skills/gstack`) — it is not part of this repo.
