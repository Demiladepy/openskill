import type { BountyRules, ScoutResult } from "../types";

export function verifyBounty(input: { scout: ScoutResult; bounty: BountyRules }): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!input.scout.found) reasons.push("PR not found");
  if (!input.scout.merged) reasons.push("PR not merged");
  if (!input.scout.authorMatches) reasons.push(`Expected author ${input.bounty.expectedAuthor}, got ${input.scout.actualAuthor ?? "unknown"}`);

  return {
    passed: reasons.length === 0,
    reasons: reasons.length === 0 ? ["All verification checks passed"] : reasons
  };
}
