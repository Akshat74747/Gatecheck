import { pool } from './connection';

// Aurora DSQL limitations applied here:
// - No foreign key constraints (no REFERENCES) — enforced at application layer
// - No ON DELETE CASCADE
// - Indexes must use CREATE INDEX ASYNC
// - CHECK constraints are supported
// - gen_random_uuid() is built-in (no pgcrypto needed)
const DDL_STATEMENTS = [
  // 1. repos: connected GitHub repositories
  `CREATE TABLE IF NOT EXISTS repos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id            BIGINT UNIQUE NOT NULL,
    owner                VARCHAR(255) NOT NULL,
    name                 VARCHAR(255) NOT NULL,
    full_name            VARCHAR(512) NOT NULL,
    installation_id      BIGINT NOT NULL,
    is_security_enrolled BOOLEAN DEFAULT FALSE,
    default_branch       VARCHAR(255) DEFAULT 'main',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 2. policies: per-repo rule enforcement levels
  // repo_id references repos.id — enforced in application code
  `CREATE TABLE IF NOT EXISTS policies (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id    UUID NOT NULL,
    rule_id    VARCHAR(128) NOT NULL,
    action     VARCHAR(16) NOT NULL DEFAULT 'warn' CHECK (action IN ('block', 'warn', 'off')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repo_id, rule_id)
  )`,

  // 3. findings: IMMUTABLE append-only scan results
  // No updated_at by design. No UPDATE/DELETE paths exist in application code.
  `CREATE TABLE IF NOT EXISTS findings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id     UUID NOT NULL,
    commit_sha  VARCHAR(64) NOT NULL,
    rule_id     VARCHAR(128) NOT NULL,
    severity    VARCHAR(16) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    file_path   TEXT NOT NULL,
    line_number INTEGER,
    message     TEXT NOT NULL,
    snippet     TEXT,
    pr_number   INTEGER,
    scan_type   VARCHAR(16) NOT NULL CHECK (scan_type IN ('push', 'pr', 'cron', 'manual')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 4. resolutions: mutable resolution status — separate from findings (immutability preserved)
  `CREATE TABLE IF NOT EXISTS resolutions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id  UUID UNIQUE NOT NULL,
    status      VARCHAR(32) NOT NULL CHECK (status IN ('fixed', 'muted', 'false_positive', 'accepted_risk')),
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMPTZ DEFAULT NOW(),
    notes       TEXT
  )`,

  // 5. halt_decisions: THE hot path — concurrent-write safe, most-severe-wins
  // UNIQUE(repo_id, commit_sha) enables ON CONFLICT upsert logic in writeHaltDecision()
  `CREATE TABLE IF NOT EXISTS halt_decisions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id     UUID NOT NULL,
    commit_sha  VARCHAR(64) NOT NULL,
    decision    VARCHAR(16) NOT NULL CHECK (decision IN ('halt', 'allow')),
    severity    VARCHAR(16) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'none')),
    reason      TEXT,
    finding_ids JSONB DEFAULT '[]',
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repo_id, commit_sha)
  )`,

  // 6. scan_jobs: replaces BullMQ — DSQL as job queue
  `CREATE TABLE IF NOT EXISTS scan_jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id      UUID NOT NULL,
    commit_sha   VARCHAR(64) NOT NULL,
    job_type     VARCHAR(32) NOT NULL CHECK (job_type IN ('push_scan', 'pr_scan', 'cron_scan', 'enrollment_backfill')),
    status       VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    pr_number    INTEGER,
    payload      JSONB,
    error        TEXT,
    attempts     INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
  )`,

  // Indexes — DSQL requires ASYNC
  `CREATE INDEX ASYNC IF NOT EXISTS idx_halt_decisions_lookup ON halt_decisions(repo_id, commit_sha)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_scan_jobs_pending ON scan_jobs(status, created_at)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_findings_repo ON findings(repo_id, created_at)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_findings_repo_sha ON findings(repo_id, commit_sha)`,
];

export async function runMigration(): Promise<{ tables: string[]; warnings: string[] }> {
  const warnings: string[] = [];

  for (const stmt of DDL_STATEMENTS) {
    const preview = stmt.trimStart().slice(0, 70).replace(/\s+/g, ' ');
    try {
      await pool.query(stmt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already exists')) {
        warnings.push(`Already exists, skipped: ${preview}…`);
      } else {
        throw new Error(`Migration failed: ${preview}…\n${msg}`);
      }
    }
  }

  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  const tables = result.rows.map((r: { table_name: string }) => r.table_name);

  return { tables, warnings };
}
