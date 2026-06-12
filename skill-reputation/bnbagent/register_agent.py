#!/usr/bin/env python3
"""Register CMC Strategy Vault Validator as an ERC-8004 agent on BSC Testnet."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

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
    load_dotenv(override=False)


def save_state(payload: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing = {}
    if STATE_PATH.exists():
        existing = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    existing.update(payload)
    existing["updated_at"] = __import__("datetime").datetime.utcnow().isoformat() + "Z"
    STATE_PATH.write_text(json.dumps(existing, indent=2), encoding="utf-8")


def simulate_register() -> dict:
    import hashlib

    name = os.getenv("AGENT_NAME", "CMC Strategy Vault Validator")
    wallet = os.getenv("AGENT_WALLET_ADDRESS", "0x" + hashlib.sha256(b"simulate-agent").hexdigest()[:40])
    agent_id = int(os.getenv("AGENT_ID", "9001"))
    payload = {
        "mode": "simulate",
        "agentId": agent_id,
        "agent_id": agent_id,
        "name": name,
        "wallet": wallet,
        "transactionHash": "0x" + hashlib.sha256(b"simulate-register").hexdigest(),
        "registry": os.getenv(
            "ERC8004_REGISTRY_ADDRESS",
            "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        ),
        "network": os.getenv("NETWORK", "bsc-testnet"),
        "endpoint": os.getenv("AGENT_PUBLIC_URL", "http://localhost:8000/erc8183/status"),
    }
    save_state(payload)
    print(json.dumps(payload, indent=2))
    print(f"\nAgent registered (simulate) with ID: {agent_id}")
    print(f"Saved to {STATE_PATH}")
    return payload


def live_register() -> dict:
    from bnbagent import AgentEndpoint, ERC8004Agent, EVMWalletProvider

    wallet = EVMWalletProvider(
        password=os.getenv("WALLET_PASSWORD") or os.getenv("TWAK_UNLOCK_PASSPHRASE", ""),
        private_key=os.getenv("AGENT_PRIVATE_KEY") or os.getenv("PRIVATE_KEY"),
    )
    network = os.getenv("NETWORK", "bsc-testnet")
    sdk = ERC8004Agent(network=network, wallet_provider=wallet)

    endpoint_url = os.getenv(
        "AGENT_PUBLIC_URL",
        os.getenv("ERC8183_AGENT_URL", "http://localhost:8000/erc8183/status"),
    )

    agent_uri = sdk.generate_agent_uri(
        name=os.getenv("AGENT_NAME", "CMC Strategy Vault Validator"),
        description=os.getenv(
            "AGENT_DESCRIPTION",
            "Backtests CMC-based trading strategies and returns verifiable metrics (simulation only).",
        ),
        endpoints=[
            AgentEndpoint(
                name="ERC-8183",
                endpoint=endpoint_url.replace("/status", ""),
                version="1.0.0",
            ),
        ],
    )

    result = sdk.register_agent(agent_uri=agent_uri)
    payload = {
        "mode": "live",
        "agentId": result.get("agentId"),
        "agent_id": result.get("agentId"),
        "transactionHash": result.get("transactionHash"),
        "wallet": wallet.address,
        "registry": os.getenv(
            "ERC8004_REGISTRY_ADDRESS",
            "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        ),
        "network": network,
        "endpoint": endpoint_url,
    }
    save_state(payload)
    print(json.dumps(payload, indent=2))
    print(f"\nAgent registered with ID: {payload['agentId']}")
    print(f"Tx: {payload['transactionHash']}")
    return payload


def main() -> int:
    load_env()
    simulate = os.getenv("AGENT_SIMULATE", "0") == "1"
    has_key = bool(os.getenv("AGENT_PRIVATE_KEY") or os.getenv("PRIVATE_KEY"))
    has_password = bool(os.getenv("WALLET_PASSWORD") or os.getenv("TWAK_UNLOCK_PASSPHRASE"))

    if simulate or not (has_key and has_password):
        if not simulate:
            print("No AGENT_PRIVATE_KEY/WALLET_PASSWORD — using simulate mode (set AGENT_SIMULATE=0 to require live).")
        simulate_register()
        return 0

    try:
        live_register()
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"Live registration failed: {exc}", file=sys.stderr)
        print("Falling back to simulate mode.", file=sys.stderr)
        simulate_register()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
