/**
 * BAP-692 layer constants and agent state reader — shared by MCP, specs, and docs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const BNB_STACK = {
  registry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  erc8183_commerce: "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de",
  erc8183_router: "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25",
  erc8183_policy: "0x4f4678d4439fec812ac7674bb3efb4c8f5fb78a6",
  github: "https://github.com/Demiladepy/openskill",
  skills_install:
    "npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills",
  forge_mcp_config:
    "https://github.com/Demiladepy/openskill/raw/main/skill-reputation/forge-mcp-config.json",
  bnb_mcp: "npx @bnb-chain/mcp@latest",
  cmc_mcp: "https://mcp.coinmarketcap.com/mcp",
  solutions_url: "https://www.bnbchain.org/en/solutions/ai-agent",
  scan_testnet: "https://testnet.8004scan.io/",
};

export const BAP692_LAYERS = [
  {
    id: "identity",
    standard: "ERC-8004",
    status: "live",
    description: "On-chain agent ID, registration, attestation",
    verify: "npm run agent:register",
  },
  {
    id: "commerce",
    standard: "ERC-8183",
    status: "demo",
    description: "Backtest jobs — local demo now; optional Render URL later",
    verify: "npm run marketplace:post",
  },
  {
    id: "payments",
    standard: "x402 + MPP",
    status: "roadmap",
    description: "Micropayment stub for backtest-as-a-service (X402_DEMO=1)",
    verify: "POST /api/jobs with X402_DEMO=1",
  },
  {
    id: "memory",
    standard: "BNB Greenfield",
    status: "roadmap",
    description: "Pin backtest artifacts via @bnb-chain/mcp Greenfield tools",
    verify: "npm run greenfield:pin",
  },
];

export function readAgentState() {
  const statePath = path.join(ROOT, "bnbagent", "agent_state.json");
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
}

export function loadBnbIntegration(attestation = null) {
  const state = readAgentState();
  const attestationTx =
    attestation?.txHash ||
    attestation?.explorer ||
    state?.attestationExplorer ||
    state?.attestation_tx ||
    null;

  return {
    erc8004: state
      ? {
          registered: state.mode === "live",
          agentId: state.agentId ?? state.agent_id ?? null,
          registry: state.registry || BNB_STACK.registry,
          explorer: state.explorer ?? null,
          wallet: state.wallet ?? null,
          endpoint_primary: state.endpoint_primary ?? state.endpoint ?? null,
          endpoint_fallback: state.endpoint_fallback ?? null,
          endpoints: state.endpoints ?? [],
        }
      : { registered: false, registry: BNB_STACK.registry },
    erc8183: {
      endpoint: state?.endpoint_primary ?? state?.endpoint ?? null,
      commerce: BNB_STACK.erc8183_commerce,
      status: state?.endpoint_primary ? "demo" : "local",
    },
    attestation_tx: attestationTx,
    bap692: BAP692_LAYERS.map((l) => ({ id: l.id, standard: l.standard, status: l.status })),
    simulation_only: true,
  };
}
