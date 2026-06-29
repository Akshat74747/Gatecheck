import { pool } from './connection';
import type { AgentFinding } from '@/lib/agents/types';

export interface AgentReport {
  id: string;
  review_id: string;
  agent_type: string;
  status: 'pending' | 'complete' | 'failed';
  summary: string | null;
  findings: AgentFinding[];
  finding_count: number;
  duration_ms: number | null;
  created_at: Date;
}

export async function insertAgentReport(params: {
  reviewId: string;
  agentType: string;
  status: AgentReport['status'];
  summary?: string;
  findings?: AgentFinding[];
  durationMs?: number;
  error?: string;
}): Promise<AgentReport> {
  const findings = params.findings ?? [];
  const r = await pool.query<AgentReport>(
    `INSERT INTO agent_reports (review_id, agent_type, status, summary, findings, finding_count, duration_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [params.reviewId, params.agentType, params.status,
     params.summary ?? (params.error ?? null),
     JSON.stringify(findings), findings.length, params.durationMs ?? null]
  );
  return r.rows[0];
}

export async function getAgentReports(reviewId: string): Promise<AgentReport[]> {
  const r = await pool.query<AgentReport>(
    `SELECT * FROM agent_reports WHERE review_id=$1 ORDER BY created_at ASC`, [reviewId]
  );
  return r.rows;
}
