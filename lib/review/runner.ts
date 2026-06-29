import { getInstallationToken } from '@/lib/github/app-auth';
import { fetchPrDiff, fetchPrMetadata } from '@/lib/github/pr-diff';
import { upsertPullRequest, updatePrStatus } from '@/lib/db/pull-requests';
import { createReview, updateReview } from '@/lib/db/pr-reviews';
import { insertAgentReport } from '@/lib/db/agent-reports';
import { runSecurityAgent } from '@/lib/agents/security';
import { runBugsAgent } from '@/lib/agents/bugs';
import { runPerformanceAgent } from '@/lib/agents/performance';
import { runReadabilityAgent } from '@/lib/agents/readability';
import { runBestPracticesAgent } from '@/lib/agents/best-practices';
import { runDocumentationAgent } from '@/lib/agents/documentation';
import { runSynthesizer } from '@/lib/agents/synthesizer';
import { completeJob, failJob } from '@/lib/db/scan-jobs';
import type { ScanJob } from '@/lib/db/scan-jobs';
import type { Repo } from '@/lib/db/repos';
import type { AgentOutput } from '@/lib/agents/types';

const AGENTS = [
  { name: 'security',       fn: runSecurityAgent },
  { name: 'bugs',           fn: runBugsAgent },
  { name: 'performance',    fn: runPerformanceAgent },
  { name: 'readability',    fn: runReadabilityAgent },
  { name: 'best_practices', fn: runBestPracticesAgent },
  { name: 'documentation',  fn: runDocumentationAgent },
] as const;

export async function runPrReview(job: ScanJob, repo: Repo): Promise<void> {
  const start = Date.now();
  const prNumber = job.pr_number;
  if (!prNumber) throw new Error('pr_scan job missing pr_number');

  console.log(`[review] starting PR #${prNumber} for ${repo.full_name}`);

  const installationToken = await getInstallationToken(repo.installation_id);

  // Fetch diff + metadata in parallel
  const [diff, meta] = await Promise.all([
    fetchPrDiff(repo.full_name, prNumber, installationToken),
    fetchPrMetadata(repo.full_name, prNumber, installationToken),
  ]);

  // Upsert PR record
  const pr = await upsertPullRequest({
    repoId:     repo.id,
    prNumber:   meta.prNumber,
    title:      meta.title,
    author:     meta.author,
    headSha:    meta.headSha,
    headBranch: meta.headBranch,
    baseBranch: meta.baseBranch,
    htmlUrl:    meta.htmlUrl,
  });

  await updatePrStatus(pr.id, 'reviewing');

  // Create review record
  const review = await createReview({
    prId:      pr.id,
    repoId:    repo.id,
    commitSha: meta.headSha,
  });

  const input = { diff, repoName: repo.full_name };

  // Run all 6 agents in parallel
  const agentOutputs: Record<string, AgentOutput> = {};
  await Promise.all(
    AGENTS.map(async ({ name, fn }) => {
      const agentStart = Date.now();
      try {
        const output = await fn(input);
        agentOutputs[name] = output;
        await insertAgentReport({
          reviewId:   review.id,
          agentType:  name,
          status:     'complete',
          summary:    output.summary,
          findings:   output.findings,
          durationMs: Date.now() - agentStart,
        });
        console.log(`[review] agent ${name} done: ${output.findings.length} findings`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[review] agent ${name} failed:`, msg);
        agentOutputs[name] = { summary: `Agent failed: ${msg}`, findings: [] };
        await insertAgentReport({
          reviewId:  review.id,
          agentType: name,
          status:    'failed',
          error:     msg,
        });
      }
    })
  );

  // Run synthesizer
  let synthesis;
  try {
    synthesis = await runSynthesizer(agentOutputs, repo.full_name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateReview(review.id, { status: 'failed', error: msg });
    await updatePrStatus(pr.id, 'failed');
    await failJob(job.id, `Synthesizer failed: ${msg}`);
    return;
  }

  // Count findings by severity
  const allFindings = Object.values(agentOutputs).flatMap(o => o.findings);
  const counts = { critical_count: 0, high_count: 0, medium_count: 0, low_count: 0, info_count: 0 };
  for (const f of allFindings) {
    const key = `${f.severity}_count` as keyof typeof counts;
    if (key in counts) counts[key]++;
  }

  await insertAgentReport({
    reviewId:   review.id,
    agentType:  'synthesizer',
    status:     'complete',
    summary:    synthesis.summary,
    durationMs: Date.now() - start,
  });

  await updateReview(review.id, {
    verdict:          synthesis.verdict,
    confidence_score: synthesis.confidence_score,
    summary:          synthesis.summary,
    top_actions:      synthesis.top_actions,
    changelog_entry:  synthesis.changelog_entry,
    status:           'complete',
    duration_ms:      Date.now() - start,
    ...counts,
  });

  await updatePrStatus(pr.id, 'reviewed', review.id);
  await completeJob(job.id);

  console.log(`[review] complete — ${repo.full_name} PR #${prNumber}: ${synthesis.verdict} (${synthesis.confidence_score}% confidence), ${allFindings.length} findings, ${Date.now() - start}ms`);
}
