import { pool } from './connection';

export interface PullRequest {
  id: string;
  repo_id: string;
  pr_number: number;
  title: string;
  author: string | null;
  head_sha: string;
  head_branch: string | null;
  base_branch: string;
  html_url: string | null;
  status: 'pending' | 'reviewing' | 'reviewed' | 'failed';
  review_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function upsertPullRequest(params: {
  repoId: string;
  prNumber: number;
  title: string;
  author?: string;
  headSha: string;
  headBranch?: string;
  baseBranch: string;
  htmlUrl?: string;
}): Promise<PullRequest> {
  // DSQL async indexes can't back ON CONFLICT constraints — use SELECT then INSERT/UPDATE
  const existing = await getPrByRepoAndNumber(params.repoId, params.prNumber);
  if (existing) {
    const r = await pool.query<PullRequest>(
      `UPDATE pull_requests SET
         title=$1, author=$2, head_sha=$3, head_branch=$4,
         base_branch=$5, html_url=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [params.title, params.author ?? null, params.headSha,
       params.headBranch ?? null, params.baseBranch, params.htmlUrl ?? null, existing.id],
    );
    return r.rows[0];
  }
  const r = await pool.query<PullRequest>(
    `INSERT INTO pull_requests
       (repo_id, pr_number, title, author, head_sha, head_branch, base_branch, html_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [params.repoId, params.prNumber, params.title, params.author ?? null,
     params.headSha, params.headBranch ?? null, params.baseBranch, params.htmlUrl ?? null],
  );
  return r.rows[0];
}

export async function updatePrStatus(
  id: string,
  status: PullRequest['status'],
  reviewId?: string,
): Promise<void> {
  await pool.query(
    `UPDATE pull_requests SET status=$1, review_id=COALESCE($2, review_id), updated_at=NOW() WHERE id=$3`,
    [status, reviewId ?? null, id]
  );
}

export async function getPrById(id: string): Promise<PullRequest | null> {
  const r = await pool.query<PullRequest>(`SELECT * FROM pull_requests WHERE id=$1`, [id]);
  return r.rows[0] ?? null;
}

export async function getPrByRepoAndNumber(repoId: string, prNumber: number): Promise<PullRequest | null> {
  const r = await pool.query<PullRequest>(
    `SELECT * FROM pull_requests WHERE repo_id=$1 AND pr_number=$2`, [repoId, prNumber]
  );
  return r.rows[0] ?? null;
}

export async function listPrs(params: { repoId?: string; status?: string; limit?: number }): Promise<PullRequest[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (params.repoId) { values.push(params.repoId); conditions.push(`repo_id=$${values.length}`); }
  if (params.status)  { values.push(params.status);  conditions.push(`status=$${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(params.limit ?? 100);
  const r = await pool.query<PullRequest>(
    `SELECT * FROM pull_requests ${where} ORDER BY created_at DESC LIMIT $${values.length}`,
    values
  );
  return r.rows;
}
