import test from "node:test";
import assert from "node:assert/strict";
import { sharpeFromReturns } from "../scripts/quant/sharpe.js";
import { maxDrawdownFromEquity } from "../scripts/quant/maxdd.js";
import { volatilityScaledSize } from "../scripts/quant/volScaling.js";
import { computeMetrics } from "../scripts/quant/metrics.js";
import { runStrategy } from "../scripts/strategyRunner.js";

test("sharpeFromReturns handles flat returns", () => {
  assert.equal(sharpeFromReturns([0, 0, 0]), 0);
});

test("maxDrawdownFromEquity finds peak-to-trough", () => {
  assert.equal(maxDrawdownFromEquity([100, 120, 90, 110]), 25);
});

test("volatilityScaledSize scales by risk budget", () => {
  const units = volatilityScaledSize({ price: 100, volatility: 0.02, riskBudgetPct: 1, capital: 10000 });
  assert.ok(units > 0);
});

test("computeMetrics reads embedded metrics", () => {
  const m = computeMetrics({
    metrics: { totalReturnPct: 5, sharpeRatio: 1.2, maxDrawdownPct: 3, winRatePct: 60, trades: 2 },
    equityCurve: [10000, 10500],
  });
  assert.equal(m.sharpeRatio, 1.2);
  assert.equal(m.trades, 2);
});

test("runStrategy momentum with mock data", async () => {
  process.env.CMC_USE_MOCK = "1";
  const result = await runStrategy("momentum", "2026-06-01", "2026-06-21");
  assert.ok(result.strategy);
  assert.ok(result.metrics);
  assert.ok(Array.isArray(result.equityCurve));
});
