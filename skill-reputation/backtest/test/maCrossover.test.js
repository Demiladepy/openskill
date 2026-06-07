import assert from "node:assert/strict";
import test from "node:test";
import { runMaCrossover } from "../maCrossover.js";

function syntheticBars(n, start = 100) {
  const bars = [];
  for (let i = 0; i < n; i++) {
    const close = start + Math.sin(i / 3) * 5 + i * 0.1;
    bars.push({
      timestamp: new Date(Date.UTC(2024, 0, i + 1)).toISOString(),
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + i,
    });
  }
  return bars;
}

test("ma crossover produces spec with metrics", () => {
  const bars = syntheticBars(80);
  const { decisions, spec } = runMaCrossover(bars, { symbol: "BNB", convert: "USDT", fast: 5, slow: 15 });
  assert.equal(spec.type, "backtest_spec");
  assert.equal(spec.strategy, "ma-crossover");
  assert.ok(Array.isArray(spec.entries));
  assert.ok(Array.isArray(spec.exits));
  assert.ok(typeof spec.metrics.sharpeApprox === "number");
  assert.ok(decisions.every((d) => d.type === "backtest_decision"));
});
