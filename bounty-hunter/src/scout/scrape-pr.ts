import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { ScoutResult } from "../types";

export async function scrapePr(input: {
  repo: string;
  prNumber: number;
  expectedAuthor: string;
  bountyId: string;
  baseUrl?: string;
}): Promise<ScoutResult> {
  const base = input.baseUrl || process.env.GITHUB_BASE_URL || "https://github.com";
  const prUrl = `${base.replace(/\/$/, "")}/${input.repo}/pull/${input.prNumber}`;
  const timestamp = Date.now();
  const screenshotPath = path.resolve(process.cwd(), "audit", `${input.bountyId}-${timestamp}.png`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const resp = await page.goto(prUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (!resp) throw new Error("No response from GitHub");

    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

    if (resp.status() === 404) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        found: false, merged: false, authorMatches: false, actualAuthor: null, mergedAt: null, commitSha: null,
        prUrl, screenshotPath, failureReason: "PR does not exist"
      };
    }
    if (resp.status() === 429 || page.url().includes("rate-limited")) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        found: false, merged: false, authorMatches: false, actualAuthor: null, mergedAt: null, commitSha: null,
        prUrl, screenshotPath, failureReason: "GitHub rate limit encountered"
      };
    }

    await page.waitForSelector("body", { timeout: 10000 });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const merged = (await page.locator('text="Merged"').count()) > 0;
    const actualAuthor = (await page.locator("a.author").first().textContent())?.trim() || null;
    const mergedAt = await page.locator("relative-time").first().getAttribute("datetime");
    const commitSha = (await page.locator("clipboard-copy[value]").first().getAttribute("value")) || null;
    const authorMatches = !!actualAuthor && actualAuthor.toLowerCase() === input.expectedAuthor.toLowerCase();

    if (!merged) {
      return { found: true, merged: false, authorMatches: false, actualAuthor, mergedAt, commitSha, prUrl, screenshotPath, failureReason: "PR is not merged" };
    }
    if (!authorMatches) {
      return { found: true, merged: true, authorMatches: false, actualAuthor, mergedAt, commitSha, prUrl, screenshotPath, failureReason: "PR author differs from expected author" };
    }

    return { found: true, merged: true, authorMatches: true, actualAuthor, mergedAt, commitSha, prUrl, screenshotPath };
  } catch (err) {
    return {
      found: false,
      merged: false,
      authorMatches: false,
      actualAuthor: null,
      mergedAt: null,
      commitSha: null,
      prUrl,
      screenshotPath,
      failureReason: err instanceof Error ? `Network or scraping failure: ${err.message}` : "Unknown scout failure"
    };
  } finally {
    if (browser) await browser.close();
  }
}
