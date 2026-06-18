#!/usr/bin/env node
/** List CMC MCP tools: npm run cmc:mcp */
import { listMcpTools, mcpEnabled, MCP_URL } from "../src/cmcMcpClient.js";
import { loadProjectEnv } from "../src/lib/loadEnv.js";

loadProjectEnv();

async function main() {
  console.log(`CMC MCP URL: ${MCP_URL}`);
  console.log(`MCP_ENABLED: ${process.env.MCP_ENABLED === "1" ? "yes" : "no"}`);
  console.log(`CMC_API_KEY: ${process.env.CMC_API_KEY ? "set" : "missing"}\n`);

  if (!mcpEnabled()) {
    console.log("Set MCP_ENABLED=1 and CMC_API_KEY to list MCP tools.");
    console.log("\nDocumented CMC MCP tools (Agent Hub):");
    const documented = [
      "get_crypto_technical_analysis",
      "get_crypto_quotes_latest",
      "get_global_metrics_latest",
      "get_fear_and_greed_index",
      "get_crypto_news",
      "get_derivatives_data",
      "get_onchain_metrics",
      "get_social_sentiment",
    ];
    documented.forEach((t) => console.log(`  - ${t}`));
    console.log("\nLimitation: MCP technicals are point-in-time; backtests use REST + Fear & Greed history.");
    return;
  }

  const tools = await listMcpTools();
  console.log(JSON.stringify({ tool_count: tools.length, tools }, null, 2));
  console.error("\nLimitation: MCP technicals are point-in-time only for backtests.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
