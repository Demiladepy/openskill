"""Local Ask Docs engine — keyword scoring + live codebase data. No external API."""

from __future__ import annotations

import re
from typing import Any

from . import loaders

TOKEN_RE = re.compile(r"[a-z0-9]+")

INTENTS: list[dict[str, Any]] = [
    {
        "id": "install",
        "keywords": ["install", "add", "npx", "cursor", "windsurf", "claude", "openclaw", "agent hub"],
        "section": "for-agents",
        "title": "Install Forge Skills in your agent",
        "body": (
            "Forge Skills ship as CMC-format folders under `skills/`. Install the full pack:\n\n"
            "```bash\n"
            "npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills\n"
            "```\n\n"
            "Or copy `skills/cmc-strategy-momentum/`, `cmc-strategy-sentiment/`, and "
            "`cmc-strategy-regime/` into your agent's skills directory. Each folder contains a "
            "`SKILL.md` manifest the agent reads at Level 2 when triggered."
        ),
    },
    {
        "id": "backtest",
        "keywords": ["backtest", "run", "strategy", "sharpe", "metrics", "npm run", "btc", "eth", "bnb"],
        "section": "quick-start",
        "title": "Run backtests",
        "body": (
            "From `skill-reputation/`:\n\n"
            "```bash\n"
            "npm run strategy:all          # all 3 strategies × BTC, ETH, BNB\n"
            "npm run strategy:momentum     # single momentum run (default window)\n"
            "npm run strategy:sentiment\n"
            "npm run strategy:regime\n"
            "```\n\n"
            "Direct CLI with custom symbol/window:\n\n"
            "```bash\n"
            "node strategies/index.js momentum --from 2026-03-01 --to 2026-06-01 --symbol BTC\n"
            "```\n\n"
            "Results land in `backtest_results/{strategy}_{asset}.json` with Sharpe, max drawdown, "
            "win rate, trade count, equity curve, and optional BSC attestation block."
        ),
    },
    {
        "id": "skill_md",
        "keywords": ["skill.md", "frontmatter", "yaml", "format", "manifest", "structure", "belongs"],
        "section": "skill-structure",
        "title": "SKILL.md format",
        "body": (
            "Each skill folder matches CoinMarketCap Agent Hub format:\n\n"
            "**Required YAML frontmatter:** `name`, `version`, `description`, `tags`, `author`\n\n"
            "**Required sections:** Description, Prerequisites, CMC Data Sources, Strategy Logic, "
            "Usage (copy-paste prompts), Output Format.\n\n"
            "Example path: `skills/cmc-strategy-momentum/SKILL.md`"
        ),
    },
    {
        "id": "export",
        "keywords": ["export", "zip", "marketplace", "dora", "submission", "package"],
        "section": "export-skills",
        "title": "Export skills for submission",
        "body": (
            "```bash\n"
            "npm run export:skills\n"
            "```\n\n"
            "Creates `examples/cmc-strategy-momentum.zip`, `cmc-strategy-sentiment.zip`, "
            "`cmc-strategy-regime.zip`, and bundle `examples/cmc-strategy-skills.zip` with backtest "
            "appendix files. Run locally — needs full monorepo filesystem (not Vercel serverless)."
        ),
    },
    {
        "id": "twak",
        "keywords": ["twak", "trust wallet", "agent kit", "risk", "token risk", "price", "wallet sign"],
        "section": "attestations",
        "title": "Trust Wallet Agent Kit (TWAK)",
        "body": (
            "**Install:** `npm install -g @trustwallet/cli` or "
            "`curl -fsSL https://agent-kit.trustwallet.com/install.sh | bash`\n\n"
            "**Setup:** `twak setup` — credentials from https://portal.trustwallet.com/dashboard/apps\n\n"
            "Forge Skills uses TWAK for:\n"
            "1. Token risk scoring in `src/cmcSignals.js` (`TWAK_ENABLED=1`)\n"
            "2. Attestation signing via `twak wallet sign` (viem fallback)\n"
            "3. MCP: `twak serve` — see `twak-mcp-config.json`\n\n"
            "Verify: `npm run twak:check`"
        ),
    },
        "keywords": ["attest", "attestation", "bsc", "twak", "on-chain", "wallet", "tx", "bscscan"],
        "section": "attestations",
        "title": "BSC testnet attestation",
        "body": (
            "1. Set `AGENT_PRIVATE_KEY` and fund a BSC testnet wallet (faucet: testnet.bnbchain.org)\n"
            "2. Set `ATTEST_MODE=live` and `BNB_RPC_URL` in `.env`\n"
            "3. Run:\n\n"
            "```bash\n"
            "npm run attest\n"
            "# or: node skill/scripts/attest.js --strategy momentum --score 85\n"
            "```\n\n"
            "Pipeline computes a `sha256:` strategy digest from canonical JSON, signs with viem, "
            "posts verifiable tx to BscScan testnet. During `strategy:all`, each result JSON gets "
            "an `attestation` block (simulate mode if no key)."
        ),
    },
    {
        "id": "verify",
        "keywords": ["verify", "checklist", "check", "secrets", "ready", "submission"],
        "section": "verify",
        "title": "Verify submission readiness",
        "body": (
            "```bash\n"
            "npm run verify\n"
            "npm run check:secrets\n"
            "```\n\n"
            "Checks: 9 backtest JSONs exist, Sharpe > 1 recommended, live CMC data detected, "
            "CMC skill format valid, export zips in `examples/`, replay HTML generated, "
            "attestation tx present. Writes `replay/output/hackathon_checklist.json`."
        ),
    },
    {
        "id": "cmc",
        "keywords": ["cmc", "coinmarketcap", "api", "mock", "live", "ohlcv", "fear", "greed", "mcp", "data"],
        "section": "cmc-integration",
        "title": "CoinMarketCap integration",
        "body": (
            "**Env:** `CMC_API_KEY`, `CMC_USE_MOCK=0` for live data, `MCP_ENABLED=1` for pre-computed RSI/MACD.\n\n"
            "**Endpoints** (`src/cmcDataClient.js`):\n"
            "- `/v1/cryptocurrency/quotes/latest`\n"
            "- `/v3/fear-and-greed/latest` + historical\n"
            "- `/v1/global-metrics/quotes/latest`\n"
            "- `/v2/cryptocurrency/ohlcv/historical` (free tier may 403 → synthetic daily bars from spot)\n\n"
            "Data source label in results: `cmc-mixed`, `coinmarketcap-data-api`, or `mock-with-warning`."
        ),
    },
    {
        "id": "replay",
        "keywords": ["replay", "html", "equity", "pnl", "chart", "report"],
        "section": "backtest-results",
        "title": "PnL replay report",
        "body": (
            "```bash\n"
            "npm run replay\n"
            "```\n\n"
            "Generates `replay/output/replay_report.html` — interactive equity curve and trade log "
            "from `backtest_results/*_replay_data.json`. Part of the judge demo path."
        ),
    },
    {
        "id": "momentum",
        "keywords": ["momentum", "rsi", "macd", "merger"],
        "section": "strategies",
        "title": "Momentum Merger strategy",
        "body": (
            "**Path:** `skills/cmc-strategy-momentum/` → `strategies/momentumMerger.js`\n\n"
            "Score-based entries from CMC RSI, MACD, Fear & Greed, and percent changes. "
            "BUY: RSI < 35 or (MACD bullish AND F&G < 30). SELL: RSI > 65 or (MACD bearish AND F&G > 70). "
            "5% trailing stop. Simulation only."
        ),
    },
    {
        "id": "sentiment",
        "keywords": ["sentiment", "divergence", "capitulation", "fear"],
        "section": "strategies",
        "title": "Sentiment Divergence strategy",
        "body": (
            "**Path:** `skills/cmc-strategy-sentiment/` → `strategies/sentimentDivergence.js`\n\n"
            "7-day vs 30-day return divergence plus Fear & Greed capitulation signals. "
            "Detects price/sentiment/volume capitulation for entries."
        ),
    },
    {
        "id": "regime",
        "keywords": ["regime", "dominance", "trending", "atr", "sma"],
        "section": "strategies",
        "title": "Regime Detector strategy",
        "body": (
            "**Path:** `skills/cmc-strategy-regime/` → `strategies/regimeDetector.js`\n\n"
            "Classifies TRENDING UP/DOWN/RANGING via SMA(20/50), ATR, BTC dominance. "
            "Enters only in risk-on trending regimes. Best live result: Regime/BTC Sharpe 2.17."
        ),
    },
    {
        "id": "agent_bnb",
        "keywords": ["erc-8004", "erc-8183", "register", "bnbagent", "marketplace", "job", "fastapi"],
        "section": "for-agents",
        "title": "BNB Agent registration (optional)",
        "body": (
            "```bash\n"
            "python bnbagent/register_agent.py --live\n"
            "python bnbagent/agent_server.py\n"
            "python bnbagent/marketplace_client.py --strategy momentum --asset BTC\n"
            "```\n\n"
            "ERC-8004 agent identity + ERC-8183 job marketplace on BSC testnet. "
            "Not required for core hackathon judge path."
        ),
    },
    {
        "id": "overview",
        "keywords": ["what", "forge", "overview", "start", "started", "hello", "hi", "help"],
        "section": "overview",
        "title": "Forge Skills overview",
        "body": (
            "Forge Skills are installable quant strategy packages for AI agents. "
            "Pull live CoinMarketCap data → backtest 3 strategies on BTC/ETH/BNB → "
            "export CMC-format skill zips → optionally attest on BSC testnet.\n\n"
            "**Judge path:** `npm run strategy:all && npm run replay && npm run export:skills && npm run verify`\n\n"
            "Simulation only — no live trading."
        ),
    },
    {
        "id": "architecture",
        "keywords": ["architecture", "pipeline", "flow", "how", "work", "engine"],
        "section": "specification",
        "title": "Pipeline architecture",
        "body": (
            "```\n"
            "CMC Data API (+ optional MCP)\n"
            "  → src/cmcSignals.js\n"
            "  → momentumMerger | sentimentDivergence | regimeDetector\n"
            "  → src/backtestEngine.js\n"
            "  → backtest_results/*.json + attest\n"
            "  → replay/pnlReplay.js → replay_report.html\n"
            "  → marketplace/exporter.js → examples/*.zip\n"
            "```\n\n"
            "Slippage 0.1%/leg, fee 0.1%/leg. Sharpe uses 365 crypto periods/year."
        ),
    },
    {
        "id": "env",
        "keywords": ["env", "environment", "variable", "key", "private", "config", ".env"],
        "section": "for-agents",
        "title": "Environment variables",
        "body": (
            "Copy `skill-reputation/.env.example` → `.env` (never commit).\n\n"
            "**Required for live data:** `CMC_API_KEY`, `CMC_USE_MOCK=0`\n"
            "**Attestation:** `AGENT_PRIVATE_KEY`, `ATTEST_MODE=live`, `BNB_RPC_URL`\n"
            "**Optional MCP:** `MCP_ENABLED=1`, `CMC_MCP_URL`\n"
            "**Backtest window:** `CMC_BACKTEST_FROM`, `CMC_BACKTEST_TO`"
        ),
    },
]


