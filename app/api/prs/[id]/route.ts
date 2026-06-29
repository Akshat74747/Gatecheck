import { NextRequest, NextResponse } from 'next/server';
import { getPrById } from '@/lib/db/pull-requests';
import { getReviewByPrId } from '@/lib/db/pr-reviews';
import { getAgentReports } from '@/lib/db/agent-reports';
import { pool } from '@/lib/db/connection';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pr = await getPrById(id);
  if (!pr) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const repoRow = await pool.query(`SELECT full_name FROM repos WHERE id=$1`, [pr.repo_id]);
  const review = await getReviewByPrId(pr.id);
  const agentReports = review ? await getAgentReports(review.id) : [];

  return NextResponse.json({
    ...pr,
    repo_full_name: repoRow.rows[0]?.full_name ?? pr.repo_id,
    review,
    agent_reports: agentReports,
  });
}
