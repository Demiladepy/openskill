#!/usr/bin/env node
/** Verify CMC signals: node scripts/cmcSignalsCli.js BTC */
import { getSignals } from "../src/cmcSignals.js";
import { listMcpTools, mcpEnabled } from "../src/cmcMcpClient.js";
import { loadProjectEnv } from "../src/lib/loadEnv.js";

loadProjectEnv();

const symbol = process.argv[2] || "BTC";

async function main() {
  const signals = await getSignals(symbol);
  console.log(JSON.stringify(signals, null, 2));

  if (mcpEnabled()) {
    try {
      const tools = await listMcpTools();
      console.error(`\nMCP connected — ${tools.length} tools available`);
    } catch (err) {
      console.error("\nMCP tools list failed:", err instanceof Error ? err.message : err);
    }
  } else {
    console.error("\nMCP disabled — set MCP_ENABLED=1 to use CMC Agent Hub MCP tools");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
