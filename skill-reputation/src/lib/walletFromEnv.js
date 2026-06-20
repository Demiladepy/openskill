/**
 * Resolve BSC testnet wallet from env — private key or Trust Wallet-style mnemonic.
 * Never log or return full secrets.
 */
import { bytesToHex } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

function accountFromMnemonic(mnemonic) {
  return mnemonicToAccount(mnemonic.trim());
}

export function resolvePrivateKeyFromEnv() {
  const raw =
    process.env.TWAK_AGENT_PRIVATE_KEY ||
    process.env.AGENT_PRIVATE_KEY ||
    process.env.ATTESTOR_PRIVATE_KEY;
  if (raw?.trim() && !raw.includes("your_")) {
    const pk = raw.trim();
    return pk.startsWith("0x") ? pk : `0x${pk}`;
  }

  const mnemonic = (process.env.AGENT_MNEMONIC || process.env.TWAK_MNEMONIC || "").trim();
  if (!mnemonic || mnemonic.includes("your_")) return null;

  const account = accountFromMnemonic(mnemonic);
  const hdKey = account.getHdKey?.();
  if (!hdKey?.privateKey) return null;
  return bytesToHex(hdKey.privateKey);
}

export function resolveWalletAddressFromEnv() {
  const mnemonic = (process.env.AGENT_MNEMONIC || process.env.TWAK_MNEMONIC || "").trim();
  if (mnemonic && !mnemonic.includes("your_")) {
    return accountFromMnemonic(mnemonic).address;
  }
  const pk = resolvePrivateKeyFromEnv();
  if (!pk) return null;
  return privateKeyToAccount(pk).address;
}
