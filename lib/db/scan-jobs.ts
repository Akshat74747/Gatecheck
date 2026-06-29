import { pool } from './connection';

export type JobType = 'push_scan' | 'pr_scan' | 'cron_scan' | 'enrollment_backfill';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ScanJob {
  id: string;
  repo_id: string;
  commit_sha: string;
  job_type: JobType;
  status: JobStatus;
  pr_number: number | null;
  payload: unknown;
  error: string | null;
  attempts: number;
  max_attempts: number;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

export async function createScanJob(params: {
  repoId: string;
  commitSha: string;
  jobType: JobType;
  prNumber?: number;
  payload?: unknown;
}): Promise<ScanJob> {
  const result = await pool.query<ScanJob>(
    `INSERT INTO scan_jobs (repo_id, commit_sha, job_type, pr_number, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [params.repoId, params.commitSha, params.jobType,
     params.prNumber ?? null, JSON.stringify(params.payload ?? {})]
  );
  return result.rows[0];
}

/**
 * Claim the next pending job.
 * DSQL does not support FOR UPDATE / SKIP LOCKED, so we use a two-step
 * optimistic approach: SELECT the oldest pending job id, then UPDATE only
 * if it's still pending. The cron runs every 60s so double-claiming is
 * extremely unlikely; if it does happen, the second scan is idempotent
 * (findings are deduplicated by rule+file+line; halt decision uses most-severe-wins).
 */
export async function claimNextJob(): Promise<ScanJob | null> {
  // Reset stale processing jobs (stuck > 5 min due to function timeout) back to pending
  // Use epoch arithmetic instead of INTERVAL for DSQL compatibility
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await pool.query(
    `UPDATE scan_jobs
     SET status = 'pending', started_at = NULL
     WHERE status = 'processing'
       AND started_at < $1
       AND attempts < max_attempts`,
    [staleThreshold]
  );

  const select = await pool.query<{ id: string }>(
    `SELECT id FROM scan_jobs
     WHERE status = 'pending' AND attempts < max_attempts
     ORDER BY created_at ASC LIMIT 1`
  );
  if (!select.rows[0]) return null;

  const result = await pool.query<ScanJob>(
    `UPDATE scan_jobs
     SET status = 'processing', started_at = NOW(), attempts = attempts + 1
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [select.rows[0].id]
  );
  return result.rows[0] ?? null;
}

export async function completeJob(id: string): Promise<void> {
  await pool.query(
    `UPDATE scan_jobs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
    [id]
  );
}

export async function failJob(id: string, error: string): Promise<void> {
  await pool.query(
    `UPDATE scan_jobs
     SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
         error = $2,
         completed_at = CASE WHEN attempts >= max_attempts THEN NOW() ELSE NULL END
     WHERE id = $1`,
    [id, error]
  );
}
