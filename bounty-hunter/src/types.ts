export type ScoutResult = {
  found: boolean;
  merged: boolean;
  authorMatches: boolean;
  actualAuthor: string | null;
  mergedAt: string | null;
  commitSha: string | null;
  prUrl: string;
  screenshotPath: string;
  failureReason?: string;
};

export type BountyRules = {
  expectedAuthor: string;
};

export type RunStatus =
  | "pending"
  | "approved_for_payment"
  | "rejected"
  | "needs_manual_review"
  | "run_failed";

export type ReputationSignal = {
  enabled: boolean;
  score: number;
  confidence: number;
  reasons: string[];
  provenance: "local-heuristic" | "skill-reputation-scanner";
  details: string;
};

export type DecisionResult = {
  status: Exclude<RunStatus, "pending" | "run_failed">;
  confidence: number;
  reasons: string[];
  readyForFinance: boolean;
};
