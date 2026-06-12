import { round } from "./sharpe.js";

/**
 * Volatility-based position sizing: size = riskBudget / (volatility * price).
 * @param {{ price: number, volatility: number, riskBudgetPct?: number, capital?: number }} params
 */
export function volatilityScaledSize(params) {
  const { price, volatility, riskBudgetPct = 1, capital = 10000 } = params;
  if (!price || !volatility || volatility <= 0) return 0;
  const riskBudget = capital * (riskBudgetPct / 100);
  const units = riskBudget / (volatility * price);
  return round(units, 6);
}

/**
 * Realized volatility (std of returns) from closes.
 * @param {number[]} closes
 * @param {number} lookback
 */
export function realizedVolatility(closes, lookback = 20) {
  if (closes.length < lookback + 1) return 0;
  const slice = closes.slice(-lookback - 1);
  const returns = [];
  for (let i = 1; i < slice.length; i++) {
    returns.push((slice[i] - slice[i - 1]) / slice[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / Math.max(returns.length - 1, 1);
  return round(Math.sqrt(variance));
}
