import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.GITHUB_APP_ID ?? null;
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  // Derive webhook URL from Vercel deployment URL or NEXTAUTH_URL
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXTAUTH_URL ?? 'https://gatecheck-theta.vercel.app';

  return NextResponse.json({
    appId,
    webhookUrl: `${baseUrl}/api/webhook`,
    geminiConfigured,
    geminiModel: 'gemini-2.5-flash',
  });
}
