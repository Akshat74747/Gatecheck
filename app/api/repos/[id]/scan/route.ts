import { NextRequest, NextResponse } from 'next/server';
import { getRepoById } from '@/lib/db/repos';
import { getInstallationToken } from '@/lib/github/app-auth';
import { createScanJob } from '@/lib/db/scan-jobs';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repo = await getRepoById(id);
  if (!repo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch latest commit SHA from GitHub
  const token = await getInstallationToken(repo.installation_id);
  const branchRes = await fetch(
    `https://api.github.com/repos/${repo.full_name}/branches/${repo.default_branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  if (!branchRes.ok) return NextResponse.json({ error: 'Failed to fetch branch' }, { status: 502 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const branch = await branchRes.json() as any;
  const commitSha: string = branch.commit?.sha;
  if (!commitSha) return NextResponse.json({ error: 'No commit SHA' }, { status: 502 });

  const job = await createScanJob({
    repoId:    repo.id,
    commitSha,
    jobType:   'push_scan',
    payload:   { triggered: 'manual' },
  });

  return NextResponse.json({ jobId: job.id, commitSha });
}
