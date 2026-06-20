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

DEFAULT_GITHUB = "https://github.com/Demiladepy/openskill"
DEFAULT_SKILLS_URL = f"{DEFAULT_GITHUB}/tree/main/skill-reputation/skills"
DEFAULT_FORGE_MCP_URL = f"{DEFAULT_GITHUB}/raw/main/skill-reputation/forge-mcp-config.json"
DEFAULT_DOCS_URL = f"{DEFAULT_GITHUB}/tree/main/skill-reputation"
DEFAULT_COMMERCE_DOCS_URL = DEFAULT_GITHUB  # short URI for on-chain tx size
DEFAULT_SKILL_INSTALL = (
    "npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills"
)
DEFAULT_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e"
LOCAL_ERC8183 = "http://localhost:8000/erc8183/status"


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
        mnemonic = (os.getenv("AGENT_MNEMONIC") or os.getenv("TWAK_MNEMONIC") or "").strip()
        if mnemonic and "your_" not in mnemonic:
            try:
                from eth_account import Account

                Account.enable_unaudited_hdwallet_features()
                acct = Account.from_mnemonic(mnemonic)
                private_key = acct.key.hex()
                if not private_key.startswith("0x"):
                    private_key = "0x" + private_key
            except Exception as exc:  # noqa: BLE001
                raise ValueError(f"AGENT_MNEMONIC invalid: {exc}") from exc
    if not private_key:
        raise ValueError(
            "AGENT_PRIVATE_KEY or AGENT_MNEMONIC required for live registration "
            "(Trust Wallet: use recovery phrase in AGENT_MNEMONIC, or export BSC testnet private key)"
        )
    return EVMWalletProvider(
        password=wallet_password(),
        private_key=private_key,
        persist=True,
    )


def read_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def resolve_endpoint_urls() -> dict:
    """GitHub-first discovery by default; set AGENT_PUBLIC_URL later for Render/live ERC-8183."""
    discovery_mode = os.getenv("AGENT_DISCOVERY_MODE", "github").lower()
    public_url = (os.getenv("AGENT_PUBLIC_URL") or "").strip()
    fallback = os.getenv("AGENT_FALLBACK_URL", LOCAL_ERC8183)

    if public_url.startswith("http"):
        primary = public_url
        erc8183_base = primary.replace("/status", "").rstrip("/")
        mode = "render" if "onrender.com" in public_url else "live"
    elif discovery_mode == "github":
        primary = DEFAULT_COMMERCE_DOCS_URL
        erc8183_base = DEFAULT_COMMERCE_DOCS_URL
        mode = "github"
    else:
        primary = os.getenv("ERC8183_AGENT_URL", LOCAL_ERC8183)
        erc8183_base = primary.replace("/status", "").rstrip("/")
        mode = "local"

    docs = os.getenv("AGENT_DOCS_URL", DEFAULT_DOCS_URL)
    repo = os.getenv("AGENT_REPO_URL", DEFAULT_GITHUB)

    return {
        "primary": primary,
        "fallback": fallback,
        "erc8183_base": erc8183_base,
        "docs": docs,
        "github": repo,
        "skills": os.getenv("AGENT_SKILLS_URL", DEFAULT_SKILLS_URL),
        "forge_mcp": os.getenv("FORGE_MCP_CONFIG_URL", DEFAULT_FORGE_MCP_URL),
        "discovery_mode": mode,
        "attestation": os.getenv(
            "ATTESTATION_EXPLORER_URL",
            read_state().get("attestationExplorer") or read_state().get("attestation_tx") or "",
        ),
    }


