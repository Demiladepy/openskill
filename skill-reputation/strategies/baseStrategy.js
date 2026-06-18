/**
 * Base interface for all CMC Strategy Forge strategies (Track 2 — simulation only).
 */
import { twakConfidenceAdjust } from "../src/twakCliClient.js";

export class BaseStrategy {
  /**
   * @param {{ name: string, version?: string, riskProfile?: string, params?: Record<string, unknown> }} config
   */
  constructor(config) {
    this.name = config.name;
    this.version = config.version || "1.0.0";
    this.riskProfile = config.riskProfile || "moderate";
    this.params = config.params || {};
    this.lastBacktest = null;
  }

  /** @param {Record<string, unknown>} marketData */
  generateSignals(_marketData) {
    throw new Error(`${this.name}: generateSignals() not implemented`);
  }

  /** @param {unknown} historicalData @param {string} startDate @param {string} endDate */
  backtest(_historicalData, _startDate, _endDate) {
    throw new Error(`${this.name}: backtest() not implemented`);
  }

  exportSpec() {
    throw new Error(`${this.name}: exportSpec() not implemented`);
  }

  validateParams() {
    const maxDrawdown = Number(this.params.maxDrawdownPct ?? 25);
    if (maxDrawdown <= 0 || maxDrawdown > 100) {
      throw new Error("maxDrawdownPct must be between 0 and 100");
    }
    const positionSize = Number(this.params.positionSizePct ?? 100);
    if (positionSize <= 0 || positionSize > 100) {
      throw new Error("positionSizePct must be between 0 and 100");
    }
    return true;
  }

  /** TWAK token risk guard — reduces confidence when TWAK flags high risk */
  applyTwakRiskAdjust(confidence, marketData) {
    const risk = marketData?.cmcSignals?.twak?.risk || marketData?.cmcSignals?.twak?.riskScore;
    return twakConfidenceAdjust(confidence, risk);
  }

  /** @param {{ maxDrawdownPct?: number }} metrics */
  checkRisk(metrics) {
    const limit = Number(this.params.maxDrawdownPct ?? 25);
    const dd = Number(metrics?.maxDrawdownPct ?? 0);
    if (dd > limit) {
      return { ok: false, reason: `Max drawdown ${dd}% exceeds limit ${limit}%` };
    }
    return { ok: true };
  }

  baseSpec() {
    return {
      name: this.name,
      version: this.version,
      risk_profile: this.riskProfile,
      track: "BNB Hackathon Track 2 — Strategy Skills",
      data_source: "CoinMarketCap Data API only",
      live_trading: false,
      simulation_only: true,
      params: this.params,
      backtest_performance: this.lastBacktest?.metrics || null,
      rules_plain_english: this.lastBacktest?.rulesPlainEnglish || [],
    };
  }
}

export function assertStrategyInterface(strategy) {
  for (const method of ["generateSignals", "backtest", "exportSpec"]) {
    if (typeof strategy[method] !== "function") {
      throw new Error(`Strategy missing method: ${method}`);
    }
  }
  strategy.validateParams?.();
  return true;
}
