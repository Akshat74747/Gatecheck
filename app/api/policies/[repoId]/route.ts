import { NextRequest, NextResponse } from 'next/server';
import { getRepoPolicies, upsertPolicy } from '@/lib/db/policies';
import { RULE_REGISTRY } from '@/lib/security/rules';
import type { PolicyAction, RuleId } from '@/lib/security/rules/types';

type Params = { params: Promise<{ repoId: string }> };

// GET /api/policies/[repoId] — returns effective policy for every rule
export async function GET(_req: NextRequest, { params }: Params) {
  const { repoId } = await params;
  const overrides = await getRepoPolicies(repoId);

  const effective = RULE_REGISTRY.map(rule => ({
    ruleId:        rule.id,
    description:   rule.description,
    defaultAction: rule.defaultAction,
    defaultSeverity: rule.defaultSeverity,
    action:        overrides.get(rule.id) ?? rule.defaultAction,
    isOverridden:  overrides.has(rule.id),
  }));

  return NextResponse.json(effective);
}

// PUT /api/policies/[repoId] — upsert a single rule override
// Body: { ruleId: string, action: "block" | "warn" | "off" }
export async function PUT(req: NextRequest, { params }: Params) {
  const { repoId } = await params;
  const body = await req.json() as { ruleId?: string; action?: string };

  if (!body.ruleId || !['block', 'warn', 'off'].includes(body.action ?? '')) {
    return NextResponse.json(
      { error: 'ruleId and action (block|warn|off) are required' },
      { status: 400 }
    );
  }

  await upsertPolicy({
    repoId,
    ruleId: body.ruleId,
    action: body.action as PolicyAction,
  });

  return NextResponse.json({ ok: true, ruleId: body.ruleId as RuleId, action: body.action });
}