def _tokenize(text: str) -> set[str]:
    return set(TOKEN_RE.findall(text.lower()))


def _score_intent(query_tokens: set[str], intent: dict[str, Any]) -> float:
    score = 0.0
    for kw in intent["keywords"]:
        kw_tokens = _tokenize(kw)
        if kw in " ".join(query_tokens) or kw.replace(" ", "") in query_tokens:
            score += 3.0
        overlap = query_tokens & kw_tokens
        score += len(overlap) * 1.5
    return score


def _fmt_metric(val: float | int | None, suffix: str = "") -> str:
    if val is None:
        return "—"
    if isinstance(val, float):
        return f"{val:.2f}{suffix}"
    return f"{val}{suffix}"


def _backtest_block(strategy: str | None, asset: str | None) -> str:
    rows = loaders.load_all_backtests()
    if not rows:
        return ""

    if strategy and asset:
        row = next((r for r in rows if r["strategy"] == strategy and r["asset"] == asset), None)
        if row:
            return (
                f"\n\n**Live backtest ({strategy}/{asset})** from `{row['path']}`:\n"
                f"- Sharpe: {_fmt_metric(row['sharpe'])}\n"
                f"- Max drawdown: {_fmt_metric(row['maxDrawdownPct'], '%')}\n"
                f"- Trades: {row['trades']}\n"
                f"- Win rate: {_fmt_metric(row['winRatePct'], '%')}\n"
                f"- Return: {_fmt_metric(row['totalReturnPct'], '%')}\n"
                f"- Data source: {row.get('dataSource', 'unknown')}"
            )

    if asset and not strategy:
        subset = [r for r in rows if r["asset"] == asset]
        if subset:
            lines = [f"\n\n**Backtests on {asset}:**"]
            for r in sorted(subset, key=lambda x: -(x.get("sharpe") or -999)):
                lines.append(
                    f"- {r['strategy']}: Sharpe {_fmt_metric(r['sharpe'])}, "
                    f"{r['trades']} trades, return {_fmt_metric(r['totalReturnPct'], '%')}"
                )
            return "\n".join(lines)

    if strategy:
        subset = [r for r in rows if r["strategy"] == strategy]
        if subset:
            lines = [f"\n\n**{strategy.title()} backtests:**"]
            for r in subset:
                lines.append(
                    f"- {r['asset']}: Sharpe {_fmt_metric(r['sharpe'])}, "
                    f"{r['trades']} trades, return {_fmt_metric(r['totalReturnPct'], '%')}"
                )
            return "\n".join(lines)

    best = max(rows, key=lambda r: r.get("sharpe") or -999)
    lines = ["\n\n**All backtest results** (window 2026-03-01 → 2026-06-01):"]
    for r in sorted(rows, key=lambda x: -(x.get("sharpe") or -999)):
        lines.append(
            f"- {r['strategy']}/{r['asset']}: Sharpe {_fmt_metric(r['sharpe'])}, "
            f"DD {_fmt_metric(r['maxDrawdownPct'], '%')}, {r['trades']} trades"
        )
    lines.append(f"\nBest performer: **{best['strategy']}/{best['asset']}** Sharpe {_fmt_metric(best['sharpe'])}")
    return "\n".join(lines)


