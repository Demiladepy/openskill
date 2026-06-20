/**
 * TWAK-compatible self-custody strategy attestation signing.
 * Uses viem on BSC testnet; structured for drop-in @trustwallet/agent-kit when it ships.
 */
import { createHash } from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToBytes,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { getTwakCli } from "../../../src/twakCliClient.js";
import { resolvePrivateKeyFromEnv } from "../../../src/lib/walletFromEnv.js";
import { initTwakAutonomous } from "./twakClient.js";

/** Set true when @trustwallet/agent-kit is published and verified. */
export const TWAK_SDK_AVAILABLE = false;

const VAULT_ABI = [
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "skillKey", type: "bytes32" },
      { name: "score", type: "uint8" },
      { name: "digest", type: "bytes32" },
    ],
    outputs: [],
  },
];

export function resolvePrivateKey() {
  return resolvePrivateKeyFromEnv();
}

export function computeStrategyDigest(payload) {
  const canonical = JSON.stringify(payload);
  const hex = createHash("sha256").update(canonical).digest("hex");
  return `sha256:${hex}`;
}

export function digestToBytes32(digest) {
  if (digest.startsWith("sha256:")) {
    return `0x${digest.slice(7).padStart(64, "0").slice(0, 64)}`;
  }
  if (digest.startsWith("0x") && digest.length === 66) return digest;
  return keccak256(stringToBytes(digest));
}

/** Try TWAK CLI wallet sign before viem fallback */
export function tryTwakCliSign(message) {
  const twak = getTwakCli();
  if (!twak.available) return null;

  for (const cmd of [
    `wallet sign --message "${message.replace(/"/g, '\\"')}"`,
    `sign --message "${message.replace(/"/g, '\\"')}"`,
  ]) {
    const result = twak.exec(cmd, 10000);
    if (result && result.length > 10) {
      return {
        signature: result,
        method: "twak-cli",
        note: "Signed via Trust Wallet Agent Kit CLI (self-custody)",
        twakVersion: twak.version,
      };
    }
  }
  return null;
}

/**
 * @param {string} strategyDigest
 */
export async function signAttestation(strategyDigest) {
  const twakCli = tryTwakCliSign(strategyDigest);
  if (twakCli) {
    const twak = await initTwakAutonomous();
    return {
      signature: twakCli.signature,
      signer: twak.address || undefined,
      method: twakCli.method,
      provider: "twak-cli",
      twakVersion: twakCli.twakVersion,
      note: twakCli.note,
      selfCustody: true,
    };
  }

  if (TWAK_SDK_AVAILABLE) {
    // TWAK SDK path — enable when @trustwallet/agent-kit ships
  }

  const twak = await initTwakAutonomous();
  const pk = twak.privateKey || resolvePrivateKey();
  if (!pk) throw new Error("Live attestation requires AGENT_PRIVATE_KEY or TWAK_AGENT_PRIVATE_KEY");

  const account = privateKeyToAccount(pk);
  const rpc = process.env.BNB_RPC_URL || process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/";
  const walletClient = createWalletClient({ account, chain: bscTestnet, transport: http(rpc) });
  const signature = await walletClient.signMessage({ message: strategyDigest });

  return {
    signature,
    signer: account.address,
    method: "viem (TWAK-compatible self-custody signing)",
    provider: twak.provider,
  };
}

/**
 * Post attestation on BSC testnet — vault contract if configured, else self-send tx with JSON data.
 */
export async function postAttestationOnChain(params) {
  const { strategyDigest, signature, strategyName, score = 85, strategyKey } = params;
  const pk = resolvePrivateKey();
  if (!pk) throw new Error("AGENT_PRIVATE_KEY required for on-chain attestation");

  const account = privateKeyToAccount(pk);
  const rpc = process.env.BNB_RPC_URL || process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/";
  const publicClient = createPublicClient({ chain: bscTestnet, transport: http(rpc) });
  const walletClient = createWalletClient({ account, chain: bscTestnet, transport: http(rpc) });

  const contract = process.env.CMC_STRATEGY_VAULT_CONTRACT || process.env.SKILL_REPUTATION_CONTRACT;
  const digestBytes = digestToBytes32(strategyDigest);

  if (contract && strategyKey) {
    const hash = await walletClient.writeContract({
      address: contract,
      abi: VAULT_ABI,
      functionName: "attest",
      args: [strategyKey, score, digestBytes],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return {
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      explorer: `https://testnet.bscscan.com/tx/${hash}`,
      method: "vault.attest()",
    };
  }

  const attestationPayload = {
    type: "strategy_attestation",
    strategy: strategyName,
    digest: strategyDigest,
    digestBytes32: digestBytes,
    signature,
    score,
    strategyKey: strategyKey || null,
    timestamp: Date.now(),
    platform: "cmc-strategy-forge",
  };

  const data = toHex(stringToBytes(JSON.stringify(attestationPayload)));
  const hash = await walletClient.sendTransaction({
    account,
    to: account.address,
    value: 0n,
    data,
    gas: 100_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    explorer: `https://testnet.bscscan.com/tx/${hash}`,
    method: "self-send attestation data (TWAK self-custody model)",
  };
}

/**
 * Full live attestation: sign digest + post on-chain.
 */
export async function attestStrategyDigest(params) {
  const { strategyDigest, strategyName, score, strategyKey } = params;
  const signed = await signAttestation(strategyDigest);
  const chain = await postAttestationOnChain({
    strategyDigest,
    signature: signed.signature,
    strategyName,
    score,
    strategyKey,
  });

  return {
    digest: strategyDigest,
    digestBytes32: digestToBytes32(strategyDigest),
    signature: signed.signature,
    signer: signed.signer,
    method: signed.method,
    signingMethod: signed.method,
    provider: signed.provider,
    twakVersion: signed.twakVersion || null,
    twakAvailable: !!getTwakCli().available,
    selfCustody: signed.selfCustody !== false,
    txHash: chain.txHash,
    blockNumber: chain.blockNumber,
    explorer: chain.explorer,
    postMethod: chain.method,
    mode: "live",
    note: signed.note || "Strategy fingerprint signed and attested on BSC testnet",
  };
}
