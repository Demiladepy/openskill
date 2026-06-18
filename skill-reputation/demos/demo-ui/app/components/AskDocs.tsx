"use client";

import { useMemo, useState } from "react";
import { DOCS_FAQ, type DocFaq } from "../lib/docsContent";

type AskDocsProps = {
  onNavigate: (sectionId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AskDocs({ onNavigate, open: controlledOpen, onOpenChange }: AskDocsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!q.trim()) return DOCS_FAQ.slice(0, 6);
    const lower = q.toLowerCase();
    return DOCS_FAQ.filter(
      (f) =>
        f.question.toLowerCase().includes(lower) ||
        f.answer.toLowerCase().includes(lower) ||
        f.keywords.some((k) => k.includes(lower))
    ).slice(0, 8);
  }, [q]);

  function pick(faq: DocFaq) {
    setOpen(false);
    setQ("");
    onNavigate(faq.sectionId);
  }

  return (
    <>
      <button type="button" className="askDocsFab" onClick={() => setOpen(true)} aria-label="Ask Docs">
        <span className="askDocsFabIcon" aria-hidden>
          📖
        </span>
        Ask Docs
      </button>

      {open && (
        <div className="askDocsOverlay" role="dialog" aria-modal="true" aria-label="Ask Docs">
          <div className="askDocsBackdrop" onClick={() => setOpen(false)} />
          <div className="askDocsPanel">
            <div className="askDocsHeader">
              <h2>Ask Docs</h2>
              <button type="button" className="askDocsClose" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="muted askDocsSub">
              Search Forge Skills documentation — same answers an agent would need.
            </p>
            <input
              className="askDocsInput"
              placeholder="How do I install skills? Run backtests?"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <ul className="askDocsList">
              {results.length === 0 ? (
                <li className="askDocsEmpty">No matches — try &quot;install&quot;, &quot;backtest&quot;, or &quot;SKILL.md&quot;</li>
              ) : (
                results.map((faq) => (
                  <li key={faq.id}>
                    <button type="button" className="askDocsItem" onClick={() => pick(faq)}>
                      <strong>{faq.question}</strong>
                      <span>{faq.answer}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
