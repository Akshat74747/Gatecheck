import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/connection';
import { writeHaltDecision, readHaltDecision } from '@/lib/db/halt-decisions';
import { randomUUID } from 'crypto';

// This endpoint proves the core architectural claim:
// concurrent writes for the same repo+sha always resolve to the most severe decision.
//
// Safe to call in demo/dev — seeds a temporary repo row and cleans it up after.
export async function GET() {
  const repoId = randomUUID();
  const commitSha = 'test-' + randomUUID().slice(0, 8);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Seed a disposable repo row so the foreign key constraint is satisfied
  await pool.query(
    `INSERT INTO repos (id, github_id, owner, name, full_name, installation_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [repoId, Math.floor(Math.random() * 1e12), 'test-owner', 'test-repo', 'test-owner/test-repo', 0]
  );

  // Fire 5 concurrent writes with different severities.
  // Expected winner: 'critical' (rank 4).
  const candidates = [
    { decision: 'halt' as const, severity: 'low',      reason: 'rule-A', findingIds: ['id-A'] },
    { decision: 'halt' as const, severity: 'medium',   reason: 'rule-B', findingIds: ['id-B'] },
    { decision: 'halt' as const, severity: 'high',     reason: 'rule-C', findingIds: ['id-C'] },
    { decision: 'halt' as const, severity: 'critical', reason: 'rule-D', findingIds: ['id-D'] },
    { decision: 'halt' as const, severity: 'medium',   reason: 'rule-E', findingIds: ['id-E'] },
  ];

  const results = await Promise.allSettled(
    candidates.map(c =>
      writeHaltDecision({ repoId, commitSha, ...c, expiresAt })
    )
  );

  const totalRetries = results.reduce((sum, r) => {
    if (r.status === 'fulfilled') return sum + r.value.retries;
    return sum;
  }, 0);

  const failures = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason?.message ?? String(r));

  const stored = await readHaltDecision(repoId, commitSha);

  // Cleanup — remove the test repo (cascades to halt_decisions)
  await pool.query('DELETE FROM repos WHERE id = $1', [repoId]);

  const pass = stored.severity === 'critical' && failures.length === 0;

  return NextResponse.json({
    pass,
    expected: 'critical',
    storedSeverity: stored.severity,
    storedDecision: stored.halt ? 'halt' : 'allow',
    totalRetries,
    failures,
    note: totalRetries > 0
      ? 'Serialization conflicts occurred and were retried successfully'
      : 'No serialization conflicts — all writes succeeded without retry (normal for low concurrency)',
  });
}
