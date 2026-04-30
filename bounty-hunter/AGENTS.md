# Bounty Hunter AI Ops + SkillReputation + gstack

This workspace now runs as one AI-first product plus two support layers:

1) **Bounty Hunter AI Ops** runs scout/verifier/reputation/decision for PR bounties.
2) **SkillReputation integration** (optional) enriches reputation signals through scanner output.
3) **gstack** remains a developer workflow aid for repeatable planning/review/ship habits.

## Runbook

- Plan: `Load gstack. Run /autoplan`
- Build: run `bounty-hunter` and test end-to-end
- Review: `Load gstack. Run /review`
- Ship: `Load gstack. Run /ship`

## Bridge env flags

Set these in `bounty-hunter/.env.local`:

- `BH_ENABLE_SKILL_REPUTATION=1` to enable the sidecar bridge
- `SKILL_REPUTATION_SKILL_DIR=../skill-reputation/skill` (optional override)
- `DECISION_AUTO_APPROVE_THRESHOLD=0.75` for auto-approve vs manual review routing
- `APP_API_TOKEN=<token>` to require API token + role headers

The bridge expects `skill-reputation/skill/.env` to exist because it invokes:

- `node scripts/scanner.js`

If disabled or missing env, a local heuristic reputation fallback still runs.
