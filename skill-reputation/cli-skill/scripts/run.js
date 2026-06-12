#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { runStrategy } from "./strategyRunner.js";
import { computeMetrics } from "./quant/metrics.js";
import { loadProjectEnv } from "../../src/lib/loadEnv.js";

loadProjectEnv();

const program = new Command();
program.name("cmc-quant-strategy-pack").description("CMC CLI quant strategy backtests (simulation only)");

program
  .command("run")
  .description("Run a strategy backtest")
  .requiredOption("--strategy <name>", "momentum, sentiment, or regime")
  .option("--from <date>", "start date YYYY-MM-DD", "2026-06-01")
  .option("--to <date>", "end date YYYY-MM-DD", "2026-06-21")
  .option("--symbol <symbol>", "base asset symbol", "BNB")
  .option("--output <format>", "json or csv", "json")
  .action(async (cmd) => {
    const result = await runStrategy(cmd.strategy, cmd.from, cmd.to, { symbol: cmd.symbol });
    if (cmd.output === "csv") {
      console.log(result.toCSV());
      return;
    }
    const { toCSV, ...json } = result;
    console.log(JSON.stringify(json, null, 2));
  });

program
  .command("metrics")
  .description("Compute quant metrics on a backtest result file")
  .requiredOption("--file <path>", "backtest JSON file")
  .action(async (cmd) => {
    const filePath = path.resolve(cmd.file);
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw.replace(/^\uFEFF/, ""));
    const metrics = computeMetrics(data);
    console.table(metrics);
  });

if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
