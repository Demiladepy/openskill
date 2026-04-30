import { test, expect } from "@playwright/test";
import http from "node:http";
import { scrapePr } from "../src/scout/scrape-pr";

function startServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolve({
          url: `http://127.0.0.1:${addr.port}`,
          close: () => new Promise<void>((r) => server.close(() => r()))
        });
      }
    });
  });
}

test("happy path: merged PR + matching author", async ({}) => {
  const s = await startServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body><span>Merged</span><a class="author">alice</a><relative-time datetime="2026-04-26T12:00:00Z"></relative-time><clipboard-copy value="abc123"></clipboard-copy></body></html>`);
  });

  const out = await scrapePr({ repo: "acme/repo", prNumber: 1, expectedAuthor: "alice", bountyId: "t-happy", baseUrl: s.url });
  await s.close();

  expect(out.found).toBe(true);
  expect(out.merged).toBe(true);
  expect(out.authorMatches).toBe(true);
});

test("failure: PR does not exist", async ({}) => {
  const s = await startServer((_req, res) => {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("not found");
  });

  const out = await scrapePr({ repo: "acme/repo", prNumber: 404, expectedAuthor: "alice", bountyId: "t-404", baseUrl: s.url });
  await s.close();

  expect(out.found).toBe(false);
  expect(out.failureReason).toContain("does not exist");
});

test("failure: merged PR by wrong author", async ({}) => {
  const s = await startServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body><span>Merged</span><a class="author">mallory</a><relative-time datetime="2026-04-26T12:00:00Z"></relative-time><clipboard-copy value="def456"></clipboard-copy></body></html>`);
  });

  const out = await scrapePr({ repo: "acme/repo", prNumber: 2, expectedAuthor: "alice", bountyId: "t-author", baseUrl: s.url });
  await s.close();

  expect(out.merged).toBe(true);
  expect(out.authorMatches).toBe(false);
  expect(out.failureReason).toContain("author differs");
});
