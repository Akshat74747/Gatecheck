import { pool } from './connection';

export interface Repo {
  id: string;
  github_id: number;
  owner: string;
  name: string;
  full_name: string;
  installation_id: number;
  is_security_enrolled: boolean;
  default_branch: string;
}

export async function getRepoByFullName(fullName: string): Promise<Repo | null> {
  const result = await pool.query<Repo>(
    `SELECT id, github_id, owner, name, full_name, installation_id,
            is_security_enrolled, default_branch
     FROM repos WHERE full_name = $1`,
    [fullName]
  );
  return result.rows[0] ?? null;
}

export async function getRepoById(id: string): Promise<Repo | null> {
  const result = await pool.query<Repo>(
    `SELECT id, github_id, owner, name, full_name, installation_id,
            is_security_enrolled, default_branch
     FROM repos WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function upsertRepo(params: {
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  installationId: number;
  defaultBranch: string;
}): Promise<Repo> {
  const result = await pool.query<Repo>(
    `INSERT INTO repos (github_id, owner, name, full_name, installation_id, default_branch)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (github_id) DO UPDATE SET
       owner           = EXCLUDED.owner,
       name            = EXCLUDED.name,
       full_name       = EXCLUDED.full_name,
       installation_id = EXCLUDED.installation_id,
       default_branch  = EXCLUDED.default_branch,
       updated_at      = NOW()
     RETURNING id, github_id, owner, name, full_name, installation_id,
               is_security_enrolled, default_branch`,
    [params.githubId, params.owner, params.name, params.fullName,
     params.installationId, params.defaultBranch]
  );
  return result.rows[0];
}
