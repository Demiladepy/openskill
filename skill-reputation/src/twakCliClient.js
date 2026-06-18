/**
 * Trust Wallet Agent Kit (TWAK) CLI bridge — @trustwallet/cli (`twak` command).
 * Track 2: market data + token risk enrichment + optional MCP (`twak serve`).
 * No trade execution — simulation only.
 */
import { execSync } from "node:child_process";

function twakEnabled() {
  if (process.env.TWAK_ENABLED === "0") return false;
  return process.env.TWAK_ENABLED === "1" || process.env.TWAK_ENABLED === "true";
}

export class TwakCliClient {
  constructor() {
    this.available = this.checkAvailable();
    this.version = this.available ? this.getVersion() : null;
  }

  checkAvailable() {
    if (!twakEnabled()) return false;
    try {
      execSync("twak --version", { stdio: "pipe", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  getVersion() {
    try {
      return execSync("twak --version", { encoding: "utf-8", stdio: "pipe" }).trim();
    } catch {
      return null;
    }
  }

  exec(args, timeoutMs = 15000) {
    if (!this.available) return null;
    try {
      const cmd = typeof args === "string" ? `twak ${args}` : `twak ${args.join(" ")}`;
      return execSync(cmd, { stdio: "pipe", timeout: timeoutMs, encoding: "utf-8" }).trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[twakCli] command failed: twak ${args}`, msg.slice(0, 120));
      return null;
    }
  }

  /** Live price via TWAK market data primitive */
  getPrice(symbol) {
    const raw = this.exec(`price ${symbol}`);
    if (!raw) return null;
    const priceMatch = raw.match(/\$[\d,]+(?:\.\d+)?/);
    return {
      raw,
      symbol: symbol.toUpperCase(),
      priceUsd: priceMatch ? priceMatch[0] : null,
      source: "twak-cli",
    };
  }

  /** Token risk screening — reduces strategy confidence when flagged */
  getTokenRisk(symbol) {
    for (const cmd of [`token risk ${symbol}`, `risk ${symbol}`, `security ${symbol}`]) {
      const raw = this.exec(cmd);
      if (raw) {
        return {
          raw,
          symbol: symbol.toUpperCase(),
          level: parseRiskLevel(raw),
          source: "twak-cli",
        };
      }
    }
    return null;
  }

  getMcpConfig() {
    return {
      mcpServers: {
        twak: { command: "twak", args: ["serve"] },
      },
      _note: "Add to Cursor MCP settings or claude_desktop_config.json",
    };
  }
}

/** Parse risk level from TWAK CLI text output */
export function parseRiskLevel(raw) {
  const lower = raw.toLowerCase();
  if (/high\s*risk|danger|unsafe|critical|scam/.test(lower)) return "high";
  if (/medium|moderate|caution|warning/.test(lower)) return "medium";
  if (/low\s*risk|safe|verified|ok/.test(lower)) return "low";
  return "unknown";
}

/** Adjust signal confidence based on TWAK risk (Track 2 guard — no trade execution) */
export function twakConfidenceAdjust(confidence, twakRisk) {
  if (!twakRisk?.level) return confidence;
  if (twakRisk.level === "high") return Math.max(0.1, confidence - 0.25);
  if (twakRisk.level === "medium") return Math.max(0.2, confidence - 0.12);
  return confidence;
}

let _singleton = null;

export function getTwakCli() {
  if (!_singleton) _singleton = new TwakCliClient();
  return _singleton;
}

export default TwakCliClient;
