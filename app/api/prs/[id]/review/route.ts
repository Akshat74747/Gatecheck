import { NextRequest, NextResponse } from 'next/server';
import { getPrById, updatePrStatus } from '@/lib/db/pull-requests';
import { createScanJob } from '@/lib/db/scan-jobs';
import { pool } from '@/lib/db/connection';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pr = await getPrById(id);
  if (!pr) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const repoRow = await pool.query(`SELECT * FROM repos WHERE id=$1`, [pr.repo_id]);
  const repo = repoRow.rows[0];
  if (!repo) return NextResponse.json({ error: 'Repo not found' }, { status: 404 });

  const job = await createScanJob({
    repoId:    pr.repo_id,
    commitSha: pr.head_sha,
    jobType:   'pr_scan',
    prNumber:  pr.pr_number,
    payload:   { triggered: 'manual', prTitle: pr.title },
  });

  await updatePrStatus(pr.id, 'reviewing');

  return NextResponse.json({ jobId: job.id, prId: pr.id });
}
