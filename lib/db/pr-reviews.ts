import { pool } from './connection';

export interface PrReview {
  id: string;
  pr_id: string;
  repo_id: string;
  commit_sha: string;
  verdict: 'approve' | 'request_changes' | 'comment' | null;
  confidence_score: number | null;
  summary: string | null;
  top_actions: string[];
  changelog_entry: string | null;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  duration_ms: number | null;
  status: 'running' | 'complete' | 'failed';
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createReview(params: {
  prId: string;
  repoId: string;
  commitSha: string;
}): Promise<PrReview> {
  const r = await pool.query<PrReview>(
    `INSERT INTO pr_reviews (pr_id, repo_id, commit_sha) VALUES ($1,$2,$3) RETURNING *`,
    [params.prId, params.repoId, params.commitSha]
  );
  return r.rows[0];
}

export async function updateReview(id: string, updates: Partial<{
  verdict: string;
  confidence_score: number;
  summary: string;
  top_actions: string[];
  changelog_entry: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  duration_ms: number;
  status: string;
  error: string;
}>): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    vals.push(typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v);
    const col = k === 'top_actions' ? `top_actions` : k;
    sets.push(`${col}=$${vals.length}`);
  }
  if (!sets.length) return;
  vals.push(id);
  await pool.query(`UPDATE pr_reviews SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${vals.length}`, vals);
}

export async function getReviewByPrId(prId: string): Promise<PrReview | null> {
  const r = await pool.query<PrReview>(
    `SELECT * FROM pr_reviews WHERE pr_id=$1 ORDER BY created_at DESC LIMIT 1`, [prId]
  );
  return r.rows[0] ?? null;
}

export async function getReviewById(id: string): Promise<PrReview | null> {
  const r = await pool.query<PrReview>(`SELECT * FROM pr_reviews WHERE id=$1`, [id]);
  return r.rows[0] ?? null;
}
