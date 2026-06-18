"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BACKTEST_ROWS, GITHUB_URL, NAV } from "../lib/navigation";
import { ForgeLogo } from "./ForgeLogo";
import { Dashboard } from "../ui/Dashboard";
import { ExportPanel } from "../ui/ExportPanel";

const SECTIONS = NAV.map((n) => n.id);

function groupNav(items: typeof NAV) {
  const groups: { title: string; items: typeof NAV }[] = [];
  for (const item of items) {
    const title = item.group || "General";
    let g = groups.find((x) => x.title === title);
    if (!g) {
      g = { title, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

export function DocShell() {
  const [active, setActive] = useState("overview");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const filteredNav = useMemo(() => {
    if (!query.trim()) return NAV;
    const q = query.toLowerCase();
    return NAV.filter((n) => n.label.toLowerCase().includes(q));
  }, [query]);

  const scrollTo = useCallback((id: string) => {
    setActive(id);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".searchWrap input")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = document.getElementById(active);
    if (!section) return;
    const hs = section.querySelectorAll("h2, h3");
    setHeadings(
      Array.from(hs).map((h) => ({
        id: h.id || h.textContent?.toLowerCase().replace(/\s+/g, "-") || "",
        text: h.textContent || "",
      }))
    );
  }, [active]);

  return (
    <div className="docs-app">
      <header className="topnav">
        <a className="brand" href="#overview" onClick={(e) => { e.preventDefault(); scrollTo("overview"); }}>
          <ForgeLogo />
          <span className="brandText">
            <strong>Forge Skills</strong>
            <small>CMC Strategy Forge</small>
          </span>
        </a>

        <div className="searchWrap">
          <span className="searchIcon" aria-hidden>⌕</span>
          <input
            type="search"
            placeholder="Search docs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search documentation"
          />
          <kbd className="searchKbd">⌘K</kbd>
        </div>

        <div className="topnavActions">
          <a className="ghostBtn" href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <button
            type="button"
            className="iconBtn"
            aria-label="Toggle theme"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <div className="docsBody">
        <aside className="sidebar">
          {groupNav(filteredNav).map((group) => (
            <div key={group.title} className="navGroup">
              <p className="navGroupTitle">{group.title}</p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`navLink ${active === item.id ? "active" : ""}`}
                  onClick={() => scrollTo(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="content">
          <article className="prose">
            <section id="overview" className="docSection">
              <p className="eyebrow">BNB Hackathon · Track 2</p>
              <h1>Strategy Skills Overview</h1>
              <p className="lead">
                Installable quant strategy skills powered by CoinMarketCap data. Backtest on BTC, ETH, and BNB,
                export CMC-compatible skill zips, and optionally attest fingerprints on BSC testnet.
              </p>
              <div className="callout">
                <strong>Simulation only</strong> — no live trading. This UI mirrors the Agent Skills docs experience
                while exposing export and on-chain verification tools.
              </div>
            </section>

            <section id="quick-start" className="docSection">
              <h2 id="quick-start-heading">Quick start</h2>
              <p>Clone the repo and run the judge path locally:</p>
              <pre className="codeBlock">{`cd skill-reputation
npm install
cp .env.example .env
# Set CMC_API_KEY (+ AGENT_PRIVATE_KEY for attestations)
npm run strategy:all
npm run replay
npm run export:skills`}</pre>
              <h3 id="three-command-demo">Three-command demo</h3>
              <pre className="codeBlock">{`npm run strategy:all && npm run replay && npm run attest`}</pre>
            </section>

            <section id="strategies" className="docSection">
              <h2>Strategies</h2>
              <p>Three backtestable skills ship in official CMC <code>SKILL.md</code> format under <code>skills/</code>.</p>

              <div className="skillCards">
                <div className="skillCard">
                  <h3>Momentum Merger</h3>
                  <p>RSI, MACD, Fear &amp; Greed, and CMC % changes. Score-based entries with trailing stop.</p>
                  <code>skills/cmc-strategy-momentum/</code>
                </div>
                <div className="skillCard">
                  <h3>Sentiment Divergence</h3>
                  <p>7d vs 30d return divergence plus capitulation signals from Fear &amp; Greed history.</p>
                  <code>skills/cmc-strategy-sentiment/</code>
                </div>
                <div className="skillCard">
                  <h3>Regime Detector</h3>
                  <p>BTC dominance, SMA trend, ATR volatility — enter in risk-on trending regimes.</p>
                  <code>skills/cmc-strategy-regime/</code>
                </div>
              </div>

              <pre className="codeBlock">{`npx skills add https://github.com/Demiladepy/openskill/tree/main/skill-reputation/skills`}</pre>
            </section>

            <section id="backtest-results" className="docSection">
              <h2>Backtest results</h2>
              <p className="muted">
                Window 2026-03-01 → 2026-06-01 · Live CMC data (<code>cmc-mixed</code>). Re-run with{" "}
                <code>npm run strategy:all</code>.
              </p>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Strategy</th>
                      <th>Asset</th>
                      <th>Sharpe</th>
                      <th>Max DD</th>
                      <th>Trades</th>
                      <th>Win %</th>
                      <th>Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BACKTEST_ROWS.map((r) => (
                      <tr key={`${r.strategy}-${r.asset}`}>
                        <td>{r.strategy}</td>
                        <td>{r.asset}</td>
                        <td className={parseFloat(r.sharpe) > 1 ? "positive" : ""}>{r.sharpe}</td>
                        <td>{r.dd}</td>
                        <td>{r.trades}</td>
                        <td>{r.win}</td>
                        <td>{r.ret}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="export-skills" className="docSection">
              <h2>Export skills</h2>
              <p>Package CMC-compatible skill folders as zip files for DoraHacks submission.</p>
              <ExportPanel />
            </section>

            <section id="attestations" className="docSection">
              <h2>BSC attestations</h2>
              <p>TWAK-compatible self-custody signing on BSC testnet. Optional — requires env vars on Vercel.</p>
              <Dashboard />
            </section>

            <section id="cmc-integration" className="docSection">
              <h2>CMC integration</h2>
              <h3>Data API</h3>
              <p>Quotes, Fear &amp; Greed, global metrics via <code>src/cmcDataClient.js</code>.</p>
              <h3>MCP</h3>
              <p>Set <code>MCP_ENABLED=1</code> for pre-computed RSI/MACD from CMC MCP.</p>
              <h3>Skills format</h3>
              <p>Matches CoinMarketCap official skills structure — frontmatter, prerequisites, workflow, output.</p>
            </section>

            <section id="verify" className="docSection">
              <h2>Verify submission</h2>
              <pre className="codeBlock">{`npm run verify
npm run check:secrets`}</pre>
              <p>Confirms backtests, skill zips, replay HTML, and flags missing on-chain proofs.</p>
            </section>
          </article>
        </main>

        <aside className="toc">
          <p className="tocTitle">On this page</p>
          {headings.length === 0 ? (
            <p className="muted tocEmpty">Headings appear as you scroll.</p>
          ) : (
            <ul>
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
