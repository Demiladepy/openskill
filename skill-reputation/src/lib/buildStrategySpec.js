/**
 * PositionSight-style strategy spec for judges and marketplace export.
 */
export function buildStrategySpec({ strategySlug, strategyInstance, market, result, attestation, opts = {} }) {
  const signals = result.signals || strategyInstance.lastBacktest?.signals || [];
  const replay = result.replay || [];
  const metrics = result.metrics || {};
  const risk = strategyInstance.checkRisk?.(metrics) || { ok: true };

  const signalCounts = { buy: 0, sell: 0, hold: 0 };
  for (const s of signals) {
    const k = s.signal === "buy" || s.signal === "sell" ? s.signal : "hold";
    signalCounts[k] = (signalCounts[k] || 0) + 1;
  }

  const equityCurve = result.equityCurve || [];
  const trades = replay.filter((r) => r.action === "entry" || r.action === "exit");

  return {
    schema: "cmc-strategy-forge/1.0",
    generated_at: new Date().toISOString(),
    identity: {
      slug: strategySlug,
      name: strategyInstance.name,
      version: strategyInstance.version,
      risk_profile: strategyInstance.riskProfile,
    },
    market: {
      symbol: opts.symbol || market.meta?.symbol,
      convert: opts.convert || market.meta?.convert || "USDT",
      data_source: market.meta?.dataSource,
      cmc_signal_source: market.cmcSignals?.source,
      mock_warning: market.meta?.mockWarning || null,
      data_provenance: market.meta?.dataProvenance || null,
    },
    period: result.range || { startDate: opts.from, endDate: opts.to },
    cmc_integration: {
      rest_endpoints: result.cmcEndpointsUsed || [],
      mcp_enabled: process.env.MCP_ENABLED === "1",
      mcp_limitation:
        "MCP technicals are point-in-time only; backtests use REST percent changes + Fear & Greed history.",
      mcp_tools: strategyInstance.exportSpec?.()?.cmc_requirements?.mcp_tools || [],
    },
    performance: {
      total_return_pct: metrics.totalReturnPct,
      sharpe_ratio: metrics.sharpeRatio,
      max_drawdown_pct: metrics.maxDrawdownPct,
      win_rate_pct: metrics.winRatePct,
      trades: metrics.trades,
      profit_factor: metrics.profitFactor,
      avg_trade_duration_days: metrics.avgTradeDurationDays,
    },
    risk_assessment: {
      max_drawdown_limit_pct: strategyInstance.params?.maxDrawdownPct,
      within_limit: risk.ok,
      reason: risk.reason || null,
    },
    signals_summary: signalCounts,
    rules_plain_english: result.rulesPlainEnglish || [],
    params: strategyInstance.params,
    entry_rules: strategyInstance.exportSpec?.()?.entry_rules || [],
    exit_rules: strategyInstance.exportSpec?.()?.exit_rules || [],
    attestation: attestation || null,
    equity_curve_tail: equityCurve.slice(-15),
    trade_log: trades.slice(0, 40),
    simulation_only: true,
    live_trading: false,
  };
}
