CREATE TABLE IF NOT EXISTS bounties (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  expected_author TEXT NOT NULL,
  bounty_title TEXT NOT NULL,
  requested_amount_usd REAL,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
  status TEXT NOT NULL CHECK(status IN ('pending','approved_for_payment','rejected','needs_manual_review','run_failed')),
  confidence REAL,
  decision_reasons TEXT,
  failure_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bounty_id TEXT NOT NULL REFERENCES bounties(id),
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  payload_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reputation_snapshots (
  bounty_id TEXT PRIMARY KEY REFERENCES bounties(id),
  score REAL NOT NULL,
  confidence REAL NOT NULL,
  reasons_json TEXT NOT NULL,
  provenance TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
