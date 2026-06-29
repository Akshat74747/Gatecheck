import { NextRequest, NextResponse } from 'next/server';
import { listPrs } from '@/lib/db/pull-requests';
import { pool } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('repoId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const prs = await listPrs({ repoId, status });

  // Enrich with review data + repo full_name
  const enriched = await Promise.all(prs.map(async pr => {
    const [reviewRow, repoRow] = await Promise.all([
      pool.query(
        `SELECT verdict, confidence_score, status as review_status, critical_count, high_count, medium_count, low_count, info_count
         FROM pr_reviews WHERE pr_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [pr.id]
      ),
      pool.query(`SELECT full_name FROM repos WHERE id=$1`, [pr.repo_id]),
    ]);
    return {
      ...pr,
      repo_full_name: repoRow.rows[0]?.full_name ?? pr.repo_id,
      review: reviewRow.rows[0] ?? null,
    };
  }));

  return NextResponse.json(enriched);
}
