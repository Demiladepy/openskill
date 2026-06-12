# CMC Quant Strategy Pack (CLI Skill)

Installable **CoinMarketCap CLI Skill** for backtestable quant strategies. Simulation only — no live trading.

## Install

### Via CMC CLI (production)

Install from the **openskill** repo (project: CMC Strategy Forge):

```bash
cmc skills install https://github.com/Demiladepy/openskill/tree/main/skill-reputation/cli-skill
```

### Local development (symlink)

```bash
cd skill-reputation/cli-skill
npm install

# Unix / macOS
mkdir -p ~/.cmc/skills
ln -sf "$(pwd)" ~/.cmc/skills/cmc-quant-strategy-pack

# Windows PowerShell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cmc\skills" | Out-Null
cmd /c mklink /J "$env:USERPROFILE\.cmc\skills\cmc-quant-strategy-pack" "$(Get-Location)"
```

Set env in `skill-reputation/skill/.env`:

```bash
CMC_API_KEY=your_key
# or offline demo:
CMC_USE_MOCK=1
```

## Usage

```bash
# Run momentum backtest (JSON for agents)
cmc skill run cmc-quant-strategy-pack run --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json > result.json

# Or invoke the bin directly from this repo:
npm run run -- --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json

# Compute metrics on saved output
cmc skill run cmc-quant-strategy-pack metrics --file result.json
npm run metrics -- --file result.json
```

### Expected JSON output

```json
{
  "strategy": "Momentum Merger",
  "range": { "startDate": "2026-06-01", "endDate": "2026-06-21" },
  "metrics": {
    "totalReturnPct": 0,
    "sharpeRatio": 0,
    "maxDrawdownPct": 0,
    "winRatePct": 0,
    "trades": 0
  },
  "trades": [],
  "equityCurve": [10000],
  "mockWarning": "Using mock CMC data (CMC_USE_MOCK=1)"
}
```

## Commands

| Command | Description |
|---------|-------------|
| `run --strategy <name>` | Backtest momentum, sentiment, or regime |
| `metrics --file <path>` | Sharpe, max drawdown, total return, win rate |

## Adding a strategy

1. Implement a class extending `BaseStrategy` in `skill-reputation/strategies/`.
2. Add a re-export in `scripts/strategies/<name>.js`.
3. Register the key in `scripts/strategyRunner.js` `STRATEGIES` map.
4. Document the key in `SKILL.md` frontmatter.

## Verification

```bash
cd skill-reputation/cli-skill
npm install
$env:CMC_USE_MOCK='1'   # PowerShell
npm run run -- --strategy momentum --from 2026-06-01 --to 2026-06-21 --output json > result.json
npm run metrics -- --file result.json
npm test
```
