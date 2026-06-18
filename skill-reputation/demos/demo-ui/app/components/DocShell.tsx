"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BACKTEST_ROWS, GITHUB_URL, NAV } from "../lib/navigation";
import { AGENT_PROMPT_CARDS, AGENT_SNIPPETS } from "../lib/agentSnippets";
import { DOCS_FAQ, SKILL_MD_EXAMPLE } from "../lib/docsContent";
import { AskDocs } from "./AskDocs";
import { CopyBlock } from "./CopyBlock";
import { CopyPageButton } from "./CopyPageButton";
import { ForgeLogo } from "./ForgeLogo";
import { SkillLevelsTable } from "./SkillLevelsTable";
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

  const [askOpen, setAskOpen] = useState(false);

  const filteredNav = useMemo(() => {
    if (!query.trim()) return NAV;
    const q = query.toLowerCase();
    const navHits = NAV.filter((n) => n.label.toLowerCase().includes(q));
    const faqHits = DOCS_FAQ.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.keywords.some((k) => k.includes(q))
    ).map((f) => NAV.find((n) => n.id === f.sectionId)).filter(Boolean) as typeof NAV;
    const merged = [...navHits];
    for (const item of faqHits) {
      if (!merged.find((m) => m.id === item.id)) merged.push(item);
    }
    return merged.length ? merged : NAV;
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
        setAskOpen(true);
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
          <button type="button" className="askDocsNavBtn" onClick={() => setAskOpen(true)}>
            ✦ Ask Docs
          </button>
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
              <div className="pageMeta">
                <CopyPageButton
                  getText={() =>
                    document.querySelector("#overview")?.textContent?.slice(0, 2000) || "CMC Strategy Forge docs"
                  }
                />
              </div>
              <p className="eyebrow">BNB Hackathon · Track 2</p>
              <h1>Forge Skills Overview</h1>
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

            <section id="specification" className="docSection">
              <h2 id="spec-heading">Specification</h2>
              <h3 id="what-are-skills">What are Forge Skills?</h3>
              <p>
                Forge Skills are quant strategy packages for AI agents — folders with a <code>SKILL.md</code>{" "}
                manifest. They follow the same progressive-disclosure model as{" "}
                <a href="https://agentskills.io" target="_blank" rel="noreferrer">
                  Agent Skills
                </a>{" "}
                and CoinMarketCap&apos;s official skills repo.
              </p>
              <p>
                <strong>Code</strong> is the CLI pipeline (<code>npm run strategy:all</code>).{" "}
                <strong>Resources</strong> are backtest JSON, replay HTML, and exported zips — loaded only when the
                agent needs them.
              </p>

              <h3 id="how-skills-work">How skills work</h3>
              <p>
                Skills load in three levels — keeping context small until the agent actually runs a strategy:
              </p>
              <SkillLevelsTable />

              <h3 id="progressive-disclosure">Progressive disclosure</h3>
              <p className="muted">
                Level 1 is always in agent context so your agent knows a momentum skill exists. Level 2 loads when
                the user asks to backtest. Level 3 (full repo CLI) runs only when executing commands.
              </p>
            </section>

            <section id="skill-structure" className="docSection">
              <h2 id="structure-heading">Skill structure</h2>
              <p>Each skill folder matches CMC Agent Hub format:</p>
              <pre className="fileTree">{`skills/
  cmc-strategy-momentum/
    SKILL.md          ← manifest + instructions
  cmc-strategy-sentiment/
    SKILL.md
  cmc-strategy-regime/
    SKILL.md`}</pre>

              <h3 id="frontmatter">Required frontmatter</h3>
              <div className="tableWrap docsTable">
                <table>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Required</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>name</code></td>
                      <td>Yes</td>
                      <td>Unique skill identifier (e.g. cmc-strategy-momentum)</td>
                    </tr>
                    <tr>
                      <td><code>version</code></td>
                      <td>Yes</td>
                      <td>Semver string</td>
                    </tr>
                    <tr>
                      <td><code>description</code></td>
                      <td>Yes</td>
                      <td>One-line summary for agent discovery</td>
                    </tr>
                    <tr>
                      <td><code>tags</code></td>
                      <td>Yes</td>
                      <td>Array for marketplace search</td>
                    </tr>
                    <tr>
                      <td><code>author</code></td>
                      <td>Recommended</td>
                      <td>CMC Strategy Forge</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 id="example-skill">Example SKILL.md</h3>
              <CopyBlock code={SKILL_MD_EXAMPLE} label="Copy example" />
            </section>

            <section id="best-practices" className="docSection">
              <h2 id="practices-heading">Best practices</h2>
              <h3 id="for-skill-creators">For skill creators</h3>
              <ul className="docsList">
                <li>Keep <code>description</code> under 200 chars — agents scan this at startup.</li>
                <li>Put copy-paste prompts in the <strong>Usage</strong> section.</li>
                <li>List every CMC endpoint in <strong>CMC Data Sources</strong>.</li>
                <li>State <strong>simulation only</strong> — never imply live trading.</li>
              </ul>
              <h3 id="for-agents-using-skills">For agents using skills</h3>
              <ul className="docsList">
                <li>Read Level 1 metadata first; load full SKILL.md only when user asks to backtest.</li>
                <li>Run <code>npm run strategy:all</code> from <code>skill-reputation/</code>, not repo root.</li>
                <li>Return paths to <code>backtest_results/*.json</code> in every response.</li>
                <li>Use <code>npm run verify</code> before claiming submission-ready.</li>
              </ul>
              <h3 id="optimizing-descriptions">Optimizing descriptions</h3>
              <p>
                Good: <em>&quot;Momentum strategy using CMC RSI, MACD, Fear &amp; Greed — backtestable on BTC/ETH/BNB&quot;</em>
              </p>
              <p className="muted">
                Bad: <em>&quot;A strategy&quot;</em> — too vague for agent routing.
              </p>
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

      <AskDocs
        open={askOpen}
        onOpenChange={setAskOpen}
        onNavigate={(id) => {
          setAskOpen(false);
          scrollTo(id);
        }}
      />
    </div>
  );
}
