const GITHUB_API = 'https://api.github.com';

export interface PrMeta {
  prNumber: number;
  title: string;
  author: string;
  headSha: string;
  headBranch: string;
  baseBranch: string;
  htmlUrl: string;
}

export async function fetchPrDiff(
  repoFullName: string,
  prNumber: number,
  installationToken: string,
): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/pulls/${prNumber}`, {
    headers: {
      Authorization: `Bearer ${installationToken}`,
      Accept: 'application/vnd.github.diff',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch PR diff: ${res.status}`);
  }
  const text = await res.text();
  // Truncate very large diffs to avoid token limits
  return text.length > 40_000 ? text.slice(0, 40_000) + '\n[diff truncated]' : text;
}

export async function fetchPrMetadata(
  repoFullName: string,
  prNumber: number,
  installationToken: string,
): Promise<PrMeta> {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/pulls/${prNumber}`, {
    headers: {
      Authorization: `Bearer ${installationToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch PR metadata: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pr = await res.json() as any;
  return {
    prNumber:   pr.number,
    title:      pr.title,
    author:     pr.user?.login ?? 'unknown',
    headSha:    pr.head?.sha ?? '',
    headBranch: pr.head?.ref ?? '',
    baseBranch: pr.base?.ref ?? 'main',
    htmlUrl:    pr.html_url ?? '',
  };
}
