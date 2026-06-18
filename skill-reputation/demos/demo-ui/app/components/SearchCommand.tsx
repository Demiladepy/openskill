"use client";

import { useEffect, useMemo, useState } from "react";
import { DOCS_FAQ, type DocFaq } from "../lib/docsContent";
import { BRAND } from "../lib/docsCopy";
import { NAV } from "../lib/navigation";
import { IconOpenBook, IconSearch, IconSend, IconSparkles } from "./DocIcons";

const EXAMPLE_QUESTIONS = [
  "How do I install skills in my agent?",
  "How do I run a backtest on BTC?",
  "What belongs in a SKILL.md file?",
];

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
  const [activeAnswer, setActiveAnswer] = useState<DocFaq | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setQ("");
      setActiveAnswer(null);
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

  function matchQuestion(text: string): DocFaq | undefined {
    const lower = text.trim().toLowerCase();
    if (!lower) return undefined;
    return DOCS_FAQ.find(
      (f) =>
        f.question.toLowerCase() === lower ||
        f.question.toLowerCase().includes(lower) ||
        lower.includes(f.question.toLowerCase().slice(0, 20)) ||
        f.keywords.some((k) => lower.includes(k))
    );
  }

  function submitAsk(text?: string) {
    const query = text ?? q;
    const match = matchQuestion(query);
    if (match) {
      setActiveAnswer(match);
      setQ(match.question);
    } else if (results.faqItems[0]) {
      setActiveAnswer(results.faqItems[0]);
      setQ(results.faqItems[0].question);
    }
  }

  function pickFaq(faq: DocFaq) {
    go(faq.sectionId);
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
            <div className="askHero">
              <IconOpenBook size={56} className="askBookIcon" />
              <div className="askHeroText">
                <p className="askGreeting">Hi!</p>
                <p className="askIntro">
                  I&apos;m an AI assistant trained on Forge Skills documentation, skill manifests,
                  and backtest guides.
                </p>
                <p className="askPrompt">
                  Ask me anything about{" "}
                  <span className="askBadge">{BRAND.name}</span>.
                </p>
              </div>
            </div>

            {activeAnswer ? (
              <div className="askAnswer">
                <p className="askAnswerQ">{activeAnswer.question}</p>
                <p className="askAnswerA">{activeAnswer.answer}</p>
                <button
                  type="button"
                  className="askAnswerLink"
                  onClick={() => go(activeAnswer.sectionId)}
                >
                  Read more in docs →
                </button>
              </div>
            ) : (
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
                setActiveAnswer(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAsk();
              }}
              autoFocus
            />
            <button
              type="button"
              className="askSendBtn"
              aria-label="Send question"
              onClick={() => submitAsk()}
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
                      <button type="button" className="cmdItem" onClick={() => pickFaq(faq)}>
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
