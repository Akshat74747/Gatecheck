import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/connection';
import type { Repo } from '@/lib/db/repos';

export async function GET() {
  const result = await pool.query<Repo>(
    `SELECT id, github_id, owner, name, full_name, installation_id,
            is_security_enrolled, default_branch
     FROM repos ORDER BY full_name ASC`
  );
  return NextResponse.json(result.rows);
}
