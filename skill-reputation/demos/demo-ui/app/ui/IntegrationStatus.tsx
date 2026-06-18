"use client";

import { useEffect, useState } from "react";

type Status = {
  environment?: string;
  backtests?: { count: number; best: { strategy: string; asset: string; sharpe: number } | null };
  twak?: {
    available: boolean;
    version?: string;
    note?: string;
    install?: string;
    portal?: string;
  };
  bnbAgent?: {
    registered: boolean;
    mode: string;
    agentId?: string | number | null;
    explorer?: string | null;
    gasFree?: boolean;
    registerCmd?: string;
  };
  liveOnDemo?: Record<string, boolean>;
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`statusPill ${ok ? "statusOk" : "statusPending"}`}>{label}</span>
  );
}

export function IntegrationStatus({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setError("Could not load integration status"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted integrationLoading">Loading integration status…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!data) return null;

  const live = data.liveOnDemo || {};

  if (compact) {
    return (
      <div className="integrationCompact">
        <StatusPill ok={!!live.backtestTable} label={`${data.backtests?.count ?? 0} backtests`} />
        <StatusPill ok={!!live.askDocs} label="Ask Docs" />
        <StatusPill ok={!!live.exportApi} label="Export API" />
        <StatusPill ok={!!data.twak?.available} label="TWAK CLI" />
        <StatusPill ok={!!data.bnbAgent?.registered} label="ERC-8004" />
      </div>
    );
  }

  return (
    <section className="integrationPanel">
      <div className="integrationHeader">
        <div>
          <h3 className="integrationTitle">Live integration status</h3>
          <p className="muted integrationSub">
            What works in this demo ({data.environment === "vercel" ? "Vercel" : "local"}) vs what you run in CLI
          </p>
        </div>
      </div>

      <div className="integrationGrid">
        <div className="integrationCard">
          <p className="integrationCardLabel">CoinMarketCap</p>
          <StatusPill ok={!!live.backtestTable} label={live.backtestTable ? "Live backtests loaded" : "No JSON"} />
          <p className="integrationCardDesc">
            {data.backtests?.count ?? 0} result files in repo. Best:{" "}
            {data.backtests?.best
              ? `${data.backtests.best.strategy}/${data.backtests.best.asset} Sharpe ${Number(data.backtests.best.sharpe).toFixed(2)}`
              : "run npm run strategy:all"}
          </p>
          <p className="integrationCardMeta">Works on demo: table, Ask Docs, export API</p>
        </div>

        <div className="integrationCard">
          <p className="integrationCardLabel">Trust Wallet (TWAK)</p>
          <StatusPill
            ok={!!data.twak?.available}
            label={data.twak?.available ? `CLI ${data.twak.version || "OK"}` : "CLI not on server"}
          />
          <p className="integrationCardDesc">{data.twak?.note}</p>
          <p className="integrationCardMeta">
            Local: <code>npm run twak:check</code> · enriches <code>cmcSignals.js</code> when{" "}
            <code>TWAK_ENABLED=1</code>
          </p>
        </div>

        <div className="integrationCard">
          <p className="integrationCardLabel">BNB Chain</p>
          <StatusPill
            ok={!!data.bnbAgent?.registered}
            label={data.bnbAgent?.registered ? "Agent registered" : `Mode: ${data.bnbAgent?.mode}`}
          />
          <p className="integrationCardDesc">
            ERC-8004 registration {data.bnbAgent?.gasFree ? "gas-free on testnet" : ""} via MegaFuel paymaster.
          </p>
          {data.bnbAgent?.explorer && (
            <a href={String(data.bnbAgent.explorer)} target="_blank" rel="noreferrer" className="integrationLink">
              View registration tx →
            </a>
          )}
          <p className="integrationCardMeta">
            Local: <code>{data.bnbAgent?.registerCmd || "npm run agent:register"}</code>
          </p>
        </div>
      </div>

      <div className="integrationDemoKey">
        <p className="integrationDemoKeyTitle">On this docs site (live now)</p>
        <ul className="integrationDemoList">
          <li>Ask Docs — Python engine reads your backtest JSON + npm scripts</li>
          <li>Backtest results table — committed live CMC data (Mar–Jun 2026)</li>
          <li>Export skills API — packages CMC zips when deployed with full repo</li>
          <li>Copy-paste agent prompts — For agents section</li>
        </ul>
        <p className="integrationDemoKeyTitle">Run locally (CLI)</p>
        <ul className="integrationDemoList">
          <li>TWAK token risk + price enrichment during backtests</li>
          <li>TWAK / viem attestation signing → BscScan testnet</li>
          <li>ERC-8004 agent registration via bnbagent SDK</li>
        </ul>
      </div>
    </section>
  );
}
