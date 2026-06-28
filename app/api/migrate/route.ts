import { NextRequest, NextResponse } from 'next/server';
import { runMigration } from '@/lib/db/migrate';

// Guard with a secret header so this is not publicly callable
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migrate-secret');
  if (secret !== process.env.MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tables, warnings } = await runMigration();
    return NextResponse.json({ status: 'ok', tables, warnings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', detail: message }, { status: 500 });
  }
}
