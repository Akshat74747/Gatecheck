import jwt from 'jsonwebtoken';

const GITHUB_API = 'https://api.github.com';

function generateAppJWT(): string {
  const appId    = process.env.GITHUB_APP_ID!;
  const rawKey   = process.env.GITHUB_APP_PRIVATE_KEY!;
  // Support both literal newlines and escaped \n from env var
  const privateKey = rawKey.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iat: now - 60, exp: now + 300, iss: appId },
    privateKey,
    { algorithm: 'RS256' },
  );
}

export async function getInstallationToken(installationId: number): Promise<string> {
  const appJwt = generateAppJWT();
  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to get installation token: ${(body as { message?: string }).message ?? res.status}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

export async function githubFetch(
  path: string,
  installationToken: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${installationToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers ?? {}),
    },
  });
}
