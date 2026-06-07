#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { loadProjectEnv } from "../../src/lib/loadEnv.js";
import { getBehaviorLogPath } from "../../src/lib/logPath.js";
import { parseFrontmatter } from "./lib/parseFrontmatter.js";
import { computeSkillKey, normalizeName } from "./lib/skillKey.js";
import {
  appendTwakLog,
  getAttestMode,
  initTwakAutonomous,
  twakConfigFingerprint,
} from "./lib/twakClient.js";

loadProjectEnv();

const ABI = [
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

function parseArgs(argv) {
  let target;
  let score;
  for (let i = 2; i < argv.length; i++) {
    if ((argv[i] === "--skill" || argv[i] === "--strategy") && argv[i + 1]) target = argv[++i];
    else if (argv[i] === "--score" && argv[i + 1]) score = Number(argv[++i]);
  }
  return { target, score };
}

function defaultLogPath() {
  return getBehaviorLogPath();
}

async function readLastScanDigest(logPath) {
  const raw = await fs.readFile(logPath, "utf8").catch(() => "");
  const lines = raw.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(lines[i]);
      if (row.type === "scan" && row.digest) return row.digest;
    } catch {
      /* skip */
    }
  }
  return keccak256(stringToBytes("empty-log"));
}

function matchesStrategyAlias(targetName, strategyName) {
  const t = normalizeName(targetName);
  const s = normalizeName(strategyName);
  if (t === s) return true;
  if (t.includes(s) || s.includes(t)) return true;
  const aliases = {
    momentum: "momentum",
    sentiment: "sentiment",
    regime: "regime",
  };
  for (const [alias, token] of Object.entries(aliases)) {
    if (t === alias && s.includes(token)) return true;
  }
  return false;
}

async function findStrategyKeyByName(logPath, targetName) {
  const raw = await fs.readFile(logPath, "utf8").catch(() => "");
  const lines = raw.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(lines[i]);
      const list = row.snapshot?.strategies || row.snapshot?.skills || [];
      if (row.type !== "scan" || !list.length) continue;

      const matches = list.filter((s) => matchesStrategyAlias(targetName, s.name));
      if (!matches.length) continue;

      const preferred =
        matches.find((s) => s.kind === "implementation") ||
        matches.find((s) => s.path?.endsWith(".js")) ||
        matches[0];
      return preferred.skillKey || preferred.strategyKey;
    } catch {
      /* skip */
    }
  }
  return null;
}

async function strategyKeyFromPath(mdPath) {
  const raw = await fs.readFile(mdPath, "utf8");
  const { front } = parseFrontmatter(raw);
  const name = front.name;
  if (!name) throw new Error("Manifest missing name in frontmatter");
  return computeSkillKey(raw, name);
}

/**
 * Attest on-chain via TWAK signing interface.
 * @param {{ strategyKey: `0x${string}`, score: number, digest: `0x${string}` }} params
 */
export async function attest(params) {
  const mode = getAttestMode();
  const twak = await initTwakAutonomous();
  const logPath = defaultLogPath();

  await appendTwakLog({
    status: "attest_start",
    mode,
    provider: twak.provider,
    address: twak.address,
    strategyKey: params.strategyKey,
    score: params.score,
    digest: params.digest,
    fingerprint: twakConfigFingerprint(twak.session),
  });

  if (mode === "simulate") {
    const fakeTx = keccak256(stringToBytes(`${params.strategyKey}:${params.score}:${params.digest}:simulate`));
    const result = {
      mode: "simulate",
      txHash: fakeTx,
      strategyKey: params.strategyKey,
      score: params.score,
      digest: params.digest,
      note: "Simulation only — no on-chain transaction (Track 2 backtest path)",
    };
    await fs.appendFile(logPath, JSON.stringify({ type: "attest", ts: new Date().toISOString(), ...result }) + "\n", "utf8");
    await appendTwakLog({ status: "attest_simulated", txHash: fakeTx });
    return result;
  }

  const rpc = process.env.BNB_RPC_URL || process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet.publicnode.com";
  const contract =
    process.env.CMC_STRATEGY_VAULT_CONTRACT || process.env.SKILL_REPUTATION_CONTRACT;
  if (!contract) throw new Error("Set CMC_STRATEGY_VAULT_CONTRACT or SKILL_REPUTATION_CONTRACT");

  const pk = twak.privateKey;
  if (!pk) throw new Error("TWAK live mode requires TWAK_AGENT_PRIVATE_KEY or unlocked session");

  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: bscTestnet, transport: http(rpc) });
  const walletClient = createWalletClient({ account, chain: bscTestnet, transport: http(rpc) });

  const hash = await walletClient.writeContract({
    address: contract,
    abi: ABI,
    functionName: "attest",
    args: [params.strategyKey, params.score, params.digest],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const result = {
    mode: "live",
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    strategyKey: params.strategyKey,
    score: params.score,
    digest: params.digest,
    explorer: `https://testnet.bscscan.com/tx/${hash}`,
  };

  await fs.appendFile(logPath, JSON.stringify({ type: "attest", ts: new Date().toISOString(), ...result }) + "\n", "utf8");
  await appendTwakLog({ status: "attest_confirmed", txHash: hash, blockNumber: receipt.blockNumber.toString() });
  return result;
}

async function main() {
  const { target, score } = parseArgs(process.argv);
  if (!target || score === undefined || Number.isNaN(score)) {
    console.error("Usage: node attest.js --strategy <name> --score <0-100>");
    console.error("  ATTEST_MODE=simulate|live (default simulate)");
    process.exit(1);
  }
  if (score < 0 || score > 100 || !Number.isInteger(score)) {
    console.error("score must be integer 0–100");
    process.exit(1);
  }

  const logPath = defaultLogPath();
  const strategyKey = target.startsWith("@")
    ? await strategyKeyFromPath(target.slice(1))
    : await findStrategyKeyByName(logPath, target);

  if (!strategyKey) {
    console.error("Unknown strategy. Run registry scan first or pass --strategy @/path/to/STRATEGY.md");
    process.exit(1);
  }

  const digest = await readLastScanDigest(logPath);
  const result = await attest({ strategyKey, score, digest });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
