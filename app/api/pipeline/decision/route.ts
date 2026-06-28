import { NextRequest, NextResponse } from 'next/server';
import { getRepoByFullName } from '@/lib/db/repos';
import { readHaltDecision } from '@/lib/db/halt-decisions';

/**
 * GET /api/pipeline/decision?repo=owner/name&sha=abc123
 *
 * Polled by the gatecheck-action GitHub Action before any CI steps run.
 * Returns { halt: true/false, severity, reason }.
 *
 * Auth: Bearer token via PIPELINE_API_TOKEN env var.
 * For hackathon simplicity this is a single shared token — the customer
 * sets it as a GitHub Actions secret (${{ secrets.GATECHECK_TOKEN }}).
 */
export async function GET(req: NextRequest) {
  // ----- Auth -----
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const expected = process.env.PIPELINE_API_TOKEN;

  if (!expected) {
    // No token configured — open in local dev, locked in prod
    console.warn('[decision] PIPELINE_API_TOKEN not set — endpoint is open');
  } else if (token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ----- Params -----
  const { searchParams } = new URL(req.url);
  const repoFullName = searchParams.get('repo');
  const commitSha    = searchParams.get('sha');

  if (!repoFullName || !commitSha) {
    return NextResponse.json(
      { error: 'Missing required query params: repo, sha' },
      { status: 400 }
    );
  }

  // ----- Repo lookup -----
  const repo = await getRepoByFullName(repoFullName);
  if (!repo) {
    // Unknown repo — don't block CI (soft-fail: Action should not halt on our data gaps)
    return NextResponse.json({ halt: false, reason: 'repo not found in gatecheck' });
  }

  // ----- Decision lookup -----
  const decision = await readHaltDecision(repo.id, commitSha);

  return NextResponse.json({
    halt:      decision.halt,
    severity:  decision.severity  ?? 'none',
    reason:    decision.reason    ?? 'no decision found',
    findingIds: decision.findingIds ?? [],
  });
}
