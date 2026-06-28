import { pool } from './connection';

export interface FindingRow {
  id: string;
  repo_id: string;
  commit_sha: string;
  rule_id: string;
  severity: string;
  file_path: string;
  line_number: number | null;
  message: string;
  snippet: string | null;
  pr_number: number | null;
  scan_type: string;
  created_at: Date;
}

/**
 * Insert a finding. This is the ONLY write path for the findings table.
 * No updateFinding or deleteFinding exists — by design.
 * Resolutions go in the separate `resolutions` table.
 */
export async function insertFinding(params: {
  repoId: string;
  commitSha: string;
  ruleId: string;
  severity: string;
  filePath: string;
  lineNumber?: number;
  message: string;
  snippet?: string;
  prNumber?: number;
  scanType: 'push' | 'pr' | 'cron' | 'manual';
}): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO findings
       (repo_id, commit_sha, rule_id, severity, file_path, line_number, message, snippet, pr_number, scan_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      params.repoId, params.commitSha, params.ruleId, params.severity,
      params.filePath, params.lineNumber ?? null, params.message,
      params.snippet ?? null, params.prNumber ?? null, params.scanType,
    ]
  );
  return result.rows[0].id;
}

export async function getFindingsForRepo(
  repoId: string,
  limit = 100,
): Promise<FindingRow[]> {
  const result = await pool.query<FindingRow>(
    `SELECT * FROM findings WHERE repo_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [repoId, limit]
  );
  return result.rows;
}

export async function getFindingsForCommit(
  repoId: string,
  commitSha: string,
): Promise<FindingRow[]> {
  const result = await pool.query<FindingRow>(
    `SELECT * FROM findings WHERE repo_id = $1 AND commit_sha = $2 ORDER BY created_at DESC`,
    [repoId, commitSha]
  );
  return result.rows;
}
