"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BACKTEST_ROWS, GITHUB_URL, NAV } from "../lib/navigation";
import { AGENT_PROMPT_CARDS, AGENT_SNIPPETS } from "../lib/agentSnippets";
import { DOCS_FAQ, SKILL_MD_EXAMPLE } from "../lib/docsContent";
import {
  BRAND,
  OVERVIEW_COPY,
  PRACTICES_COPY,
  SPEC_COPY,
  STRUCTURE_COPY,
} from "../lib/docsCopy";
import { CopyBlock } from "./CopyBlock";
import { CopyPageButton } from "./CopyPageButton";
import { ForgeLogo } from "./ForgeLogo";
import { IconSearch, IconSparkles } from "./DocIcons";
import { SearchCommand } from "./SearchCommand";
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdMode, setCmdMode] = useState<"search" | "ask">("search");

  const openSearch = useCallback(() => {
    setCmdMode("search");
    setCmdOpen(true);
  }, []);

  const openAsk = useCallback(() => {
    setCmdMode("ask");
    setCmdOpen(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const scrollTo = useCallback((id: string) => {
    setActive(id);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

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

  const navGroups = useMemo(() => groupNav(NAV), []);

  return (
    <div className="docs-app">
      <header className="topnav">
        <a
          className="brand"
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            scrollTo("overview");
          }}
        >
          <ForgeLogo size={40} />
          <span className="brandText">
            <strong>{BRAND.name}</strong>
            <small>{BRAND.tagline}</small>
          </span>
        </a>

        <button
          type="button"
          className="searchTrigger"
          onClick={openSearch}
          aria-label="Open search"
        >
          <span className="searchIcon" aria-hidden>
            <IconSearch size={16} />
          </span>
          <span className="searchTriggerText">Search docs…</span>
          <kbd className="searchKbd">⌘K</kbd>
        </button>

        <div className="topnavActions">
          <button type="button" className="askDocsNavBtn" onClick={openAsk}>
            <IconSparkles size={14} /> Ask Docs
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
          {navGroups.map((group) => (
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
                    document.querySelector("#overview")?.textContent?.slice(0, 2000) || "Forge Skills docs"
                  }
                />
              </div>
              <p className="eyebrow">{BRAND.product}</p>
              <h1>{OVERVIEW_COPY.title}</h1>
              <p className="lead">{OVERVIEW_COPY.lead}</p>
              <p>{OVERVIEW_COPY.problem}</p>
              <div className="callout">
                <strong>Simulation only.</strong> {OVERVIEW_COPY.simulation} Every command and agent prompt on
                this site is one-click copy — skills live in <code>skills/</code> as{" "}
                <code>SKILL.md</code>, the same format CoinMarketCap Agent Hub expects.
              </div>
            </section>

            <section id="specification" className="docSection">
              <h2 id="spec-heading">Specification</h2>
              <h3 id="what-are-skills">What are Forge Skills?</h3>
              <p>{SPEC_COPY.intro}</p>
              <p>
                <strong>Code</strong> — {SPEC_COPY.code}{" "}
                <strong>Resources</strong> — {SPEC_COPY.resources}
              </p>

              <h3 id="how-skills-work">How skills load</h3>
              <p>
                Skills use three disclosure levels so agents keep context small until a strategy is actually
                triggered:
              </p>
              <SkillLevelsTable />

              <h3 id="progressive-disclosure">Progressive disclosure</h3>
              <p className="muted">
                Level 1 metadata is always available so your agent knows a momentum skill exists. Level 2
                (full SKILL.md) loads when the user asks to backtest. Level 3 (CLI + JSON artifacts) runs only
                on execution.
              </p>
            </section>

            <section id="skill-structure" className="docSection">
              <h2 id="structure-heading">Skill structure</h2>
              <p>{STRUCTURE_COPY.intro}</p>
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
                      <td>Unique identifier — e.g. <code>cmc-strategy-momentum</code></td>
                    </tr>
                    <tr>
                      <td><code>version</code></td>
                      <td>Yes</td>
                      <td>Semver string for marketplace versioning</td>
                    </tr>
                    <tr>
                      <td><code>description</code></td>
                      <td>Yes</td>
                      <td>One-line summary agents use for routing at startup</td>
                    </tr>
                    <tr>
                      <td><code>tags</code></td>
                      <td>Yes</td>
                      <td>Searchable keywords — crypto, momentum, backtesting</td>
                    </tr>
                    <tr>
                      <td><code>author</code></td>
                      <td>Recommended</td>
                      <td>Publisher name shown in Agent Hub listings</td>
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
                {PRACTICES_COPY.creators.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3 id="for-agents-using-skills">For agents using skills</h3>
              <ul className="docsList">
                {PRACTICES_COPY.agents.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3 id="optimizing-descriptions">Writing good descriptions</h3>
              <p>
                Good:{" "}
                <em>
                  &quot;Momentum strategy using CMC RSI, MACD, and Fear &amp; Greed — backtestable on
                  BTC/ETH/BNB&quot;
                </em>
              </p>
              <p className="muted">
                Bad: <em>&quot;A strategy&quot;</em> — too vague for agent routing at Level 1.
              </p>
            </section>

            <section id="for-agents" className="docSection">
              <h2 id="for-agents-heading">For agents</h2>
              <p>
                Most developers no longer wire strategies by hand. They paste a prompt, point the agent at a
                skill folder, and let the pipeline run. Copy any block below into Cursor, Windsurf, Claude Code,
                or OpenClaw.
              </p>

              <h3 id="install-skills">Install skills</h3>
              <CopyBlock code={AGENT_SNIPPETS.installSkills} label="Copy install command" />

              <h3 id="agent-prompts">Ready-made agent prompts</h3>
              <p className="muted">
                Paste these directly into chat — the agent reads SKILL.md and runs the CLI from{" "}
                <code>skill-reputation/</code>.
              </p>

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
              <p>Clone the repository and run the full judge path locally in under five minutes:</p>
              <CopyBlock code={AGENT_SNIPPETS.cloneAndRun} label="Copy setup" />
              <h3 id="three-command-demo">Three-command demo</h3>
              <CopyBlock code={AGENT_SNIPPETS.judgeDemo} label="Copy demo commands" />
            </section>

            <section id="strategies" className="docSection">
              <h2>Strategies</h2>
              <p>
                Three backtestable skills ship in official CoinMarketCap <code>SKILL.md</code> format under{" "}
                <code>skills/</code>. Each consumes live CMC data and writes auditable JSON to{" "}
                <code>backtest_results/</code>.
              </p>

              <div className="skillCards">
                <div className="skillCard">
                  <h3>Momentum Merger</h3>
                  <p>
                    Combines RSI, MACD, Fear &amp; Greed, and CMC percent-change signals into a score-based
                    entry model with trailing stop exits.
                  </p>
                  <code>skills/cmc-strategy-momentum/</code>
                </div>
                <div className="skillCard">
                  <h3>Sentiment Divergence</h3>
                  <p>
                    Detects 7-day vs 30-day return divergence and capitulation patterns from Fear &amp; Greed
                    history.
                  </p>
                  <code>skills/cmc-strategy-sentiment/</code>
                </div>
                <div className="skillCard">
                  <h3>Regime Detector</h3>
                  <p>
                    Uses BTC dominance, SMA trend, and ATR volatility to enter only in risk-on trending regimes.
                  </p>
                  <code>skills/cmc-strategy-regime/</code>
                </div>
              </div>

              <CopyBlock code={AGENT_SNIPPETS.installSkills} label="Copy install command" />
            </section>

            <section id="backtest-results" className="docSection">
              <h2>Backtest results</h2>
              <p className="muted">
                Window 2026-03-01 → 2026-06-01 · Live CMC data (<code>cmc-mixed</code>). Re-run anytime with{" "}
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
              <p>
                Package CMC-compatible skill folders as a zip archive for DoraHacks submission. The export
                includes all three strategies plus backtest appendix files.
              </p>
              <ExportPanel />
            </section>

            <section id="attestations" className="docSection">
              <h2>BSC attestations</h2>
              <p>
                Optional TWAK-compatible self-custody signing on BSC testnet. Set{" "}
                <code>AGENT_PRIVATE_KEY</code>, fund your wallet, and run <code>npm run attest</code> to post a
                verifiable strategy digest.
              </p>
              <Dashboard />
            </section>

            <section id="cmc-integration" className="docSection">
              <h2>CMC integration</h2>
              <h3>Data API</h3>
              <p>
                Quotes, Fear &amp; Greed, and global metrics flow through <code>src/cmcDataClient.js</code>.
                Set <code>CMC_API_KEY</code> and <code>CMC_USE_MOCK=0</code> for live data.
              </p>
              <h3>MCP</h3>
              <p>
                Enable <code>MCP_ENABLED=1</code> to pull pre-computed RSI and MACD from the CoinMarketCap MCP
                server instead of computing indicators locally.
              </p>
              <h3>Skills format</h3>
              <p>
                Folder layout, frontmatter, and section structure match CoinMarketCap&apos;s official skills
                repository — ready for Agent Hub import without reformatting.
              </p>
            </section>

            <section id="verify" className="docSection">
              <h2>Verify submission</h2>
              <CopyBlock code={`npm run verify\nnpm run check:secrets`} label="Copy verify commands" />
              <p>
                Confirms backtest JSON exists, skill zips are present, replay HTML is generated, and flags any
                missing on-chain proofs before you push to GitHub.
              </p>
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

      <SearchCommand
        open={cmdOpen}
        initialMode={cmdMode}
        onOpenChange={setCmdOpen}
        onNavigate={scrollTo}
      />

      <button
        type="button"
        className="askDocsFab"
        onClick={openAsk}
        aria-label="Ask Docs"
      >
        <IconSparkles size={16} />
        Ask Docs
      </button>
    </div>
  );
}
