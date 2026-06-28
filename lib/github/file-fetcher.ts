import { githubFetch } from './app-auth';
import { isCiRelevantPath } from '@/lib/security/rules/types';
import type { RuleFile } from '@/lib/security/rules/types';

const CI_DIRS   = ['.github/workflows', '.github/actions'];
const ROOT_FILES = [
  'Dockerfile', 'Jenkinsfile', '.gitlab-ci.yml', '.gitlab-ci.yaml',
  'azure-pipelines.yml', 'azure-pipelines.yaml',
  '.circleci/config.yml', '.circleci/config.yaml',
  'bitbucket-pipelines.yml',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'requirements.txt', 'poetry.lock', 'Pipfile.lock',
  'Gemfile.lock', 'go.sum', 'Cargo.lock',
];

const MAX_FILE_BYTES = 150 * 1024;

/**
 * Fetch all CI-relevant files at a specific commit SHA.
 * Lists .github/workflows + .github/actions recursively, then tries
 * known-name root files (Dockerfile, lockfiles, etc.).
 */
export async function fetchCiFiles(
  repoFullName: string,
  sha: string,
  installationToken: string,
): Promise<RuleFile[]> {
  const out: RuleFile[] = [];

  // 1. Directories that may contain arbitrarily-named workflow/action files
  for (const dir of CI_DIRS) {
    const paths = await listDir(repoFullName, dir, sha, installationToken);
    for (const p of paths) {
      if (!isCiRelevantPath(p)) continue;
      const content = await fetchContent(repoFullName, p, sha, installationToken);
      if (content !== null) out.push({ path: p, content });
    }
  }

  // 2. Known-name root files (404s are silently skipped)
  for (const candidate of ROOT_FILES) {
    const content = await fetchContent(repoFullName, candidate, sha, installationToken);
    if (content !== null) out.push({ path: candidate, content });
  }

  return out;
}

async function listDir(
  repoFullName: string,
  dir: string,
  sha: string,
  token: string,
): Promise<string[]> {
  const out: string[] = [];
  try {
    const res = await githubFetch(
      `/repos/${repoFullName}/contents/${encodeURIComponent(dir)}?ref=${sha}`,
      token,
    );
    if (!res.ok) return out;
    const items = (await res.json()) as Array<{ type: string; path: string }>;
    if (!Array.isArray(items)) return out;
    for (const item of items) {
      if (item.type === 'file') {
        out.push(item.path);
      } else if (item.type === 'dir') {
        out.push(...await listDir(repoFullName, item.path, sha, token));
      }
    }
  } catch { /* best-effort */ }
  return out;
}

async function fetchContent(
  repoFullName: string,
  path: string,
  sha: string,
  token: string,
): Promise<string | null> {
  try {
    const res = await githubFetch(
      `/repos/${repoFullName}/contents/${encodeURIComponent(path)}?ref=${sha}`,
      token,
      { headers: { Accept: 'application/vnd.github.raw+json' } },
    );
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > MAX_FILE_BYTES ? text.slice(0, MAX_FILE_BYTES) : text;
  } catch {
    return null;
  }
}
