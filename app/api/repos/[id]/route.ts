import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/connection';

// PATCH /api/repos/[id] — toggle security enrollment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { is_security_enrolled?: boolean };

  if (typeof body.is_security_enrolled !== 'boolean') {
    return NextResponse.json({ error: 'is_security_enrolled must be boolean' }, { status: 400 });
  }

  const result = await pool.query(
    `UPDATE repos SET is_security_enrolled = $1, updated_at = NOW()
     WHERE id = $2 RETURNING id, full_name, is_security_enrolled`,
    [body.is_security_enrolled, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}
