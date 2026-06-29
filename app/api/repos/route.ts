import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/connection';

export async function GET() {
  const result = await pool.query(
    `SELECT r.id, r.github_id, r.owner, r.name, r.full_name, r.installation_id,
            r.is_security_enrolled, r.default_branch,
            COUNT(f.id)::INTEGER as finding_count
     FROM repos r
     LEFT JOIN findings f ON f.repo_id = r.id
     GROUP BY r.id
     ORDER BY r.full_name ASC`,
  );
  return NextResponse.json(result.rows);
}
