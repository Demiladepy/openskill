"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient, http, parseAbi, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

const contractAbi = parseAbi([
  "event Attested(address indexed attestor, bytes32 indexed skillKey, uint8 score, bytes32 digest, uint256 timestamp)",
]);

type Row = {
  attestor: Hex;
  skillKey: Hex;
  score: number;
  digest: Hex;
  timestamp: bigint;
  blockNumber: bigint;
  txHash: Hex;
};

function env(name: string): string | undefined {
  return process.env[name];
}

export function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const rpc = env("NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL");
    const contract = (env("NEXT_PUBLIC_SKILL_REPUTATION_CONTRACT") ||
      env("NEXT_PUBLIC_CONTRACT_ADDRESS")) as Hex | undefined;
    if (!rpc || !contract) {
      setError(
        "Set NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL and NEXT_PUBLIC_SKILL_REPUTATION_CONTRACT (or NEXT_PUBLIC_CONTRACT_ADDRESS) in .env.local"
      );
      setLoading(false);
      return;
    }

    const fromBlockEnv = env("NEXT_PUBLIC_FROM_BLOCK");
    try {
      const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
      const latest = await client.getBlockNumber();
      const span = 4000n;
      let fromBlock = latest > span ? latest - span : 0n;
      if (fromBlockEnv && /^\d+$/.test(fromBlockEnv)) {
        fromBlock = BigInt(fromBlockEnv);
      }

      const events = await client.getContractEvents({
        address: contract,
        abi: contractAbi,
        eventName: "Attested",
        fromBlock,
        toBlock: latest,
      });

      const mapped: Row[] = [];
      for (const ev of events) {
        if (ev.blockNumber == null || ev.transactionHash == null) continue;
        const a = ev.args;
        if (!a?.attestor || !a.skillKey || a.digest == null || a.timestamp == null) continue;
        mapped.push({
          attestor: a.attestor,
          skillKey: a.skillKey,
          score: Number(a.score),
          digest: a.digest,
          timestamp: a.timestamp,
          blockNumber: ev.blockNumber,
          txHash: ev.transactionHash,
        });
      }
      mapped.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));
      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chain data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="muted">Loading chain events…</p>;
  if (error) return <p className="error">{error}</p>;
  if (rows.length === 0) {
    return (
      <p className="muted">
        No events in the queried window. Deploy the contract, run an attestation, or lower{" "}
        <span className="mono">NEXT_PUBLIC_FROM_BLOCK</span>.
      </p>
    );
  }

  return (
    <>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        {rows.length} event{rows.length === 1 ? "" : "s"} (newest first)
      </p>
      <table>
        <thead>
          <tr>
            <th>Attestor</th>
            <th>skillKey</th>
            <th>Score</th>
            <th>Block</th>
            <th>Tx</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.txHash}-${r.skillKey}-${r.timestamp}`}>
              <td className="mono">{r.attestor}</td>
              <td className="mono">{r.skillKey}</td>
              <td>{r.score}</td>
              <td className="mono">{r.blockNumber.toString()}</td>
              <td>
                <a
                  href={`https://sepolia.basescan.org/tx/${r.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                >
                  view
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
