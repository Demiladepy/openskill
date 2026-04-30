import type { DecisionResult, ReputationSignal } from "../types";

export function composeDecision(input: {
  verifierPassed: boolean;
  verifierReasons: string[];
  reputation: ReputationSignal;
  autoApproveThreshold: number;
}): DecisionResult {
  const confidence = Number(((input.reputation.confidence + (input.verifierPassed ? 0.12 : -0.18))).toFixed(2));
  const reasons = [...input.verifierReasons, ...input.reputation.reasons];

  if (!input.verifierPassed) {
    return {
      status: "rejected",
      confidence: Math.max(0, confidence),
      reasons,
      readyForFinance: false
    };
  }

  if (confidence < input.autoApproveThreshold) {
    return {
      status: "needs_manual_review",
      confidence,
      reasons: [...reasons, `Confidence ${confidence} below auto-approve threshold ${input.autoApproveThreshold}.`],
      readyForFinance: false
    };
  }

  return {
    status: "approved_for_payment",
    confidence,
    reasons,
    readyForFinance: true
  };
}
