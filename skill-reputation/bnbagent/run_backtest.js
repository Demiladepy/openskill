#!/usr/bin/env node
/**
 * CLI backtest runner for ERC-8183 job delivery.
 * Usage: node bnbagent/run_backtest.js --strategy momentum --from 2026-06-01 --to 2026-06-21 [--output json|job-format]
 */
import { loadAgentEnv } from "./lib/loadAgentEnv.js";
import { runBacktestJob } from "../src/backtestEngine.js";

loadAgentEnv();

function parseArgs(argv) {
  const opts = { strategy: "momentum", from: "2026-06-01", to: "2026-06-21", output: "json", symbol: "BNB" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--strategy" && argv[i + 1]) opts.strategy = argv[++i];
    else if (argv[i] === "--from" && argv[i + 1]) opts.from = argv[++i];
    else if (argv[i] === "--to" && argv[i + 1]) opts.to = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) opts.output = argv[++i];
    else if (argv[i] === "--symbol" && argv[i + 1]) opts.symbol = argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  const result = await runBacktestJob(opts.strategy, opts.from, opts.to, { symbol: opts.symbol });
  const out = opts.output === "job-format" ? result.jobResult : result;
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
