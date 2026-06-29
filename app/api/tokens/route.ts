import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.PIPELINE_API_TOKEN ?? '';
  return NextResponse.json({
    masked: token ? `${token.slice(0, 8)}${'•'.repeat(Math.max(0, token.length - 8))}` : null,
    exists: !!token,
  });
}
