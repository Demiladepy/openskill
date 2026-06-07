#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { loadProjectEnv } from "../../src/lib/loadEnv.js";
import {
  appendTwakLog,
  initTwakAutonomous,
  saveTwakSession,
  twakConfigFingerprint,
} from "./lib/twakClient.js";

loadProjectEnv();

async function promptHidden(question) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function main() {
  console.log("=== Trust Wallet Agent Kit (TWAK) Setup ===");
  console.log("Session will be saved to ~/.twak/session.json (never commit this file).\n");

  const passphrase = process.env.TWAK_UNLOCK_PASSPHRASE || (await promptHidden("Unlock passphrase: "));
  if (!passphrase) throw new Error("Passphrase required");

  let privateKey = process.env.TWAK_AGENT_PRIVATE_KEY || process.env.ATTESTOR_PRIVATE_KEY;
  if (!privateKey) {
    console.log("No TWAK_AGENT_PRIVATE_KEY found — generating ephemeral test key for BSC testnet demo.");
    const { generatePrivateKey } = await import("viem/accounts");
    privateKey = generatePrivateKey();
    console.log("Generated key for this session only. Fund this address on BSC testnet for live attest.");
  }

  const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(normalized);

  const session = await saveTwakSession({
    address: account.address,
    chainId: bscTestnet.id,
    mode: "autonomous",
    autonomous: true,
    unlocked: true,
    passphraseHint: "stored via TWAK_UNLOCK_PASSPHRASE env at runtime",
  });

  await appendTwakLog({
    status: "setup_complete",
    address: account.address,
    chainId: bscTestnet.id,
    fingerprint: twakConfigFingerprint(session.session),
  });

  console.log("\nSession saved:", session.sessionPath);
  console.log("Agent address:", account.address);

  const rpc = process.env.BNB_RPC_URL || process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet.publicnode.com";
  const publicClient = createPublicClient({ chain: bscTestnet, transport: http(rpc) });
  const walletClient = createWalletClient({ account, chain: bscTestnet, transport: http(rpc) });

  const dummyMessage = `TWAK dummy attestation setup ${new Date().toISOString()}`;
  const signature = await walletClient.signMessage({ message: dummyMessage });

  console.log("\nDummy sign test (BSC testnet):");
  console.log({ message: dummyMessage, signature: signature.slice(0, 22) + "..." });

  const balance = await publicClient.getBalance({ address: account.address }).catch(() => 0n);
  console.log("Balance (wei):", balance.toString());

  console.log("\nNext steps:");
  console.log("1. Set TWAK_UNLOCK_PASSPHRASE in skill/.env");
  console.log("2. Set ATTEST_MODE=simulate for backtests or ATTEST_MODE=live for on-chain attestation");
  console.log("3. Run: npm run attest -w cmc-strategy-validator-skill -- --strategy momentum --score 85");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
