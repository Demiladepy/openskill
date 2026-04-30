import { randomUUID } from "node:crypto";
import { requireRole } from "@/src/auth";
import { composeDecision } from "@/src/decision/compose";
import { q } from "@/src/db/db";
import { runSkillReputationBridge } from "@/src/integrations/skillReputation";
import { scrapePr } from "@/src/scout/scrape-pr";
import type { RunStatus } from "@/src/types";
import { runSchema } from "@/src/validation";
import { verifyBounty } from "@/src/verifier/verify";

function sseLine(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeWithRetry(input: Parameters<typeof scrapePr>[0], attempts = 2) {
  let last = await scrapePr(input);
  for (let i = 1; i < attempts; i++) {
    const transient =
      !last.found &&
      typeof last.failureReason === "string" &&
      (last.failureReason.toLowerCase().includes("network") || last.failureReason.toLowerCase().includes("rate limit"));
    if (!transient) return last;
    await sleep(500 * i);
    last = await scrapePr(input);
  }
  return last;
}

function emitStage(controller: ReadableStreamDefaultController, enc: TextEncoder, bountyId: string, stage: string, status: string, message?: string, payload?: unknown) {
  q.addRunEvent.run({
    bounty_id: bountyId,
    stage,
    status,
    message: message || null,
    payload_json: payload ? JSON.stringify(payload) : null,
    created_at: Date.now()
  });
  controller.enqueue(enc.encode(sseLine("stage", { stage, status, message })));
}

export async function POST(req: Request) {
  const authErr = requireRole(req, ["operator", "reviewer"]);
  if (authErr) return authErr;

  const body = await req.json().catch(() => null);
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const input = parsed.data;
  const bountyId = randomUUID();
  q.createBounty.run({
    id: bountyId,
    repo: input.repo,
    pr_number: input.prNumber,
    expected_author: input.expectedAuthor,
    bounty_title: input.bountyTitle,
    requested_amount_usd: input.requestedAmountUsd ?? null,
    notes: input.notes ?? null,
    priority: input.priority,
    status: "pending",
    created_at: Date.now(),
    updated_at: Date.now()
  });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        emitStage(controller, enc, bountyId, "scout", "running");
        const scout = await scrapeWithRetry({
          repo: input.repo,
          prNumber: input.prNumber,
          expectedAuthor: input.expectedAuthor,
          bountyId
        });
        emitStage(controller, enc, bountyId, "scout", "done", scout.failureReason, scout);
        controller.enqueue(enc.encode(sseLine("scout", scout)));

        emitStage(controller, enc, bountyId, "verifier", "running");
        const verdict = verifyBounty({ scout, bounty: { expectedAuthor: input.expectedAuthor } });
        emitStage(controller, enc, bountyId, "verifier", "done", verdict.reasons.join("; "), verdict);
        controller.enqueue(enc.encode(sseLine("verifier", verdict)));

        emitStage(controller, enc, bountyId, "reputation", "running");
        let reputation;
        try {
          reputation = await runSkillReputationBridge({
            bountyId,
            passed: verdict.passed,
            expectedAuthor: input.expectedAuthor
          });
          q.upsertReputationSnapshot.run({
            bounty_id: bountyId,
            score: reputation.score,
            confidence: reputation.confidence,
            reasons_json: JSON.stringify(reputation.reasons),
            provenance: reputation.provenance,
            details: reputation.details,
            created_at: Date.now()
          });
          emitStage(controller, enc, bountyId, "reputation", "done", reputation.details, reputation);
          controller.enqueue(enc.encode(sseLine("reputation", reputation)));
        } catch (bridgeError) {
          reputation = {
            enabled: true,
            score: verdict.passed ? 80 : 30,
            confidence: verdict.passed ? 0.72 : 0.62,
            reasons: ["Reputation subsystem failed; fallback heuristic applied."],
            provenance: "local-heuristic" as const,
            details: bridgeError instanceof Error ? `Reputation error: ${bridgeError.message}` : "Reputation subsystem failed"
          };
          q.upsertReputationSnapshot.run({
            bounty_id: bountyId,
            score: reputation.score,
            confidence: reputation.confidence,
            reasons_json: JSON.stringify(reputation.reasons),
            provenance: reputation.provenance,
            details: reputation.details,
            created_at: Date.now()
          });
          emitStage(controller, enc, bountyId, "reputation", "fallback", reputation.details, reputation);
          controller.enqueue(
            enc.encode(
              sseLine("reputation", reputation)
            )
          );
        }

        emitStage(controller, enc, bountyId, "decision", "running");
        const threshold = Number(process.env.DECISION_AUTO_APPROVE_THRESHOLD || "0.75");
        const decision = composeDecision({
          verifierPassed: verdict.passed,
          verifierReasons: verdict.reasons,
          reputation,
          autoApproveThreshold: Number.isFinite(threshold) ? threshold : 0.75
        });
        const status = decision.status as RunStatus;
        q.updateStatus.run({
          id: bountyId,
          status,
          confidence: decision.confidence,
          decision_reasons: JSON.stringify(decision.reasons),
          failure_code: null,
          updated_at: Date.now()
        });
        emitStage(controller, enc, bountyId, "decision", "done", decision.status, decision);
        controller.enqueue(enc.encode(sseLine("decision", decision)));
        controller.enqueue(enc.encode(sseLine("done", { bountyId, status })));
      } catch (error) {
        q.updateStatus.run({
          id: bountyId,
          status: "run_failed",
          confidence: null,
          decision_reasons: null,
          failure_code: "internal_error",
          updated_at: Date.now()
        });
        emitStage(controller, enc, bountyId, "run", "failed", error instanceof Error ? error.message : "Unknown pipeline error");
        controller.enqueue(
          enc.encode(
            sseLine("error", {
              bountyId,
              message: error instanceof Error ? error.message : "Unknown pipeline error"
            })
          )
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
