"use client";

const SPONSORS = [
  {
    id: "cmc",
    name: "CoinMarketCap",
    prize: "Data + Skills format",
    uses: [
      "REST API — quotes, Fear & Greed, global metrics",
      "Optional MCP — RSI, MACD, derivatives",
      "Official SKILL.md format in skills/",
    ],
    verify: "npm run strategy:all",
    link: "https://coinmarketcap.com/api/agent/",
  },
  {
    id: "twak",
    name: "Trust Wallet",
    prize: "TWAK — Best Use",
    uses: [
      "Token risk scoring before strategy entry",
      "Live price via twak price BTC",
      "Self-custody attestation signing",
      "MCP: twak serve for Cursor / Claude",
    ],
    verify: "npm run twak:check",
    link: "https://portal.trustwallet.com/dashboard/apps",
  },
  {
    id: "bnb",
    name: "BNB Chain",
    prize: "Agent SDK",
    uses: [
      "ERC-8004 agent identity (gas-free testnet)",
      "BSC testnet strategy attestation txs",
      "ERC-8183 job server (optional)",
    ],
    verify: "npm run agent:register",
    link: "https://github.com/bnb-chain/bnbagent-sdk",
  },
];

export function SponsorStack() {
  return (
    <div className="sponsorGrid">
      {SPONSORS.map((s) => (
        <article key={s.id} className="sponsorCard">
          <header className="sponsorCardHead">
            <h3>{s.name}</h3>
            <span className="sponsorPrize">{s.prize}</span>
          </header>
          <ul className="sponsorUses">
            {s.uses.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <footer className="sponsorFoot">
            <code>{s.verify}</code>
            <a href={s.link} target="_blank" rel="noreferrer">
              Docs ↗
            </a>
          </footer>
        </article>
      ))}
    </div>
  );
}
