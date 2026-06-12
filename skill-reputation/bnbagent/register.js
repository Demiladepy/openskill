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

const result = spawnSync(py, [script], {
  cwd: ROOT,
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
