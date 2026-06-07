import path from "node:path";
import os from "node:os";

/** @returns {string} JSONL path shared with scanner + backtest */
export function getBehaviorLogPath() {
  if (process.env.CMC_STRATEGY_VAULT_LOG) return process.env.CMC_STRATEGY_VAULT_LOG;
  if (process.env.SKILL_REPUTATION_LOG) return process.env.SKILL_REPUTATION_LOG;
  const base =
    process.env.XDG_CONFIG_HOME ||
    (process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "cmc-strategy-vault")
      : path.join(os.homedir(), ".config", "cmc-strategy-vault"));
  return path.join(base, "behavior-log.jsonl");
}
