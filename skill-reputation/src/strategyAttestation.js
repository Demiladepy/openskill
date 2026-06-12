import fs from "node:fs/promises";
import { getBehaviorLogPath } from "./lib/logPath.js";
import { computeStrategyKey } from "./lib/strategyKey.js";
import { getAttestMode } from "../skill/scripts/lib/twakClient.js";
import {
  attestStrategyDigest,
  computeStrategyDigest,
} from "../skill/scripts/lib/attestationSigning.js";
import { keccak256, stringToBytes } from "viem";

function simulateAttestation(strategyDigest, strategyName) {
  const fakeTx = keccak256(stringToBytes(`${strategyDigest}:${strategyName}:simulate`));
  return {
    digest: strategyDigest,
    txHash: fakeTx,
    mode: "simulate",
    method: "simulate (set AGENT_PRIVATE_KEY + ATTEST_MODE=live for BSC testnet tx)",
    explorer: null,
  };
}

async function findStrategyKey(strategyName, logPath) {
  const raw = await fs.readFile(logPath, "utf8").catch(() => "");
  for (const line of raw.trim().split("\n").filter(Boolean).reverse()) {
    try {
      const row = JSON.parse(line);
      if (row.type !== "scan") continue;
      const list = row.snapshot?.strategies || [];
      const match = list.find(
        (s) =>
          s.kind === "implementation" &&
          String(s.name || "").toLowerCase().includes(strategyName.toLowerCase())
      );
      if (match?.strategyKey) return match.strategyKey;
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * Attest a backtest result — TWAK self-custody signing + BSC testnet tx.
 * @param {{ strategy: string, result: object, strategyInstance?: object, score?: number }} opts
 */
export async function attestStrategyResult(opts) {
  const { strategy, result, strategyInstance, score = 85 } = opts;
  const digestPayload = {
    strategy,
    range: result.range,
    metrics: result.metrics,
    rules: result.rulesPlainEnglish,
    cmcSignalSource: result.cmcSignalSource,
    simulation_only: true,
  };
  const strategyDigest = computeStrategyDigest(digestPayload);
  const mode = getAttestMode();

  if (mode === "simulate") {
    return simulateAttestation(strategyDigest, strategy);
  }

  const logPath = getBehaviorLogPath();
  let strategyKey = null;
  if (strategyInstance?.exportSpec) {
    const spec = strategyInstance.exportSpec();
    strategyKey = computeStrategyKey(JSON.stringify(spec), spec.name);
  }
  if (!strategyKey) strategyKey = await findStrategyKey(strategy, logPath);

  const attestation = await attestStrategyDigest({
    strategyDigest,
    strategyName: strategy,
    score,
    strategyKey,
  });

  await fs.appendFile(
    logPath,
    JSON.stringify({ type: "attest", ts: new Date().toISOString(), ...attestation, strategy }) + "\n",
    "utf8"
  );

  return attestation;
}
