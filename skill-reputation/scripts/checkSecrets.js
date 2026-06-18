#!/usr/bin/env node
/**
 * Scan tracked + staged files for accidental secrets before push.
 * npm run check:secrets
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");

const ALLOW_PLACEHOLDER = /your_|_here|optional|example|placeholder|0x_your|local-dev-only/i;

const PATTERNS = [
  { name: "CMC API key (uuid)", re: /CMC_API_KEY\s*=\s*['"]?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i },
  { name: "Private key (hex)", re: /(?:AGENT_PRIVATE_KEY|TWAK_AGENT_PRIVATE_KEY|PRIVATE_KEY)\s*=\s*['"]?0x[a-fA-F0-9]{64}/ },
  { name: "Private key (64 hex, no 0x)", re: /(?:AGENT_PRIVATE_KEY|TWAK_AGENT_PRIVATE_KEY|PRIVATE_KEY)\s*=\s*['"]?[a-fA-F0-9]{64}\b/ },
  { name: "Bearer token", re: /Bearer\s+[a-zA-Z0-9._-]{20,}/ },
  { name: "AWS key", re: /AKIA[0-9A-Z]{16}/ },
];

const SKIP_PATH = [
  /node_modules/,
  /\.git\//,
  /scripts\/checkSecrets\.js$/,
  /\.env\.example$/,
  /\.env\.agent\.example$/,
  /package-lock\.json$/,
];

function listFiles() {
  const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  let staged = [];
  try {
    staged = execSync("git diff --cached --name-only", { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    /* not a git repo */
  }
  return [...new Set([...tracked, ...staged])].map((f) => path.join(ROOT, f));
}

function shouldSkip(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel === ".env" || rel.endsWith("/.env") || rel.includes(".env.agent")) return true;
  return SKIP_PATH.some((p) => p.test(rel));
}

const hits = [];
for (const file of listFiles()) {
  if (shouldSkip(file) || !fs.existsSync(file)) continue;
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.length > 2_000_000) continue;
  for (const { name, re } of PATTERNS) {
    const m = text.match(re);
    if (m && !ALLOW_PLACEHOLDER.test(m[0])) {
      hits.push({ file: path.relative(ROOT, file), kind: name, snippet: m[0].slice(0, 48) + "…" });
    }
  }
}

if (hits.length) {
  console.error("Secret scan FAILED — do not push:\n");
  for (const h of hits) {
    console.error(`  [${h.kind}] ${h.file}`);
  }
  console.error("\nRemove secrets, rotate keys if exposed, ensure .env is gitignored.");
  process.exit(1);
}

console.log("Secret scan OK — no API keys or private keys in tracked/staged files.");