def build_agent_endpoints(urls: dict):
    from bnbagent import AgentEndpoint

    compact = os.getenv("AGENT_URI_COMPACT", "1") != "0"
    if compact:
        return [
            AgentEndpoint(name="github", endpoint=urls["github"], version="1.0"),
            AgentEndpoint(name="skills", endpoint=urls["skills"], version="1.0"),
            AgentEndpoint(name="forge-mcp", endpoint=urls["forge_mcp"], version="1.0"),
        ]

    endpoints = [
        AgentEndpoint(name="github", endpoint=urls["github"], version="1.0.0"),
        AgentEndpoint(name="docs", endpoint=urls["docs"], version="1.0.0"),
        AgentEndpoint(name="skills", endpoint=urls["skills"], version="1.0.0"),
        AgentEndpoint(name="forge-mcp", endpoint=urls["forge_mcp"], version="1.0.0"),
        AgentEndpoint(name="ERC-8183", endpoint=urls["erc8183_base"], version="1.0.0"),
    ]
    if urls.get("attestation"):
        endpoints.append(AgentEndpoint(name="attestation", endpoint=urls["attestation"], version="1.0.0"))
    return endpoints


def build_registration_metadata() -> list:
    compact = os.getenv("AGENT_URI_COMPACT", "1") != "0"
    if compact:
        return [
            {"key": "platform", "value": "forge-skills"},
            {"key": "chain", "value": os.getenv("NETWORK", "bsc-testnet")},
            {"key": "simulation_only", "value": "true"},
        ]
    return [
        {"key": "capabilities", "value": "backtest,momentum,sentiment,regime"},
        {"key": "platform", "value": "cmc-strategy-forge"},
        {"key": "chain", "value": os.getenv("NETWORK", "bsc-testnet")},
        {"key": "simulation_only", "value": "true"},
        {"key": "erc8004_registry", "value": os.getenv("ERC8004_REGISTRY_ADDRESS", DEFAULT_REGISTRY)},
        {"key": "mcp_forge", "value": "npm run mcp:forge"},
        {"key": "skill_install", "value": os.getenv("SKILL_INSTALL_CMD", DEFAULT_SKILL_INSTALL)},
        {"key": "roadmap_layer", "value": "BAP-692"},
        {"key": "bap692_layers", "value": "identity,commerce,payments-roadmap,memory-roadmap"},
        {"key": "discovery_mode", "value": os.getenv("AGENT_DISCOVERY_MODE", "github")},
        {"key": "github_repo", "value": os.getenv("AGENT_REPO_URL", DEFAULT_GITHUB)},
    ]


def endpoint_manifest(urls: dict) -> list:
    manifest = [
        {"name": "github", "url": urls["github"]},
        {"name": "docs", "url": urls["docs"]},
        {"name": "skills", "url": urls["skills"]},
        {"name": "forge-mcp", "url": urls["forge_mcp"]},
        {"name": "ERC-8183", "url": urls["erc8183_base"]},
    ]
    if urls.get("attestation"):
        manifest.append({"name": "attestation", "url": urls["attestation"]})
    return manifest


def simulate_register() -> dict:
    import hashlib

    name = os.getenv("AGENT_NAME", "CMC Strategy Forge")
    wallet = os.getenv("AGENT_WALLET_ADDRESS", "0x" + hashlib.sha256(b"simulate-agent").hexdigest()[:40])
    agent_id = int(os.getenv("AGENT_ID", "9001"))
    tx_hash = "0x" + hashlib.sha256(b"simulate-register").hexdigest()
    urls = resolve_endpoint_urls()
    payload = {
        "mode": "simulate",
        "agentId": agent_id,
        "agent_id": agent_id,
        "name": name,
        "wallet": wallet,
        "transactionHash": tx_hash,
        "registrationTxHash": tx_hash,
        "explorer": f"https://testnet.bscscan.com/tx/{tx_hash}",
        "registry": os.getenv("ERC8004_REGISTRY_ADDRESS", DEFAULT_REGISTRY),
        "network": os.getenv("NETWORK", "bsc-testnet"),
        "endpoint": urls["primary"],
        "endpoint_primary": urls["primary"],
        "endpoint_fallback": urls["fallback"],
        "endpoints": endpoint_manifest(urls),
        "discovery_mode": urls["discovery_mode"],
        "github_repo": urls["github"],
        "capabilities": ["backtest", "momentum", "sentiment", "regime"],
        "bap692_layers": ["identity", "commerce", "payments-roadmap", "memory-roadmap"],
    }
    save_state(payload)
    print(json.dumps(payload, indent=2))
    print(f"\nAgent registered (simulate) with ID: {agent_id}")
    print(f"Saved to {STATE_PATH}")
    return payload