def _skills_block() -> str:
    skills = loaders.load_skills()
    if not skills:
        return ""
    lines = ["\n\n**Installed skill folders:**"]
    for s in skills:
        lines.append(f"- `{s['path']}` — {s['description'][:120]}")
    return "\n".join(lines)


def _scripts_block() -> str:
    scripts = loaders.load_npm_scripts()
    core = ["strategy:all", "replay", "export:skills", "verify", "attest", "check:secrets"]
    present = [f"`npm run {k}`" for k in core if k in scripts]
    if not present:
        return ""
    return "\n\n**Available npm scripts:** " + ", ".join(present)


def ask(query: str) -> dict[str, Any]:
    query = query.strip()
    if not query:
        return {"ok": False, "error": "Empty question"}

    tokens = _tokenize(query)
    strategy = loaders.detect_strategy(query)
    asset = loaders.detect_asset(query)

    scored = [(intent, _score_intent(tokens, intent)) for intent in INTENTS]
    if strategy:
        for i, (intent, score) in enumerate(scored):
            if intent["id"] == strategy:
                scored[i] = (intent, score + 8.0)
    scored.sort(key=lambda x: -x[1])
    top_intent, top_score = scored[0]

    if top_score < 1.0:
        top_intent = next(i for i in INTENTS if i["id"] == "overview")

    answer_parts = [top_intent["body"]]
    answer_parts.append(_backtest_block(strategy, asset))
    if top_intent["id"] in ("install", "skill_md", "overview"):
        answer_parts.append(_skills_block())
    if top_intent["id"] in ("backtest", "overview", "verify"):
        answer_parts.append(_scripts_block())

    answer = "".join(answer_parts)

    related = [
        {"question": i["title"], "sectionId": i["section"]}
        for i, s in scored[1:4]
        if s > 0
    ]

    commands: list[str] = []
    scripts = loaders.load_npm_scripts()
    if "backtest" in top_intent["id"] or strategy:
        if strategy and f"strategy:{strategy}" in scripts:
            commands.append(f"npm run strategy:{strategy}")
        commands.append("npm run strategy:all")
    if top_intent["id"] == "export":
        commands.append("npm run export:skills")
    if top_intent["id"] == "verify":
        commands.extend(["npm run verify", "npm run check:secrets"])

    return {
        "ok": True,
        "question": query,
        "title": top_intent["title"],
        "answer": answer,
        "sectionId": top_intent["section"],
        "intent": top_intent["id"],
        "confidence": round(min(top_score / 10, 1.0), 2),
        "commands": commands,
        "related": related,
        "detected": {"strategy": strategy, "asset": asset},
    }
