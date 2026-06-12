import { round } from "./sharpe.js";

/**
 * Peak-to-trough maximum drawdown (%) from an equity curve.
 * @param {number[]} equityCurve
 */
export function maxDrawdownFromEquity(equityCurve) {
  if (!equityCurve?.length) return 0;
  let peak = equityCurve[0];
  let maxDd = 0;
  for (const mark of equityCurve) {
    peak = Math.max(peak, mark);
    const dd = peak > 0 ? ((peak - mark) / peak) * 100 : 0;
    maxDd = Math.max(maxDd, dd);
  }
  return round(maxDd);
}

/**
 * Max drawdown from trade return series (reconstructs equity from cumulative returns).
 * @param {number[]} tradeReturns
 * @param {number} initialCapital
 */
export function maxDrawdownFromReturns(tradeReturns, initialCapital = 1) {
  let equity = initialCapital;
  const curve = [equity];
  for (const r of tradeReturns) {
    equity *= 1 + r;
    curve.push(equity);
  }
  return maxDrawdownFromEquity(curve);
}
