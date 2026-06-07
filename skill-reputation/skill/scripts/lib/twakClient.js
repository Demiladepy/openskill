import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { keccak256, stringToBytes } from "viem";
import { getBehaviorLogPath } from "../../../src/lib/logPath.js";

export function getTwakSessionPath() {
  return process.env.TWAK_SESSION_PATH || path.join(os.homedir(), ".twak", "session.json");
}

export async function loadTwakSession() {
  const sessionPath = getTwakSessionPath();
  try {
    const raw = await fs.readFile(sessionPath, "utf8");
    return { sessionPath, session: JSON.parse(raw) };
  } catch {
    return { sessionPath, session: null };
  }
}

export async function saveTwakSession(session) {
  const sessionPath = getTwakSessionPath();
  await fs.mkdir(path.dirname(sessionPath), { recursive: true });
  const payload = { ...session, updatedAt: new Date().toISOString() };
  await fs.writeFile(sessionPath, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return { sessionPath, session: payload };
}

/**
 * TWAK fingerprint for manifest (no secrets).
 * @param {Record<string, unknown> | null} session
 */
export function twakConfigFingerprint(session) {
  if (!session) return null;
  return keccak256(
    stringToBytes(
      JSON.stringify({
        address: session.address,
        chainId: session.chainId,
        mode: session.mode,
        autonomous: session.autonomous === true,
      })
    )
  );
}

export function getAttestMode() {
  const mode = (process.env.ATTEST_MODE || process.env.TWAK_ATTEST_MODE || "simulate").toLowerCase();
  return mode === "live" ? "live" : "simulate";
}

/**
 * Initialize Trust Wallet Agent Kit in autonomous mode.
 * Tries @trustwallet/agent-kit, falls back to session file + viem.
 */
export async function initTwakAutonomous() {
  const { session, sessionPath } = await loadTwakSession();
  const mode = getAttestMode();
  const unlockPassphrase = process.env.TWAK_UNLOCK_PASSPHRASE || process.env.TWAK_PASSWORD;

  let kit = null;
  try {
    kit = await import("@trustwallet/agent-kit");
  } catch {
    kit = null;
  }

  if (kit?.TrustWalletAgentKit || kit?.default) {
    const AgentKit = kit.TrustWalletAgentKit || kit.default;
    const instance = new AgentKit({
      mode: "autonomous",
      sessionPath,
      unlockPassphrase,
    });
    await instance.unlock?.();
    return {
      provider: "twak-agent-kit",
      mode,
      sessionPath,
      signer: instance,
      address: await instance.getAddress?.(),
    };
  }

  const privateKey = process.env.TWAK_AGENT_PRIVATE_KEY || process.env.ATTESTOR_PRIVATE_KEY;
  const address = session?.address;
  if (!privateKey && !address) {
    if (mode === "simulate") {
      await appendTwakLog({
        status: "twak_simulate_stub",
        mode,
        note: "No TWAK session — simulate-only attestation",
      });
      return {
        provider: "twak-simulate-stub",
        mode,
        sessionPath,
        session: null,
        address: "0x0000000000000000000000000000000000000000",
      };
    }
    throw new Error("TWAK not configured. Run: node skill/scripts/twakSetup.js");
  }

  return {
    provider: "twak-session-fallback",
    mode,
    sessionPath,
    session,
    privateKey: privateKey ? (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) : undefined,
    address,
  };
}

export async function appendTwakLog(entry) {
  const logPath = getBehaviorLogPath();
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, JSON.stringify({ type: "twak_session", ts: new Date().toISOString(), ...entry }) + "\n", "utf8");
  return logPath;
}