def discover_sdk_api() -> int:
    """Print bnbagent SDK surface for integration debugging."""
    print("\n=== BNB Agent SDK API Discovery ===")
    try:
        import bnbagent

        print(f"Version: {getattr(bnbagent, '__version__', 'unknown')}")
        print(f"Top-level: {[x for x in dir(bnbagent) if not x.startswith('_')]}")
    except ImportError:
        print("bnbagent not installed. Run: pip install \"bnbagent[server]\"")
        return 1

    for name in ("ERC8004Agent", "EVMWalletProvider", "AgentEndpoint"):
        try:
            obj = getattr(__import__("bnbagent", fromlist=[name]), name, None)
            if obj:
                print(f"\n{name}: available")
        except Exception as exc:  # noqa: BLE001
            print(f"\n{name}: {exc}")

    print("\nERC-8004 registration is GAS-FREE on BSC testnet via MegaFuel paymaster.")
    print("Registry: 0x8004A818BFB912233c491871b3d84c89A494BD9e")
    return 0


def live_register() -> dict:
    from bnbagent import ERC8004Agent

    wallet = wallet_provider()
    network = os.getenv("NETWORK", "bsc-testnet")
    sdk = ERC8004Agent(network=network, wallet_provider=wallet)
    urls = resolve_endpoint_urls()

    agent_uri = sdk.generate_agent_uri(
        name=os.getenv("AGENT_NAME", "CMC Strategy Forge"),
        description=os.getenv(
            "AGENT_DESCRIPTION",
            "CMC Strategy Forge — backtestable quant skills (simulation only).",
        ),
        endpoints=build_agent_endpoints(urls),
    )

    result = sdk.register_agent(agent_uri=agent_uri, metadata=build_registration_metadata())
    tx_hash = result.get("transactionHash")
    payload = {
        "mode": "live",
        "agentId": result.get("agentId"),
        "agent_id": result.get("agentId"),
        "transactionHash": tx_hash,
        "registrationTxHash": tx_hash,
        "wallet": wallet.address,
        "registry": os.getenv("ERC8004_REGISTRY_ADDRESS", DEFAULT_REGISTRY),
        "network": network,
        "endpoint": urls["primary"],
        "endpoint_primary": urls["primary"],
        "endpoint_fallback": urls["fallback"],
        "endpoints": endpoint_manifest(urls),
        "discovery_mode": urls["discovery_mode"],
        "github_repo": urls["github"],
        "capabilities": ["backtest", "momentum", "sentiment", "regime"],
        "bap692_layers": ["identity", "commerce", "payments-roadmap", "memory-roadmap"],
        "explorer": f"https://testnet.bscscan.com/tx/{tx_hash}" if tx_hash else None,
        "scan_url": f"https://testnet.8004scan.io/agent/{result.get('agentId')}"
        if result.get("agentId")
        else None,
        "gasFree": True,
        "sdk": "bnbagent",
        "note": "ERC-8004 registration gas-free on BSC testnet via MegaFuel paymaster",
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
    parser.add_argument("--discover", action="store_true", help="Print bnbagent SDK API surface")
    args = parser.parse_args()

    if args.discover:
        return discover_sdk_api()

    simulate = os.getenv("AGENT_SIMULATE", "0") == "1"
    has_key = bool(
        os.getenv("AGENT_PRIVATE_KEY")
        or os.getenv("PRIVATE_KEY")
        or (os.getenv("AGENT_MNEMONIC") or os.getenv("TWAK_MNEMONIC") or "").strip()
    )
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
