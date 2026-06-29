import { NextRequest, NextResponse } from 'next/server';
import { getRepoById } from '@/lib/db/repos';
import { getInstallationToken, githubFetch } from '@/lib/github/app-auth';

interface GHFile {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
  patch?: string;
}

interface GHCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  files: GHFile[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ repoId: string; sha: string }> },
) {
  const { repoId, sha } = await params;

  const repo = await getRepoById(repoId);
  if (!repo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const token = await getInstallationToken(repo.installation_id);
  const res = await githubFetch(
    `/repos/${repo.full_name}/commits/${sha}`,
    token,
  );

  if (!res.ok) {
    return NextResponse.json({ error: `GitHub ${res.status}` }, { status: res.status });
  }

  const data = (await res.json()) as GHCommit;

  return NextResponse.json({
    sha: data.sha,
    message: data.commit.message,
    author: data.commit.author.name,
    date: data.commit.author.date,
    htmlUrl: data.html_url,
    files: (data.files ?? []).map(f => ({
      filename: f.filename,
      additions: f.additions,
      deletions: f.deletions,
      status: f.status,
      patch: f.patch,
    })),
  });
}
