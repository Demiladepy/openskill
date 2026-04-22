/**
 * Minimal YAML frontmatter parser (---\n ... \n---).
 * @param {string} md
 * @returns {{ front: Record<string, string>, body: string }}
 */
export function parseFrontmatter(md) {
  const s = String(md || "").replace(/\r\n/g, "\n");
  if (!s.startsWith("---")) return { front: {}, body: s };
  const end = s.indexOf("\n---", 3);
  if (end === -1) return { front: {}, body: s };
  const raw = s.slice(3, end).trim();
  const body = s.slice(end + 4).replace(/^\n/, "");
  const front = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (m) front[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { front, body };
}
