"use client";

import { useState } from "react";

export function CopyBlock({
  code,
  label = "Copy",
}: {
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback ignored */
    }
  }

  return (
    <div className="copyBlock">
      <div className="copyBlockBar">
        <span className="copyBlockHint">Paste into Cursor, Windsurf, or your agent</span>
        <button type="button" className="copyBtn" onClick={copy}>
          {copied ? "Copied ✓" : label}
        </button>
      </div>
      <pre className="codeBlock">{code}</pre>
    </div>
  );
}
