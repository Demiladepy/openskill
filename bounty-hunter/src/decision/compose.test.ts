import assert from "node:assert/strict";
import test from "node:test";
import type { ReputationSignal } from "../types";
import { composeDecision } from "./compose.ts";

const positiveReputation: ReputationSignal = {
  enabled: true,
  score: 87,
  confidence: 0.82,
  reasons: ["Strong prior outcomes."],
  provenance: "local-heuristic",
  details: "ok"
};

test("approves when verifier passes and confidence is high", () => {
  const result = composeDecision({
    verifierPassed: true,
    verifierReasons: ["All checks passed"],
    reputation: positiveReputation,
    autoApproveThreshold: 0.75
  });
  assert.equal(result.status, "approved_for_payment");
  assert.equal(result.readyForFinance, true);
});

test("routes to manual review when confidence below threshold", () => {
  const result = composeDecision({
    verifierPassed: true,
    verifierReasons: ["All checks passed"],
    reputation: { ...positiveReputation, confidence: 0.5 },
    autoApproveThreshold: 0.75
  });
  assert.equal(result.status, "needs_manual_review");
  assert.equal(result.readyForFinance, false);
});

test("rejects when verifier does not pass", () => {
  const result = composeDecision({
    verifierPassed: false,
    verifierReasons: ["PR not merged"],
    reputation: positiveReputation,
    autoApproveThreshold: 0.75
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.readyForFinance, false);
});
