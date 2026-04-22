#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  stringToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { parseFrontmatter } from "./lib/parseFrontmatter.js";
import { computeSkillKey, normalizeName } from "./lib/skillKey.js";

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
  let skill;
  let score;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--skill" && argv[i + 1]) skill = argv[++i];
    else if (argv[i] === "--score" && argv[i + 1]) score = Number(argv[++i]);
  }
  return { skill, score };
}

function defaultLogPath() {
  if (process.env.SKILL_REPUTATION_LOG) return process.env.SKILL_REPUTATION_LOG;
  const base =
    process.env.XDG_CONFIG_HOME ||
    (process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(path.homedir(), "AppData", "Roaming"), "skill-reputation")
      : path.join(path.homedir(), ".config", "skill-reputation"));
  return path.join(base, "behavior-log.jsonl");
}

async function readLastScanDigest(logPath) {
  const raw = await fs.readFile(logPath, "utf8").catch(() => "");
  const lines = raw.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(lines[i]);
      if (row.type === "scan" && row.digest) return /** @type {`0x${string}`} */ (row.digest);
    } catch {
      /* skip */
    }
  }
  return keccak256(stringToBytes("empty-log"));
}

async function findSkillKeyByName(logPath, targetName) {
  const norm = normalizeName(targetName);
  const raw = await fs.readFile(logPath, "utf8").catch(() => "");
  const lines = raw.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(lines[i]);
      if (row.type !== "scan" || !row.snapshot?.skills) continue;
      for (const s of row.snapshot.skills) {
        if (normalizeName(s.name) === norm || s.normalizedName === norm) {
          return /** @type {`0x${string}`} */ (s.skillKey);
        }
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

async function skillKeyFromPath(skillMdPath) {
  const raw = await fs.readFile(skillMdPath, "utf8");
  const { front } = parseFrontmatter(raw);
  const name = front.name;
  if (!name) throw new Error("SKILL.md missing name in frontmatter");
  return computeSkillKey(raw, name);
}

async function main() {
  const { skill, score } = parseArgs(process.argv);
  if (!skill || score === undefined || Number.isNaN(score)) {
    console.error("Usage: node attest.js --skill <name> --score <0-100>");
    console.error("  or: node attest.js --skill @path/to/SKILL.md --score <0-100>");
    process.exit(1);
  }
  if (score < 0 || score > 100 || !Number.isInteger(score)) {
    console.error("score must be integer 0–100");
    process.exit(1);
  }

  const rpc = process.env.BASE_SEPOLIA_RPC_URL;
  const pk = process.env.ATTESTOR_PRIVATE_KEY;
  const contract = process.env.SKILL_REPUTATION_CONTRACT;
  if (!rpc || !pk || !contract) {
    console.error("Set BASE_SEPOLIA_RPC_URL, ATTESTOR_PRIVATE_KEY, SKILL_REPUTATION_CONTRACT");
    process.exit(1);
  }

  const logPath = defaultLogPath();
  let skillKey =
    skill.startsWith("@") ? await skillKeyFromPath(skill.slice(1)) : await findSkillKeyByName(logPath, skill);
  if (!skillKey) {
    console.error("Unknown skill. Run scanner.js first or pass --skill @/abs/path/SKILL.md");
    process.exit(1);
  }

  const digest = await readLastScanDigest(logPath);
  const account = privateKeyToAccount(
    /** @type {`0x${string}`} */ (pk.startsWith("0x") ? pk : `0x${pk}`)
  );

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpc),
  });

  const hash = await walletClient.writeContract({
    address: /** @type {`0x${string}`} */ (contract),
    abi: ABI,
    functionName: "attest",
    args: [skillKey, score, digest],
  });

  console.log(JSON.stringify({ txHash: hash, skillKey, score, digest }, null, 2));
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("confirmed in block", receipt.blockNumber.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
