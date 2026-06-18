"""Load live data from the skill-reputation codebase."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
BACKTEST_DIR = ROOT / "backtest_results"
SKILLS_DIR = ROOT / "skills"
PACKAGE_JSON = ROOT / "package.json"


def repo_root() -> Path:
    return ROOT


def load_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def load_npm_scripts() -> dict[str, str]:
    data = load_json(PACKAGE_JSON)
    if not data:
        return {}
    scripts = data.get("scripts") or {}
    return {k: str(v) for k, v in scripts.items()}


def load_backtest(strategy: str, asset: str) -> dict[str, Any] | None:
    path = BACKTEST_DIR / f"{strategy}_{asset}.json"
    return load_json(path)


def load_all_backtests() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not BACKTEST_DIR.is_dir():
        return rows
    for path in sorted(BACKTEST_DIR.glob("*_*.json")):
        if path.name.endswith("_spec.json") or path.name.endswith("_replay_data.json"):
            continue
        parts = path.stem.split("_", 1)
        if len(parts) != 2:
            continue
        data = load_json(path)
        if not data or "metrics" not in data:
            continue
        m = data["metrics"]
        rows.append(
            {
                "strategy": data.get("strategy", parts[0]),
                "asset": data.get("asset", parts[1]),
                "sharpe": m.get("sharpeRatio"),
                "maxDrawdownPct": m.get("maxDrawdownPct"),
                "trades": m.get("trades"),
                "winRatePct": m.get("winRatePct"),
                "totalReturnPct": m.get("totalReturnPct"),
                "dataSource": data.get("dataSource"),
                "path": f"backtest_results/{path.name}",
            }
        )
    return rows


def parse_skill_frontmatter(skill_dir: Path) -> dict[str, str]:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        return {}
    text = skill_md.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}
    meta: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            meta[key.strip()] = val.strip()
    return meta


def load_skills() -> list[dict[str, str]]:
    skills: list[dict[str, str]] = []
    if not SKILLS_DIR.is_dir():
        return skills
    for folder in sorted(SKILLS_DIR.iterdir()):
        if not folder.is_dir():
            continue
        meta = parse_skill_frontmatter(folder)
        if meta:
            skills.append(
                {
                    "folder": folder.name,
                    "name": meta.get("name", folder.name),
                    "description": meta.get("description", ""),
                    "path": f"skills/{folder.name}/SKILL.md",
                }
            )
    return skills


def detect_strategy(text: str) -> str | None:
    lower = text.lower()
    for name in ("momentum", "sentiment", "regime"):
        if name in lower:
            return name
    return None


def detect_asset(text: str) -> str | None:
    upper = text.upper()
    for asset in ("BTC", "ETH", "BNB"):
        if asset in upper or asset.lower() in text.lower():
            return asset
    return None
