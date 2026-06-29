import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/connection';
import { getRepoById } from '@/lib/db/repos';

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(n), min), max);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;
  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10);

  const repo = await getRepoById(repoId);
  if (!repo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // --- Findings debt ---
  const findingsRes = await pool.query<{
    severity: string; cnt: string;
  }>(
    `SELECT severity, COUNT(*) as cnt FROM findings WHERE repo_id=$1 GROUP BY severity`,
    [repoId],
  );
  const bySev: Record<string, number> = {};
  for (const r of findingsRes.rows) bySev[r.severity] = parseInt(r.cnt, 10);

  const WEIGHTS: Record<string, number> = { critical: 10, high: 5, medium: 2, low: 1 };
  const weightedSum = Object.entries(bySev).reduce(
    (acc, [sev, cnt]) => acc + (WEIGHTS[sev] ?? 0) * cnt, 0,
  );
  const debtRatio = Math.min(weightedSum / 50, 1);
  const debtScore = (1 - debtRatio) * 40;

  const totalFindings = Object.values(bySev).reduce((a, b) => a + b, 0);
  const criticalFindings = bySev.critical ?? 0;
  const highFindings = bySev.high ?? 0;

  // --- AI confidence ---
  const confRes = await pool.query<{ avg_conf: string; cnt: string }>(
    `SELECT AVG(confidence_score) as avg_conf, COUNT(*) as cnt
     FROM pr_reviews WHERE repo_id=$1 AND status='complete'
     ORDER BY created_at DESC LIMIT 30`,
    [repoId],
  );
  const prsAnalyzed = parseInt(confRes.rows[0]?.cnt ?? '0', 10);
  const avgConfidence = Math.round(parseFloat(confRes.rows[0]?.avg_conf ?? '0') || 0);
  const confidenceScore = (avgConfidence / 100) * 30;

  // --- Scan coverage ---
  const scanRes = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM scan_jobs
     WHERE repo_id=$1 AND status='completed'`,
    [repoId],
  );
  const totalScans = parseInt(scanRes.rows[0]?.cnt ?? '0', 10);
  const coverageRatio = Math.min(totalScans / 10, 1);
  const coverageScore = coverageRatio * 30;

  // --- Composite score ---
  const healthScore = clamp(debtScore + confidenceScore + coverageScore, 0, 100);
  const label = healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Needs Attention' : 'At Risk';

  // --- Weekly findings trend ---
  const trendRes = await pool.query<{ week: string; severity: string; cnt: string }>(
    `SELECT
       DATE_TRUNC('week', created_at)::DATE::TEXT as week,
       severity,
       COUNT(*) as cnt
     FROM findings
     WHERE repo_id=$1 AND created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY week, severity
     ORDER BY week ASC`,
    [repoId],
  );
  const weekMap: Record<string, Record<string, number>> = {};
  for (const r of trendRes.rows) {
    if (!weekMap[r.week]) weekMap[r.week] = {};
    weekMap[r.week][r.severity] = parseInt(r.cnt, 10);
  }
  const weeklyFindings = Object.entries(weekMap).map(([week, sevs]) => ({
    week,
    critical: sevs.critical ?? 0,
    high: sevs.high ?? 0,
    medium: sevs.medium ?? 0,
    low: sevs.low ?? 0,
  }));

  // --- Recent scans ---
  const recentRes = await pool.query<{
    commit_sha: string; job_type: string; status: string; created_at: string;
  }>(
    `SELECT commit_sha, job_type, status, created_at
     FROM scan_jobs WHERE repo_id=$1
     ORDER BY created_at DESC LIMIT 10`,
    [repoId],
  );

  return NextResponse.json({
    repoId,
    repoFullName: repo.full_name,
    healthScore,
    label,
    updatedAt: new Date().toISOString(),
    signals: {
      findingsDebt: {
        score: Math.round(debtScore),
        percent: Math.round((1 - debtRatio) * 100),
        description: totalFindings === 0
          ? 'No open findings — clean history'
          : `${totalFindings} finding${totalFindings !== 1 ? 's' : ''} (${criticalFindings} critical, ${highFindings} high)`,
      },
      aiConfidence: {
        score: Math.round(confidenceScore),
        percent: avgConfidence,
        description: prsAnalyzed === 0
          ? 'No PR reviews yet'
          : `${avgConfidence}% avg confidence across ${prsAnalyzed} review${prsAnalyzed !== 1 ? 's' : ''}`,
      },
      scanCoverage: {
        score: Math.round(coverageScore),
        percent: Math.round(coverageRatio * 100),
        description: totalScans === 0
          ? 'No completed scans yet'
          : `${totalScans} scan${totalScans !== 1 ? 's' : ''} completed`,
      },
    },
    stats: {
      totalFindings,
      criticalFindings,
      highFindings,
      totalScans,
      prsAnalyzed,
      avgConfidence,
    },
    weeklyFindings,
    recentScans: recentRes.rows.map(r => ({
      commitSha: r.commit_sha,
      jobType: r.job_type,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
}
