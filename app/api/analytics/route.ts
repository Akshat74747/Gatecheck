import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('repoId');
  const days = parseInt(searchParams.get('days') ?? '30', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const repoFilter = repoId ? `AND repo_id=$2` : '';
  const baseVals = repoId ? [since, repoId] : [since];

  const [reviewStats, findingStats, agentStats, dailyFindings, ciScans] = await Promise.all([
    // Verdict distribution
    pool.query(
      `SELECT verdict, COUNT(*) as count FROM pr_reviews
       WHERE created_at > $1 AND status='complete' ${repoFilter}
       GROUP BY verdict`,
      baseVals
    ),
    // Finding severity totals
    pool.query(
      `SELECT severity, COUNT(*) as count FROM findings
       WHERE created_at > $1 ${repoFilter}
       GROUP BY severity`,
      baseVals
    ),
    // Findings by agent type — only count from completed reviews to avoid double-counting retries
    pool.query(
      `SELECT agent_type, SUM(finding_count) as count FROM agent_reports ar
       JOIN pr_reviews rv ON ar.review_id = rv.id
       WHERE ar.created_at > $1 AND ar.status='complete' AND rv.status='complete' ${repoFilter ? `AND rv.repo_id=$2` : ''}
       GROUP BY agent_type`,
      baseVals
    ),
    // Daily findings breakdown
    pool.query(
      `SELECT DATE_TRUNC('day', created_at) as day, severity, COUNT(*) as count
       FROM findings WHERE created_at > $1 ${repoFilter}
       GROUP BY day, severity ORDER BY day ASC`,
      baseVals
    ),
    // CI scan count
    pool.query(
      `SELECT COUNT(*) as count FROM scan_jobs
       WHERE job_type='push_scan' AND status='completed' AND created_at > $1 ${repoFilter ? `AND repo_id=$2` : ''}`,
      baseVals
    ),
  ]);

  const verdictDist: Record<string, number> = {};
  for (const row of reviewStats.rows) verdictDist[row.verdict ?? 'pending'] = parseInt(row.count);

  const totalReviews = Object.values(verdictDist).reduce((a, b) => a + b, 0);
  const approvalRate = totalReviews > 0
    ? Math.round(((verdictDist['approve'] ?? 0) / totalReviews) * 100)
    : 0;

  const totalFindings = findingStats.rows.reduce((a: number, r: {count: string}) => a + parseInt(r.count), 0);
  const criticalFindings = parseInt(findingStats.rows.find((r: {severity: string}) => r.severity === 'critical')?.count ?? '0');

  // Avg confidence
  const confRow = await pool.query(
    `SELECT AVG(confidence_score) as avg FROM pr_reviews WHERE created_at>$1 AND status='complete' ${repoFilter}`,
    baseVals
  );
  const avgConfidence = Math.round(parseFloat(confRow.rows[0]?.avg ?? '0') || 0);

  return NextResponse.json({
    stats: {
      totalReviews,
      ciScans: parseInt(ciScans.rows[0]?.count ?? '0'),
      totalFindings,
      criticalFindings,
      avgConfidence,
      approvalRate,
    },
    verdictDistribution: verdictDist,
    findingsBySeverity: Object.fromEntries(
      findingStats.rows.map((r: {severity: string; count: string}) => [r.severity, parseInt(r.count)])
    ),
    findingsByAgent: Object.fromEntries(
      agentStats.rows.map((r: {agent_type: string; count: string}) => [r.agent_type, parseInt(r.count)])
    ),
    dailyFindings: dailyFindings.rows.map((r: {day: string; severity: string; count: string}) => ({
      day: r.day,
      severity: r.severity,
      count: parseInt(r.count),
    })),
  });
}
