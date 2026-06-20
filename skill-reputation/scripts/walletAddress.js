#!/usr/bin/env node
/** Print derived BSC address from AGENT_PRIVATE_KEY or AGENT_MNEMONIC — npm run wallet:address */
import { loadProjectEnv } from "../src/lib/loadEnv.js";
import { resolveWalletAddressFromEnv } from "../src/lib/walletFromEnv.js";

loadProjectEnv();

const addr = resolveWalletAddressFromEnv();
if (!addr) {
  console.error("Set AGENT_PRIVATE_KEY or AGENT_MNEMONIC in skill-reputation/.env");
  process.exit(1);
}
console.log(JSON.stringify({ address: addr, network: "bsc-testnet" }, null, 2));
