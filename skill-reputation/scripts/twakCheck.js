#!/usr/bin/env node
/** Verify TWAK CLI installation and print sample price output. */
import { getTwakCli } from "../src/twakCliClient.js";

const twak = getTwakCli();

if (!twak.available) {
  console.log("TWAK CLI not available.");
  console.log("Install: npm install -g @trustwallet/cli");
  console.log("Or: curl -fsSL https://agent-kit.trustwallet.com/install.sh | bash");
  console.log("Setup: twak setup  (credentials: https://portal.trustwallet.com/dashboard/apps)");
  console.log("Enable: TWAK_ENABLED=1 in .env");
  process.exit(1);
}

console.log(`TWAK OK — ${twak.version || "unknown version"}`);
for (const sym of ["BTC", "ETH"]) {
  const p = twak.getPrice(sym);
  console.log(p ? `${sym}: ${p.raw}` : `${sym}: (no output)`);
}
console.log("\nMCP config:", JSON.stringify(twak.getMcpConfig(), null, 2));
