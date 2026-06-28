import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/connection';
import type { FindingRow } from '@/lib/db/findings';

// GET /api/findings?repoId=<uuid>&sha=<sha>&severity=critical&limit=100
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoId   = searchParams.get('repoId');
  const sha      = searchParams.get('sha');
  const severity = searchParams.get('severity');
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  if (!repoId) {
    return NextResponse.json({ error: 'repoId is required' }, { status: 400 });
  }

  const conditions = ['f.repo_id = $1'];
  const values: unknown[] = [repoId];
  let idx = 2;

  if (sha) {
    conditions.push(`f.commit_sha = $${idx++}`);
    values.push(sha);
  }
  if (severity) {
    conditions.push(`f.severity = $${idx++}`);
    values.push(severity);
  }

  values.push(limit);

  const result = await pool.query<FindingRow & { resolution_status: string | null }>(
    `SELECT f.*,
            r.status AS resolution_status
     FROM findings f
     LEFT JOIN resolutions r ON r.finding_id = f.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY f.created_at DESC
     LIMIT $${idx}`,
    values
  );

  return NextResponse.json(result.rows);
}
