import { NextRequest, NextResponse } from 'next/server';
import { claimNextJob, failJob } from '@/lib/db/scan-jobs';
import { runScan } from '@/lib/scanner';
import { runPrReview } from '@/lib/review/runner';
import { getRepoById } from '@/lib/db/repos';

export const runtime = 'nodejs';
export const maxDuration = 300; // Vercel Pro: up to 300s for long Gemini calls

const MAX_JOBS_PER_INVOCATION = 5;

/**
 * GET /api/cron/scan-worker
 *
 * Called every minute by Vercel Cron (configured in vercel.json).
 * Also callable manually for testing — just hit the URL directly.
 *
 * Vercel automatically passes Authorization: Bearer <CRON_SECRET> on
 * scheduled invocations. We verify it to prevent unauthenticated triggers
 * in production. In dev (no CRON_SECRET set) the check is skipped.
 */
export async function GET(req: NextRequest) {
  // Auth guard — Vercel Cron sets this header automatically
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = [];
  const errors  = [];

  for (let i = 0; i < MAX_JOBS_PER_INVOCATION; i++) {
    const job = await claimNextJob();
    if (!job) break; // no more pending jobs

    console.log(`[cron] claimed job ${job.id} (${job.job_type}) for ${job.repo_id} @ ${job.commit_sha.slice(0, 7)}`);

    try {
      if (job.job_type === 'pr_scan') {
        const repo = await getRepoById(job.repo_id);
        if (!repo) throw new Error(`Repo ${job.repo_id} not found`);
        await runPrReview(job, repo);
        results.push({ jobId: job.id, type: 'pr_review' });
      } else {
        const result = await runScan(job);
        results.push(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron] job ${job.id} failed:`, message);
      await failJob(job.id, message);
      errors.push({ jobId: job.id, error: message });
    }
  }

  return NextResponse.json({
    processed:   results.length,
    errorCount:  errors.length,
    results,
    errors,
  });
}
