"use client";

import { useEffect, useMemo, useState } from "react";
import { DOCS_FAQ, type DocFaq } from "../lib/docsContent";
import { NAV } from "../lib/navigation";
import { ForgeLogo } from "./ForgeLogo";

type SearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (sectionId: string) => void;
};

export function SearchCommand({ open, onOpenChange, onNavigate }: SearchCommandProps) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"search" | "ask">("search");

  useEffect(() => {
    if (!open) {
      setQ("");
      setMode("search");
    }
  }, [open]);

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

  function pickFaq(faq: DocFaq) {
    go(faq.sectionId);
  }

  if (!open) return null;

  return (
    <div className="cmdOverlay" role="dialog" aria-modal="true" aria-label="Search documentation">
      <div className="cmdBackdrop" onClick={() => onOpenChange(false)} />
      <div className="cmdPanel">
        <div className="cmdSearchRow">
          <span className="cmdIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            className="cmdInput"
            placeholder={mode === "ask" ? "Ask about Forge Skills…" : "Search for anything…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") onOpenChange(false);
            }}
          />
          <button
            type="button"
            className={`cmdSearchBtn ${mode === "search" ? "active" : ""}`}
            onClick={() => setMode("search")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            Search
          </button>
          <button
            type="button"
            className={`cmdAskBtn ${mode === "ask" ? "active" : ""}`}
            onClick={() => setMode("ask")}
          >
            <span aria-hidden>✦</span> Ask Docs
          </button>
        </div>

        <div className="cmdAskBar">
          <span className="cmdAskLabel">
            <ForgeLogo size={18} />
            Ask about
          </span>
          <button type="button" className="cmdConversation" onClick={() => setMode("ask")}>
            Start conversation
            <kbd>↵</kbd>
          </button>
        </div>

        <div className="cmdResults">
          {mode === "search" ? (
            <>
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
            </>
          ) : (
            <>
              <p className="cmdResultsLabel">Common questions</p>
              <ul className="cmdList">
                {(q ? results.faqItems : DOCS_FAQ).map((faq) => (
                  <li key={faq.id}>
                    <button type="button" className="cmdItem" onClick={() => pickFaq(faq)}>
                      <span className="cmdItemTitle">{faq.question}</span>
                      <span className="cmdItemDesc">{faq.answer}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {q && results.faqItems.length === 0 && (
                <p className="cmdEmpty">
                  No exact match — try &quot;install&quot;, &quot;backtest&quot;, or &quot;SKILL.md&quot;
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
