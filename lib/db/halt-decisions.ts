import { pool } from './connection';

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

export interface HaltDecisionParams {
  repoId: string;
  commitSha: string;
  decision: 'halt' | 'allow';
  severity: string;
  reason: string;
  findingIds: string[];
  expiresAt: Date;
}

/**
 * Write a halt decision with most-severe-wins semantics.
 *
 * Uses INSERT … ON CONFLICT with a conditional UPDATE: only overwrites
 * if the incoming severity outranks the stored one. On DSQL serialization
 * failure (error code 40001) retries up to maxRetries times with exponential backoff.
 *
 * Returns the number of retries consumed (useful for verifying the retry path in tests).
 */
export async function writeHaltDecision(
  params: HaltDecisionParams,
  maxRetries = 3
): Promise<{ retries: number }> {
  const { repoId, commitSha, decision, severity, reason, findingIds, expiresAt } = params;
  const incomingRank = SEVERITY_RANK[severity] ?? 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await pool.query(
        `INSERT INTO halt_decisions
           (repo_id, commit_sha, decision, severity, reason, finding_ids, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (repo_id, commit_sha) DO UPDATE SET
           decision    = CASE WHEN $8 > (
             CASE halt_decisions.severity
               WHEN 'critical' THEN 4 WHEN 'high' THEN 3
               WHEN 'medium'   THEN 2 WHEN 'low'  THEN 1 ELSE 0 END
           ) THEN EXCLUDED.decision    ELSE halt_decisions.decision    END,
           severity    = CASE WHEN $8 > (
             CASE halt_decisions.severity
               WHEN 'critical' THEN 4 WHEN 'high' THEN 3
               WHEN 'medium'   THEN 2 WHEN 'low'  THEN 1 ELSE 0 END
           ) THEN EXCLUDED.severity    ELSE halt_decisions.severity    END,
           reason      = CASE WHEN $8 > (
             CASE halt_decisions.severity
               WHEN 'critical' THEN 4 WHEN 'high' THEN 3
               WHEN 'medium'   THEN 2 WHEN 'low'  THEN 1 ELSE 0 END
           ) THEN EXCLUDED.reason      ELSE halt_decisions.reason      END,
           finding_ids = (
             SELECT jsonb_agg(DISTINCT val)
             FROM jsonb_array_elements(halt_decisions.finding_ids || EXCLUDED.finding_ids) AS val
           ),
           updated_at  = NOW()`,
        [repoId, commitSha, decision, severity, reason, JSON.stringify(findingIds), expiresAt, incomingRank]
      );
      return { retries: attempt };
    } catch (err: unknown) {
      // DSQL serialization failure — retry with exponential backoff
      const code = (err as { code?: string }).code;
      if (code === '40001' && attempt < maxRetries) {
        console.warn(`[halt-decisions] serialization conflict, retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, 50 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  // Should be unreachable
  throw new Error('writeHaltDecision: exhausted retries');
}

export interface HaltDecisionResult {
  halt: boolean;
  severity?: string;
  reason?: string;
  findingIds?: string[];
}

/**
 * Read a halt decision — called by the runtime Action via GET /api/pipeline/decision.
 * Returns { halt: false } if no unexpired decision exists for this repo+sha.
 */
export async function readHaltDecision(
  repoId: string,
  commitSha: string
): Promise<HaltDecisionResult> {
  const result = await pool.query(
    `SELECT decision, severity, reason, finding_ids
     FROM halt_decisions
     WHERE repo_id = $1 AND commit_sha = $2 AND expires_at > NOW()`,
    [repoId, commitSha]
  );

  if (result.rows.length === 0) {
    return { halt: false, reason: 'no decision found' };
  }

  const row = result.rows[0];
  return {
    halt: row.decision === 'halt',
    severity: row.severity,
    reason: row.reason,
    findingIds: row.finding_ids,
  };
}
