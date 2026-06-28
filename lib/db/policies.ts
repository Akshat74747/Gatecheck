import { pool } from './connection';
import type { PolicyAction, RuleId } from '@/lib/security/rules/types';
import { RULE_REGISTRY } from '@/lib/security/rules';

export interface PolicyRow {
  repo_id: string;
  rule_id: string;
  action: PolicyAction;
}

export async function getRepoPolicies(repoId: string): Promise<Map<RuleId, PolicyAction>> {
  const result = await pool.query<PolicyRow>(
    `SELECT rule_id, action FROM policies WHERE repo_id = $1`,
    [repoId]
  );
  const map = new Map<RuleId, PolicyAction>();
  for (const row of result.rows) {
    map.set(row.rule_id as RuleId, row.action);
  }
  return map;
}

/**
 * Resolve the effective action for a rule, applying any per-repo override.
 * Falls back to the rule's defaultAction from the registry.
 */
export function resolveAction(
  ruleId: RuleId,
  overrides: Map<RuleId, PolicyAction>,
): PolicyAction {
  if (overrides.has(ruleId)) return overrides.get(ruleId)!;
  const rule = RULE_REGISTRY.find(r => r.id === ruleId);
  return rule?.defaultAction ?? 'warn';
}

export async function upsertPolicy(params: {
  repoId: string;
  ruleId: string;
  action: PolicyAction;
}): Promise<void> {
  await pool.query(
    `INSERT INTO policies (repo_id, rule_id, action)
     VALUES ($1, $2, $3)
     ON CONFLICT (repo_id, rule_id) DO UPDATE SET action = EXCLUDED.action, updated_at = NOW()`,
    [params.repoId, params.ruleId, params.action]
  );
}
