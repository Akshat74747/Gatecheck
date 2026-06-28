import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/connection';

export async function GET() {
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: 'error', db: 'unreachable', detail: message },
      { status: 503 }
    );
  }
}
