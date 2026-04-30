import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { RunStatus } from "../types";

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), "bounty-hunter-ai.db");
const db = new Database(dbPath);
const schemaPath = path.resolve(process.cwd(), "src/db/schema.sql");

function tableExists(name: string) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name) as { name?: string } | undefined;
  return Boolean(row?.name);
}

function columnExists(table: string, column: string) {
  if (!tableExists(table)) return false;
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function migrateLegacyBountiesIfNeeded() {
  if (!tableExists("bounties")) return;
  if (columnExists("bounties", "bounty_title")) return;

  if (tableExists("payouts")) {
    db.exec("DROP TABLE payouts");
  }

  db.exec("ALTER TABLE bounties RENAME TO bounties_legacy");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);

  db.exec(`
    INSERT INTO bounties (
      id, repo, pr_number, expected_author, bounty_title, requested_amount_usd, notes, priority, status, confidence, decision_reasons, failure_code, created_at, updated_at
    )
    SELECT
      id,
      repo,
      pr_number,
      expected_author,
      'Legacy imported run' as bounty_title,
      CASE WHEN typeof(amount_usdc) IN ('text','integer','real') THEN CAST(amount_usdc AS REAL) ELSE NULL END as requested_amount_usd,
      'Imported from legacy schema' as notes,
      'normal' as priority,
      CASE status
        WHEN 'paid' THEN 'approved_for_payment'
        WHEN 'verified' THEN 'approved_for_payment'
        WHEN 'failed' THEN 'rejected'
        ELSE 'pending'
      END as status,
      NULL as confidence,
      NULL as decision_reasons,
      NULL as failure_code,
      created_at,
      created_at
    FROM bounties_legacy
  `);

  db.exec("DROP TABLE bounties_legacy");
}

migrateLegacyBountiesIfNeeded();
if (tableExists("payouts")) {
  db.exec("DROP TABLE payouts");
}
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

export type BountyRow = {
  id: string;
  repo: string;
  pr_number: number;
  expected_author: string;
  bounty_title: string;
  requested_amount_usd: number | null;
  notes: string | null;
  priority: "low" | "normal" | "high";
  status: RunStatus;
  confidence: number | null;
  decision_reasons: string | null;
  failure_code: string | null;
  created_at: number;
  updated_at: number;
};

export const q = {
  createBounty: db.prepare(
    "INSERT INTO bounties (id, repo, pr_number, expected_author, bounty_title, requested_amount_usd, notes, priority, status, created_at, updated_at) VALUES (@id,@repo,@pr_number,@expected_author,@bounty_title,@requested_amount_usd,@notes,@priority,@status,@created_at,@updated_at)"
  ),
  updateStatus: db.prepare(
    "UPDATE bounties SET status=@status, confidence=@confidence, decision_reasons=@decision_reasons, failure_code=@failure_code, updated_at=@updated_at WHERE id=@id"
  ),
  addRunEvent: db.prepare(
    "INSERT INTO run_events (bounty_id, stage, status, message, payload_json, created_at) VALUES (@bounty_id,@stage,@status,@message,@payload_json,@created_at)"
  ),
  upsertReputationSnapshot: db.prepare(
    "INSERT INTO reputation_snapshots (bounty_id, score, confidence, reasons_json, provenance, details, created_at) VALUES (@bounty_id,@score,@confidence,@reasons_json,@provenance,@details,@created_at) ON CONFLICT(bounty_id) DO UPDATE SET score=excluded.score, confidence=excluded.confidence, reasons_json=excluded.reasons_json, provenance=excluded.provenance, details=excluded.details, created_at=excluded.created_at"
  ),
  getBounty: db.prepare("SELECT * FROM bounties WHERE id = ?"),
  listBounties: db.prepare("SELECT * FROM bounties WHERE (?1 IS NULL OR status = ?1) ORDER BY created_at DESC"),
  listRunEvents: db.prepare("SELECT * FROM run_events WHERE bounty_id = ? ORDER BY created_at ASC"),
  listContributors: db.prepare(
    "SELECT expected_author as github_username, COUNT(*) as total_runs, SUM(CASE WHEN status = 'approved_for_payment' THEN 1 ELSE 0 END) as approved_count, SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count, AVG(COALESCE(confidence, 0)) as avg_confidence FROM bounties GROUP BY expected_author ORDER BY approved_count DESC, avg_confidence DESC"
  ),
  skillProfile: db.prepare(
    "SELECT expected_author as github_username, COUNT(*) as total_runs, SUM(CASE WHEN status = 'approved_for_payment' THEN 1 ELSE 0 END) as approved_count, SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count, AVG(COALESCE(confidence, 0)) as avg_confidence FROM bounties WHERE expected_author = ?1 GROUP BY expected_author"
  )
};

export default db;
