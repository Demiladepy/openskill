#!/usr/bin/env node
/**
 * Greenfield memory layer stub — documents artifact pinning via @bnb-chain/mcp.
 * npm run greenfield:pin
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BNB_STACK } from "../src/lib/bnbStack.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const ARTIFACTS = [
  "backtest_results/regime_BTC.json",
  "backtest_results/regime_BTC_spec.json",
  "examples/cmc-strategy-skills.zip",
  "bnbagent/agent_state.json",
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const manifest = {
  layer: "memory",
  standard: "BNB Greenfield",
  status: "roadmap",
  bap692: true,
  note: "Run @bnb-chain/mcp Greenfield tools to upload these artifacts; store object URL in ERC-8004 metadata key memory_uri.",
  mcp_install: BNB_STACK.bnb_mcp,
  mcp_config: "bnb-mcp-config.json",
  docs: "https://docs.bnbchain.org/developer-kit/mcp/",
  artifacts: ARTIFACTS.map((rel) => ({
    path: rel,
    present: exists(rel),
    size_bytes: exists(rel) ? fs.statSync(path.join(ROOT, rel)).size : null,
  })),
  steps: [
    "Add bnb-mcp-config.json to Cursor MCP settings",
    "Configure PRIVATE_KEY and Greenfield credentials per BNB MCP docs",
    "Use Greenfield upload tools to pin backtest_results/regime_BTC.json",
    "Add metadata key memory_uri to agent via set_erc8004_agent_uri or re-register",
  ],
};

console.log(JSON.stringify(manifest, null, 2));

const missing = manifest.artifacts.filter((a) => !a.present);
if (missing.length) {
  console.error(`\n${missing.length} artifact(s) missing — run npm run strategy:all && npm run export:skills`);
  process.exitCode = 1;
}
