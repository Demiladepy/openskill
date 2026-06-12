#!/usr/bin/env python3
"""Register CMC Strategy Forge as an ERC-8004 agent on BSC Testnet."""
from __future__ import annotations

import argparse
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


def wallet_password() -> str:
    return (
        os.getenv("WALLET_PASSWORD")
        or os.getenv("TWAK_UNLOCK_PASSPHRASE")
        or "local-dev-only"
    )


def wallet_provider():
    from bnbagent import EVMWalletProvider

    private_key = os.getenv("AGENT_PRIVATE_KEY") or os.getenv("PRIVATE_KEY")
    if not private_key:
        raise ValueError("AGENT_PRIVATE_KEY required for live registration")
    return EVMWalletProvider(
        password=wallet_password(),
        private_key=private_key,
        persist=True,
    )


def simulate_register() -> dict:
    import hashlib

    name = os.getenv("AGENT_NAME", "CMC Strategy Forge")
    wallet = os.getenv("AGENT_WALLET_ADDRESS", "0x" + hashlib.sha256(b"simulate-agent").hexdigest()[:40])
    agent_id = int(os.getenv("AGENT_ID", "9001"))
    tx_hash = "0x" + hashlib.sha256(b"simulate-register").hexdigest()
    payload = {
        "mode": "simulate",
        "agentId": agent_id,
        "agent_id": agent_id,
        "name": name,
        "wallet": wallet,
        "transactionHash": tx_hash,
        "registrationTxHash": tx_hash,
        "explorer": f"https://testnet.bscscan.com/tx/{tx_hash}",
        "registry": os.getenv(
            "ERC8004_REGISTRY_ADDRESS",
            "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        ),
        "network": os.getenv("NETWORK", "bsc-testnet"),
        "endpoint": os.getenv("AGENT_PUBLIC_URL", "http://localhost:8000/erc8183/status"),
        "capabilities": ["backtest", "momentum", "sentiment", "regime"],
    }
    save_state(payload)
    print(json.dumps(payload, indent=2))
    print(f"\nAgent registered (simulate) with ID: {agent_id}")
    print(f"Saved to {STATE_PATH}")
    return payload


def live_register() -> dict:
    from bnbagent import AgentEndpoint, ERC8004Agent

    wallet = wallet_provider()
    network = os.getenv("NETWORK", "bsc-testnet")
    sdk = ERC8004Agent(network=network, wallet_provider=wallet)

    endpoint_url = os.getenv(
        "AGENT_PUBLIC_URL",
        os.getenv("ERC8183_AGENT_URL", "http://localhost:8000/erc8183/status"),
    )

    agent_uri = sdk.generate_agent_uri(
        name=os.getenv("AGENT_NAME", "CMC Strategy Forge"),
        description=os.getenv(
            "AGENT_DESCRIPTION",
            "Backtestable quant strategy agent powered by CoinMarketCap data (simulation only).",
        ),
        endpoints=[
            AgentEndpoint(
                name="ERC-8183",
                endpoint=endpoint_url.replace("/status", ""),
                version="1.0.0",
            ),
        ],
    )

    metadata = [
        {"key": "capabilities", "value": "backtest,momentum,sentiment,regime"},
        {"key": "platform", "value": "cmc-strategy-forge"},
    ]

    result = sdk.register_agent(agent_uri=agent_uri, metadata=metadata)
    tx_hash = result.get("transactionHash")
    payload = {
        "mode": "live",
        "agentId": result.get("agentId"),
        "agent_id": result.get("agentId"),
        "transactionHash": tx_hash,
        "registrationTxHash": tx_hash,
        "wallet": wallet.address,
        "registry": os.getenv(
            "ERC8004_REGISTRY_ADDRESS",
            "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        ),
        "network": network,
        "endpoint": endpoint_url,
        "capabilities": ["backtest", "momentum", "sentiment", "regime"],
        "explorer": f"https://testnet.bscscan.com/tx/{tx_hash}" if tx_hash else None,
    }
    save_state(payload)
    print(json.dumps(payload, indent=2))
    print(f"\nAgent registered with ID: {payload['agentId']}")
    print(f"Tx: {tx_hash}")
    if payload.get("explorer"):
        print(f"Explorer: {payload['explorer']}")
    return payload


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser(description="Register CMC Strategy Forge on ERC-8004")
    parser.add_argument("--live", action="store_true", help="Require live BSC testnet registration")
    args = parser.parse_args()

    simulate = os.getenv("AGENT_SIMULATE", "0") == "1"
    has_key = bool(os.getenv("AGENT_PRIVATE_KEY") or os.getenv("PRIVATE_KEY"))
    want_live = args.live or (not simulate and has_key)

    if want_live and has_key:
        try:
            live_register()
            return 0
        except Exception as exc:  # noqa: BLE001
            print(f"Live registration failed: {exc}", file=sys.stderr)
            if args.live:
                return 1
            print("Falling back to simulate mode.", file=sys.stderr)
            simulate_register()
            return 0

    if simulate or not has_key:
        if args.live:
            print("AGENT_PRIVATE_KEY required for --live", file=sys.stderr)
            return 1
        simulate_register()
        return 0

    print("Set AGENT_PRIVATE_KEY and AGENT_SIMULATE=0 for live registration.", file=sys.stderr)
    simulate_register()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
