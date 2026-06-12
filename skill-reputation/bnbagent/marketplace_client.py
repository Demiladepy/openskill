#!/usr/bin/env python3
"""Post ERC-8183 backtest jobs to the strategy validator agent."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = Path(__file__).resolve().parent / "agent_state.json"


def load_env() -> None:
    for candidate in (
        ROOT / "bnbagent" / ".env.agent",
        ROOT / "skill" / ".env",
        ROOT / ".env",
    ):
        if candidate.exists():
            load_dotenv(candidate, override=False)


def read_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def save_job(record: dict) -> None:
    state = read_state()
    jobs = state.get("jobs", [])
    jobs.append(record)
    state["jobs"] = jobs[-50:]
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def post_http_job(strategy: str, from_date: str, to_date: str, reward: str) -> dict:
    base = os.getenv("AGENT_SERVER_URL", "http://localhost:8000")
    job_id = "0x" + uuid.uuid4().hex
    payload = {
        "jobId": job_id,
        "data": {
            "parameters": json.dumps(
                {"strategy": strategy, "from": from_date, "to": to_date, "symbol": "BNB/USDT"}
            )
        },
    }
    resp = requests.post(f"{base}/api/jobs", json=payload, timeout=120)
    resp.raise_for_status()
    body = resp.json()
    record = {
        "jobId": body.get("jobId", job_id),
        "status": body.get("status", "COMPLETED"),
        "strategy": strategy,
        "reward": reward,
        "mode": "http",
        "result": body.get("result"),
        "posted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    save_job(record)
    return record


def post_onchain_job(strategy: str, from_date: str, to_date: str, reward: str) -> dict:
    from bnbagent.erc8183 import ERC8183Client
    from bnbagent.wallets import EVMWalletProvider

    wallet = EVMWalletProvider(
        password=os.getenv("WALLET_PASSWORD") or os.getenv("TWAK_UNLOCK_PASSPHRASE", ""),
        private_key=os.getenv("CLIENT_PRIVATE_KEY") or os.getenv("PRIVATE_KEY"),
    )
    client = ERC8183Client(wallet, network=os.getenv("NETWORK", "bsc-testnet"))

    state = read_state()
    provider = os.getenv("AGENT_PROVIDER_ADDRESS") or state.get("wallet")
    if not provider:
        raise RuntimeError("Set AGENT_PROVIDER_ADDRESS or register agent first.")

    description = json.dumps(
        {
            "type": "backtest",
            "strategy": strategy,
            "from": from_date,
            "to": to_date,
            "symbol": "BNB/USDT",
            "requirements": "Return Sharpe ratio and max drawdown via CMC data (simulation only).",
        }
    )

    expired_at = int(time.time()) + 65 * 60
    decimals = client.token_decimals()
    budget = int(float(reward) * (10**decimals))

    res = client.create_job(provider=provider, expired_at=expired_at, description=description)
    job_id = res["jobId"]
    client.register_job(job_id)
    client.set_budget(job_id, budget)
    fund = client.fund(job_id, budget)

    record = {
        "jobId": job_id,
        "status": "FUNDED",
        "strategy": strategy,
        "reward": reward,
        "mode": "onchain",
        "fund_tx": fund.get("transactionHash"),
        "posted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    save_job(record)
    return record


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser(description="Post a backtest job to the CMC Strategy agent")
    parser.add_argument("--strategy", default="momentum")
    parser.add_argument("--from", dest="from_date", default="2026-06-01")
    parser.add_argument("--to", dest="to_date", default="2026-06-21")
    parser.add_argument("--reward", default="10")
    parser.add_argument("--onchain", action="store_true", help="Use ERC8183Client instead of HTTP demo")
    args = parser.parse_args()

    use_onchain = args.onchain and bool(
        os.getenv("CLIENT_PRIVATE_KEY") or os.getenv("PRIVATE_KEY")
    ) and bool(os.getenv("WALLET_PASSWORD") or os.getenv("TWAK_UNLOCK_PASSPHRASE"))

    try:
        if use_onchain:
            record = post_onchain_job(args.strategy, args.from_date, args.to_date, args.reward)
        else:
            record = post_http_job(args.strategy, args.from_date, args.to_date, args.reward)
    except Exception as exc:  # noqa: BLE001
        print(f"Job post failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(record, indent=2))
    print(f"\nJob posted: {record['jobId']}")
    if record.get("fund_tx"):
        print(f"Fund tx: {record['fund_tx']}")
    print(f"Monitor: {os.getenv('AGENT_SERVER_URL', 'http://localhost:8000')}/api/jobs/{record['jobId']}/result")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
