#!/usr/bin/env node
/**
 * Deploy StrategyEscrow reference contract or print official ERC-8183 addresses.
 */
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import { loadAgentEnv } from "../lib/loadAgentEnv.js";

loadAgentEnv();

const OFFICIAL = {
  network: "bsc-testnet",
  chainId: 97,
  erc8004_registry: process.env.ERC8004_REGISTRY_ADDRESS || "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  erc8183_commerce: process.env.ERC8183_COMMERCE_ADDRESS || "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de",
  erc8183_router: process.env.ERC8183_ROUTER_ADDRESS || "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25",
  erc8183_policy: process.env.ERC8183_POLICY_ADDRESS || "0x4f4678d4439fec812ac7674bb3efb4c8f5fb78a6",
};

async function main() {
  const rpc = process.env.BNB_RPC_URL || process.env.RPC_URL || "https://bsc-testnet.publicnode.com";
  const client = createPublicClient({ chain: bscTestnet, transport: http(rpc) });
  const block = await client.getBlockNumber().catch(() => null);

  console.log(
    JSON.stringify(
      {
        ...OFFICIAL,
        rpc,
        latestBlock: block?.toString() ?? null,
        note: "Track 2 escrow uses official AgenticCommerce kernel via bnbagent SDK. StrategyEscrow.sol is a reference anchor.",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
