"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BACKTEST_ROWS, GITHUB_URL, NAV } from "../lib/navigation";
import { AGENT_PROMPT_CARDS, AGENT_SNIPPETS } from "../lib/agentSnippets";
import { CopyBlock } from "./CopyBlock";
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
                Strategy skills for AI agents — not dashboards for humans to click through. Developers search,
                copy, paste into Cursor or Windsurf, and let the agent run the pipeline.
              </p>
              <div className="callout">
                <strong>Built for pipe-coders.</strong> Every command and agent prompt on this site is one-click
                copy. Skills live in <code>skills/</code> as <code>SKILL.md</code> — the same format CMC Agent Hub
                expects. Simulation only — no live trading.
              </div>
            </section>

            <section id="for-agents" className="docSection">
              <h2 id="for-agents-heading">For agents</h2>
              <p>
                Most devs don&apos;t build from scratch anymore. They paste a prompt, point the agent at a skill, and
                run. Copy any block below into Cursor, Windsurf, Claude Code, or OpenClaw.
              </p>

              <h3 id="install-skills">Install skills</h3>
              <CopyBlock code={AGENT_SNIPPETS.installSkills} label="Copy install command" />

              <h3 id="agent-prompts">Ready-made agent prompts</h3>
              <p className="muted">Paste these directly into chat — the agent reads SKILL.md and runs the CLI.</p>

              <div className="pasteGrid">
                {AGENT_PROMPT_CARDS.slice(3).map((card) => (
                  <div key={card.key} className="pasteCard">
                    <p className="pasteCardTitle">{card.title}</p>
                    <CopyBlock code={AGENT_SNIPPETS[card.key]} label="Copy prompt" />
                  </div>
                ))}
              </div>

              <h3 id="cursor-context">Cursor / Windsurf context block</h3>
              <CopyBlock code={AGENT_SNIPPETS.cursorContext} label="Copy @ context" />

              <h3 id="env-template">Environment template</h3>
              <CopyBlock code={AGENT_SNIPPETS.envTemplate} label="Copy .env template" />
            </section>

            <section id="quick-start" className="docSection">
              <h2 id="quick-start-heading">Quick start</h2>
              <p>Clone the repo and run the judge path locally:</p>
              <CopyBlock code={AGENT_SNIPPETS.cloneAndRun} label="Copy setup" />
              <h3 id="three-command-demo">Three-command demo</h3>
              <CopyBlock code={AGENT_SNIPPETS.judgeDemo} label="Copy demo commands" />
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

              <CopyBlock code={AGENT_SNIPPETS.installSkills} label="Copy install command" />
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
              <CopyBlock code={`npm run verify\nnpm run check:secrets`} label="Copy verify commands" />
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
