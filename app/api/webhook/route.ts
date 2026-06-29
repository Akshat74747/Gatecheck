import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/github/webhook-verify';
import { getRepoByFullName, upsertRepo } from '@/lib/db/repos';
import { createScanJob } from '@/lib/db/scan-jobs';
import { isCiRelevantPath } from '@/lib/security/rules/types';
import { pool } from '@/lib/db/connection';
import { upsertPullRequest } from '@/lib/db/pull-requests';

// Required for HMAC verification — must read raw bytes, not parsed JSON
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const signature  = req.headers.get('x-hub-signature-256');
  const event      = req.headers.get('x-github-event');
  const deliveryId = req.headers.get('x-github-delivery');

  // Read raw body for HMAC — must happen before any JSON parsing
  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn(`[webhook] Invalid signature — delivery ${deliveryId}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Respond 200 immediately — GitHub retries if we don't
  // All processing happens synchronously within this function (no BullMQ);
  // fast enough since we're only doing a DB read + insert.
  const body = JSON.parse(rawBody);
  const repoFullName: string = body.repository?.full_name;

  console.log(`[webhook] ${event} — ${repoFullName} (${deliveryId})`);

  try {
    switch (event) {
      case 'push':
        await handlePush(body);
        break;
      case 'pull_request':
        await handlePullRequest(body);
        break;
      case 'installation':
      case 'installation_repositories':
        await handleInstallation(body);
        break;
      case 'ping':
        console.log(`[webhook] ping from ${repoFullName}`);
        break;
      default:
        console.log(`[webhook] ignoring event: ${event}`);
    }
  } catch (err) {
    console.error(`[webhook] error processing ${event}:`, err);
    // Still return 200 — we don't want GitHub to retry on our internal errors
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------

async function handlePush(body: GitHubPushPayload) {
  const repoFullName = body.repository.full_name;
  const ref          = body.ref; // e.g. "refs/heads/main"
  const headSha      = body.after;

  const repo = await getRepoByFullName(repoFullName);
  if (!repo) {
    console.log(`[webhook] repo ${repoFullName} not found in DB — skipping`);
    return;
  }

  // Keep installation_id in sync — GitHub includes it on every push event
  const pushInstallationId: number | undefined = body.installation?.id;
  if (pushInstallationId && repo.installation_id !== pushInstallationId) {
    await pool.query(`UPDATE repos SET installation_id=$1, updated_at=NOW() WHERE id=$2`,
      [pushInstallationId, repo.id]);
    console.log(`[webhook] updated installation_id for ${repoFullName}: ${repo.installation_id} → ${pushInstallationId}`);
    repo.installation_id = pushInstallationId;
  }

  if (!repo.is_security_enrolled) {
    console.log(`[webhook] ${repoFullName} not enrolled in security — skipping`);
    return;
  }

  // Only enqueue if any changed file is a CI-relevant path
  const ciTouched = pushTouchedCiFiles(body);
  if (!ciTouched) {
    console.log(`[webhook] push to ${repoFullName} did not touch CI files — skipping`);
    return;
  }

  const job = await createScanJob({
    repoId:    repo.id,
    commitSha: headSha,
    jobType:   'push_scan',
    payload:   { pusher: body.pusher?.name, ref, commits: body.commits?.length ?? 0 },
  });

  console.log(`[webhook] push_scan job ${job.id} created for ${repoFullName} @ ${headSha.slice(0, 7)}`);
}

async function handlePullRequest(body: GitHubPRPayload) {
  const action       = body.action;
  const repoFullName = body.repository.full_name;
  const pr           = body.pull_request;

  if (!['opened', 'synchronize', 'reopened'].includes(action)) return;

  const repo = await getRepoByFullName(repoFullName);
  if (!repo) {
    console.log(`[webhook] PR on ${repoFullName} — repo not found in DB`);
    return;
  }

  // Always upsert the PR record (even if not enrolled in security) so it shows in the PR list
  await upsertPullRequest({
    repoId:     repo.id,
    prNumber:   pr.number,
    title:      pr.title,
    author:     pr.user?.login,
    headSha:    pr.head.sha,
    headBranch: pr.head.ref,
    baseBranch: pr.base.ref,
    htmlUrl:    pr.html_url,
  });

  if (!repo.is_security_enrolled) {
    console.log(`[webhook] PR on ${repoFullName} — not enrolled, skipping AI review job`);
    return;
  }

  const job = await createScanJob({
    repoId:    repo.id,
    commitSha: pr.head.sha,
    jobType:   'pr_scan',
    prNumber:  pr.number,
    payload:   { action, prTitle: pr.title, baseBranch: pr.base.ref, headBranch: pr.head.ref },
  });

  console.log(`[webhook] pr_scan job ${job.id} created for PR #${pr.number} on ${repoFullName}`);
}

async function handleInstallation(body: GitHubInstallationPayload) {
  // Auto-register repos when the app is installed
  const installationId = body.installation.id;
  for (const ghRepo of body.repositories ?? body.repositories_added ?? []) {
    const [owner, name] = ghRepo.full_name.split('/');
    await upsertRepo({
      githubId:       ghRepo.id,
      owner,
      name,
      fullName:       ghRepo.full_name,
      installationId,
      defaultBranch:  'main', // will be updated on first push event
    });
    console.log(`[webhook] upserted repo ${ghRepo.full_name} from installation event`);
  }
}

// ---------------------------------------------------------------------------

function pushTouchedCiFiles(body: GitHubPushPayload): boolean {
  for (const commit of body.commits ?? []) {
    for (const f of commit.added    ?? []) if (isCiRelevantPath(f)) return true;
    for (const f of commit.modified ?? []) if (isCiRelevantPath(f)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Minimal payload shapes — only the fields we actually read

interface GitHubPushPayload {
  ref: string;
  after: string;
  repository: { full_name: string; default_branch?: string };
  installation?: { id: number };
  pusher?: { name: string };
  commits?: Array<{ added?: string[]; modified?: string[] }>;
}

interface GitHubPRPayload {
  action: string;
  repository: { full_name: string };
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    user?: { login: string };
    head: { sha: string; ref: string };
    base: { ref: string };
  };
}

interface GitHubInstallationPayload {
  installation: { id: number };
  repositories?: Array<{ id: number; full_name: string }>;
  repositories_added?: Array<{ id: number; full_name: string }>;
}
