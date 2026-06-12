/**
 * Annualized Sharpe ratio from per-trade or daily returns.
 * @param {number[]} returns
 * @param {number} periodsPerYear
 */
export function sharpeFromReturns(returns, periodsPerYear = 252) {
  if (!returns?.length || returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return round((mean / std) * Math.sqrt(periodsPerYear));
}

export function round(n, digits = 4) {
  return Number(Number(n).toFixed(digits));
}
