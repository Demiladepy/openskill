"use client";

import { useState } from "react";

export function CopyPageButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" className="copyPageBtn" onClick={copy}>
      {copied ? "Copied ✓" : "Copy page ▾"}
    </button>
  );
}
