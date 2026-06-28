import { getRepoById } from '@/lib/db/repos';
import { getInstallationToken } from '@/lib/github/app-auth';
import { fetchCiFiles } from '@/lib/github/file-fetcher';
import { runAllRules } from '@/lib/security/rules';
import { insertFinding } from '@/lib/db/findings';
import { getRepoPolicies, resolveAction } from '@/lib/db/policies';
import { writeHaltDecision } from '@/lib/db/halt-decisions';
import { completeJob, failJob } from '@/lib/db/scan-jobs';
import type { ScanJob } from '@/lib/db/scan-jobs';
import type { RuleId } from '@/lib/security/rules/types';

const SEVERITY_RANK: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1, none: 0,
};

export interface ScanResult {
  jobId: string;
  repoFullName: string;
  commitSha: string;
  filesScanned: number;
  findingsTotal: number;
  findingsBlock: number;
  findingsWarn: number;
  halt: boolean;
  topSeverity: string;
  durationMs: number;
}

/**
 * Run a full scan for a claimed scan_job row.
 *
 * Flow:
 *   1. Load repo + get GitHub installation token
 *   2. Fetch CI files from GitHub API
 *   3. Run the 16-rule library against them
 *   4. Insert findings (append-only)
 *   5. Determine halt decision (most-severe-wins, policy-aware)
 *   6. Write halt decision to DSQL
 *   7. Mark job completed
 */
export async function runScan(job: ScanJob): Promise<ScanResult> {
  const start = Date.now();

  const repo = await getRepoById(job.repo_id);
  if (!repo) throw new Error(`Repo ${job.repo_id} not found`);

  // GitHub App credentials may not be set yet (pre-Step-9).
  // Fail the job gracefully so the cron doesn't crash.
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
    await failJob(job.id, 'GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY not set — configure in Step 9');
    return {
      jobId: job.id, repoFullName: repo.full_name, commitSha: job.commit_sha,
      filesScanned: 0, findingsTotal: 0, findingsBlock: 0, findingsWarn: 0,
      halt: false, topSeverity: 'none', durationMs: Date.now() - start,
    };
  }

  const installationToken = await getInstallationToken(repo.installation_id);

  const ciFiles = await fetchCiFiles(repo.full_name, job.commit_sha, installationToken);
  console.log(`[scanner] ${repo.full_name} @ ${job.commit_sha.slice(0, 7)} — ${ciFiles.length} CI file(s)`);

  const scanType = job.job_type === 'pr_scan' ? 'pr' : 'push';
  const policies = await getRepoPolicies(repo.id);

  const findings = runAllRules({
    files: ciFiles,
    repoIsPublic: true, // conservative default; updated when GitHub App is live
    allowlist: { actions: [], domains: [], runners: [] },
  });

  let findingsBlock = 0;
  let findingsWarn  = 0;
  let topSeverityRank = 0;
  let topSeverity = 'none';
  const haltFindingIds: string[] = [];

  for (const f of findings) {
    const action = resolveAction(f.ruleId as RuleId, policies);
    if (action === 'off') continue;

    const findingId = await insertFinding({
      repoId:     repo.id,
      commitSha:  job.commit_sha,
      ruleId:     f.ruleId,
      severity:   f.severity,
      filePath:   f.file,
      lineNumber: f.line,
      message:    f.message,
      snippet:    f.codeSnippet,
      prNumber:   job.pr_number ?? undefined,
      scanType,
    });

    if (action === 'block') {
      findingsBlock++;
      haltFindingIds.push(findingId);
      const rank = SEVERITY_RANK[f.severity] ?? 0;
      if (rank > topSeverityRank) {
        topSeverityRank = rank;
        topSeverity = f.severity;
      }
    } else {
      findingsWarn++;
    }
  }

  const halt = findingsBlock > 0;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL

  await writeHaltDecision({
    repoId:     repo.id,
    commitSha:  job.commit_sha,
    decision:   halt ? 'halt' : 'allow',
    severity:   halt ? topSeverity : 'none',
    reason:     halt
      ? `${findingsBlock} blocking finding(s) — top severity: ${topSeverity}`
      : 'no blocking findings',
    findingIds: haltFindingIds,
    expiresAt,
  });

  await completeJob(job.id);

  const result: ScanResult = {
    jobId:          job.id,
    repoFullName:   repo.full_name,
    commitSha:      job.commit_sha,
    filesScanned:   ciFiles.length,
    findingsTotal:  findings.length,
    findingsBlock,
    findingsWarn,
    halt,
    topSeverity,
    durationMs:     Date.now() - start,
  };

  console.log(
    `[scanner] complete — ${repo.full_name}: ${findings.length} findings ` +
    `(${findingsBlock} block, ${findingsWarn} warn), halt=${halt}, ${result.durationMs}ms`,
  );

  return result;
}
