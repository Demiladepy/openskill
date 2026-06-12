#!/usr/bin/env node
/**
 * ERC-8004 agent registration entry point.
 * Delegates to register_agent.py (bnbagent SDK) with simulate fallback.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAgentEnv } from "./lib/loadAgentEnv.js";

loadAgentEnv();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const py = process.env.PYTHON || "python";
const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "register_agent.py");

const args = [script];
if (process.env.AGENT_SIMULATE !== "1" && process.argv.includes("--live")) {
  args.push("--live");
} else if (process.env.AGENT_SIMULATE !== "1" && (process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY)) {
  args.push("--live");
}

const result = spawnSync(py, args, {
  cwd: ROOT,
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
