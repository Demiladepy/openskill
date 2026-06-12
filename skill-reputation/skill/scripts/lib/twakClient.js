import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { keccak256, stringToBytes } from "viem";
import { getBehaviorLogPath } from "../../../src/lib/logPath.js";

/** @trustwallet/agent-kit is not published on npm yet (checked 2026-06). */
export const TWAK_SDK_AVAILABLE = false;

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

export function resolveAttestPrivateKey() {
  const raw =
    process.env.TWAK_AGENT_PRIVATE_KEY ||
    process.env.AGENT_PRIVATE_KEY ||
    process.env.ATTESTOR_PRIVATE_KEY;
  if (!raw) return null;
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

export function getAttestMode() {
  const explicit = (process.env.ATTEST_MODE || process.env.TWAK_ATTEST_MODE || "").toLowerCase();
  if (explicit === "live") return "live";
  if (explicit === "simulate") return "simulate";
  return resolveAttestPrivateKey() ? "live" : "simulate";
}

/**
 * Initialize Trust Wallet Agent Kit in autonomous mode.
 * Tries @trustwallet/agent-kit, falls back to AGENT_PRIVATE_KEY + viem (TWAK self-custody model).
 */
export async function initTwakAutonomous() {
  const { session, sessionPath } = await loadTwakSession();
  const mode = getAttestMode();
  const unlockPassphrase = process.env.TWAK_UNLOCK_PASSPHRASE || process.env.TWAK_PASSWORD;

  if (TWAK_SDK_AVAILABLE) {
    try {
      const kit = await import("@trustwallet/agent-kit");
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
    } catch {
      /* fall through to self-custody bridge */
    }
  }

  const privateKey = resolveAttestPrivateKey();
  const address = session?.address;

  if (!privateKey && !address) {
    if (mode === "simulate") {
      await appendTwakLog({
        status: "twak_simulate_stub",
        mode,
        note: "No AGENT_PRIVATE_KEY — simulate-only attestation (CI/demo)",
      });
      return {
        provider: "twak-simulate-stub",
        mode,
        sessionPath,
        session: null,
        address: "0x0000000000000000000000000000000000000000",
      };
    }
    throw new Error(
      "TWAK live mode requires AGENT_PRIVATE_KEY or TWAK_AGENT_PRIVATE_KEY. Run: npm run twak:setup"
    );
  }

  return {
    provider: "twak-self-custody-viem",
    mode,
    sessionPath,
    session,
    privateKey: privateKey || undefined,
    address,
    note: "TWAK-compatible local signing via viem until @trustwallet/agent-kit ships",
  };
}

export async function appendTwakLog(entry) {
  const logPath = getBehaviorLogPath();
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, JSON.stringify({ type: "twak_session", ts: new Date().toISOString(), ...entry }) + "\n", "utf8");
  return logPath;
}
