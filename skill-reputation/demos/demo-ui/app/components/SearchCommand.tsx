"use client";

import { useEffect, useMemo, useState } from "react";
import { DOCS_FAQ } from "../lib/docsContent";
import { BRAND } from "../lib/docsCopy";
import { NAV } from "../lib/navigation";
import { ForgeLogo } from "./ForgeLogo";
import { IconSearch, IconSend, IconSparkles } from "./DocIcons";

const EXAMPLE_QUESTIONS = [
  "How do I run a backtest on BTC?",
  "What are the live backtest results for all strategies?",
  "How do I export skills for DoraHacks submission?",
];

type AskResponse = {
  ok: boolean;
  title?: string;
  answer?: string;
  sectionId?: string;
  commands?: string[];
  related?: { question: string; sectionId: string }[];
  engine?: string;
  error?: string;
};

type SearchCommandProps = {
  open: boolean;
  initialMode?: "search" | "ask";
  onOpenChange: (open: boolean) => void;
  onNavigate: (sectionId: string) => void;
};

export function SearchCommand({
  open,
  initialMode = "search",
  onOpenChange,
  onNavigate,
}: SearchCommandProps) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"search" | "ask">(initialMode);
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setQ("");
      setAskResult(null);
      setLoading(false);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const results = useMemo(() => {
    const lower = q.trim().toLowerCase();
    const navItems = lower
      ? NAV.filter(
          (n) =>
            n.label.toLowerCase().includes(lower) ||
            n.group?.toLowerCase().includes(lower)
        )
      : NAV.slice(0, 6);

    const faqItems = lower
      ? DOCS_FAQ.filter(
          (f) =>
            f.question.toLowerCase().includes(lower) ||
            f.answer.toLowerCase().includes(lower) ||
            f.keywords.some((k) => k.includes(lower))
        )
      : DOCS_FAQ.slice(0, 6);

    return { navItems, faqItems };
  }, [q]);

  function go(sectionId: string) {
    onOpenChange(false);
    onNavigate(sectionId);
  }

  async function submitAsk(text?: string) {
    const query = (text ?? q).trim();
    if (!query) return;

    setQ(query);
    setLoading(true);
    setAskResult(null);

    try {
      const res = await fetch("/api/ask-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = (await res.json()) as AskResponse;
      setAskResult(data.ok ? data : { ok: false, error: data.error || "No answer found" });
    } catch {
      setAskResult({ ok: false, error: "Could not reach Ask Docs engine. Run locally with Python 3." });
    } finally {
      setLoading(false);
    }
  }

  function pickFaq(sectionId: string) {
    go(sectionId);
  }

  if (!open) return null;

  return (
    <div
      className="cmdOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "ask" ? "Ask Docs" : "Search documentation"}
    >
      <div className="cmdBackdrop" onClick={() => onOpenChange(false)} />

      {mode === "ask" ? (
        <div className="askPanel">
          <header className="askPanelHeader">
            <span className="askPanelTitle">Ask AI</span>
            <div className="askPanelTabs">
              <button type="button" className="askTab" onClick={() => setMode("search")}>
                <IconSearch size={15} />
                Search
              </button>
              <button type="button" className="askTab askTabActive">
                <IconSparkles size={14} />
                Ask Docs
              </button>
            </div>
          </header>

          <div className="askPanelBody">
            {!askResult && (
              <div className="askHero">
                <ForgeLogo size={56} />
                <div className="askHeroText">
                  <p className="askGreeting">Hi!</p>
                  <p className="askIntro">
                    I answer from the live Forge Skills codebase — backtest JSON, npm scripts, skill
                    manifests, CMC pipeline, and BSC attestation flow. No external API.
                  </p>
                  <p className="askPrompt">
                    Ask me anything about{" "}
                    <span className="askBadge">{BRAND.name}</span>.
                  </p>
                </div>
              </div>
            )}

            {loading && <p className="askLoading">Thinking…</p>}

            {askResult?.ok && askResult.answer && (
              <div className="askAnswer">
                {askResult.title && <p className="askAnswerQ">{askResult.title}</p>}
                <div className="askAnswerBody">{askResult.answer}</div>
                {askResult.commands && askResult.commands.length > 0 && (
                  <div className="askCommands">
                    <p className="askCommandsLabel">Run locally</p>
                    {askResult.commands.map((cmd) => (
                      <code key={cmd} className="askCommand">{cmd}</code>
                    ))}
                  </div>
                )}
                {askResult.sectionId && (
                  <button
                    type="button"
                    className="askAnswerLink"
                    onClick={() => go(askResult.sectionId!)}
                  >
                    Read more in docs →
                  </button>
                )}
                {askResult.engine && (
                  <p className="askEngineTag">Engine: {askResult.engine}</p>
                )}
              </div>
            )}

            {askResult && !askResult.ok && (
              <p className="askError">{askResult.error}</p>
            )}

            {!askResult && !loading && (
              <>
                <p className="askExamplesLabel">Example questions</p>
                <div className="askExamples">
                  {EXAMPLE_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="askExampleBtn"
                      onClick={() => submitAsk(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <footer className="askPanelFooter">
            <input
              className="askInput"
              placeholder="How do I get started?"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (askResult) setAskResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAsk();
              }}
              disabled={loading}
              autoFocus
            />
            <button
              type="button"
              className="askSendBtn"
              aria-label="Send question"
              onClick={() => submitAsk()}
              disabled={loading}
            >
              <IconSend size={18} />
            </button>
          </footer>
        </div>
      ) : (
        <div className="cmdPanel">
          <header className="askPanelHeader cmdPanelHeader">
            <span className="askPanelTitle mutedTitle">Search</span>
            <div className="askPanelTabs">
              <button type="button" className="askTab askTabActive">
                <IconSearch size={15} />
                Search
              </button>
              <button type="button" className="askTab" onClick={() => setMode("ask")}>
                <IconSparkles size={14} />
                Ask Docs
              </button>
            </div>
          </header>

          <div className="cmdSearchRow">
            <span className="cmdIcon" aria-hidden>
              <IconSearch size={18} />
            </span>
            <input
              className="cmdInput"
              placeholder="Search for anything…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") onOpenChange(false);
              }}
            />
          </div>

          <div className="cmdResults">
            <p className="cmdResultsLabel">Pages</p>
            <ul className="cmdList">
              {results.navItems.map((item) => (
                <li key={item.id}>
                  <button type="button" className="cmdItem" onClick={() => go(item.id)}>
                    <span className="cmdItemTitle">{item.label}</span>
                    <span className="cmdItemMeta">{item.group}</span>
                  </button>
                </li>
              ))}
            </ul>
            {(q ? results.faqItems : DOCS_FAQ.slice(0, 4)).length > 0 && (
              <>
                <p className="cmdResultsLabel">{q ? "Answers" : "Popular questions"}</p>
                <ul className="cmdList">
                  {(q ? results.faqItems : DOCS_FAQ.slice(0, 4)).map((faq) => (
                    <li key={faq.id}>
                      <button type="button" className="cmdItem" onClick={() => pickFaq(faq.sectionId)}>
                        <span className="cmdItemTitle">{faq.question}</span>
                        <span className="cmdItemDesc">{faq.answer}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
