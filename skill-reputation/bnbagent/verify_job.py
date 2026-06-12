#!/usr/bin/env python3
"""Verify on-chain ERC-8183 job status via bnbagent SDK."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent


def load_env() -> None:
    for candidate in (
        ROOT / "bnbagent" / ".env.agent",
        ROOT / "skill" / ".env",
    ):
        if candidate.exists():
            load_dotenv(candidate, override=False)


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-id", required=True)
    args = parser.parse_args()

    from bnbagent.erc8183 import ERC8183Client
    from bnbagent.wallets import EVMWalletProvider

    wallet = EVMWalletProvider(
        password=os.getenv("WALLET_PASSWORD") or "",
        private_key=os.getenv("CLIENT_PRIVATE_KEY") or os.getenv("PRIVATE_KEY"),
    )
    client = ERC8183Client(wallet, network=os.getenv("NETWORK", "bsc-testnet"))
    status = client.get_job_status(args.job_id)
    job = client.commerce.get_job(args.job_id)

    payload = {
        "jobId": args.job_id,
        "status": str(status),
        "job": job,
        "summary": f"Status: {status}",
    }
    print(json.dumps(payload, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
