import test from "node:test";
import assert from "node:assert/strict";
import { verifyBounty } from "./verify.ts";
import type { ScoutResult } from "../types";

const baseScout: ScoutResult = {
  found: true,
  merged: true,
  authorMatches: true,
  actualAuthor: "alice",
  mergedAt: new Date().toISOString(),
  commitSha: "0xabc",
  prUrl: "https://github.com/foo/bar/pull/1",
  screenshotPath: "audit/x.png"
};

test("verifier passes valid scout result", () => {
  const r = verifyBounty({ scout: baseScout, bounty: { expectedAuthor: "alice" } });
  assert.equal(r.passed, true);
});

test("verifier fails missing PR", () => {
  const r = verifyBounty({ scout: { ...baseScout, found: false }, bounty: { expectedAuthor: "alice" } });
  assert.equal(r.passed, false);
  assert.ok(r.reasons.some((x) => x.includes("not found")));
});

test("verifier fails open PR", () => {
  const r = verifyBounty({ scout: { ...baseScout, merged: false }, bounty: { expectedAuthor: "alice" } });
  assert.equal(r.passed, false);
  assert.ok(r.reasons.some((x) => x.includes("not merged")));
});

test("verifier fails author mismatch", () => {
  const r = verifyBounty({ scout: { ...baseScout, authorMatches: false, actualAuthor: "bob" }, bounty: { expectedAuthor: "alice" } });
  assert.equal(r.passed, false);
  assert.ok(r.reasons.some((x) => x.includes("Expected author")));
});
