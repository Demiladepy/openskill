#!/usr/bin/env node
import { validateCmcApiKey } from "../../src/cmcDataClient.js";
import { loadProjectEnv } from "../../src/lib/loadEnv.js";
import { scanStrategyRegistry } from "../../src/skillRegistry.js";

loadProjectEnv();

async function main() {
  const validation = await validateCmcApiKey({ required: true });
  console.log(JSON.stringify({ cmcValidation: validation }, null, 2));
  const registry = await scanStrategyRegistry();
  console.log(JSON.stringify({ registry: { digest: registry.digest, count: registry.count } }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
