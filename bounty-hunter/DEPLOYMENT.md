# Deployment and Operations Runbook

This service deploys as a single Next.js product (`bounty-hunter`) with optional reputation enrichment from local SkillReputation scripts.

## 1) Recommended production shape

- Web + API: one Next.js deployment (`npm run build && npm run start`).
- Database: Postgres in production, SQLite for local development.
- Artifact storage: object storage for `audit/` screenshots.
- Monitoring: structured logs + error tracking + latency dashboard.

## 2) Environment variables

Required:

- `DB_PATH` (or your production DB connection override once Postgres adapter is added)
- `DECISION_AUTO_APPROVE_THRESHOLD` (example: `0.75`)

Optional security:

- `APP_API_TOKEN` (if set, require `x-api-token` and `x-role`)

Optional reputation integration:

- `BH_ENABLE_SKILL_REPUTATION=1`
- `SKILL_REPUTATION_SKILL_DIR=../skill-reputation/skill`

## 3) Build and start

```bash
npm install
npx playwright install chromium
npm run build
npm run start
```

## 4) Health and smoke checks

After deploy:

1. Open the dashboard and submit a known passing run.
2. Verify timeline stages appear in order: scout -> verifier -> reputation -> decision.
3. Confirm a final decision status is persisted in recent runs.
4. Check contributors endpoint reflects the author stats update.

## 5) SLO and alert recommendations

- Run completion success rate (excluding upstream GitHub outages): >= 99%.
- Median run latency (submission to final decision): <= 20 seconds.
- Manual review share alert: trigger if > 25% over rolling 24h.
- Pipeline failure alert: trigger on `run_failed` spikes.

## 6) Incident handling

- `run_failed` with network/rate-limit reason: retry run.
- Repeated selector parse failures: update scout selectors and add regression fixture.
- Reputation integration failures: fallback heuristic will still produce decision; investigate SkillReputation sidecar separately.

## 7) Release checklist

1. `npm run test:verifier`
2. `npm run test:decision`
3. `npm run test:scout`
4. `npm run build`
5. Validate env variables on deployment target
6. Run smoke checks and monitor first 10 runs
