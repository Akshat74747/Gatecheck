'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/ui/Button';

type PolicyAction = 'block' | 'warn' | 'off';

interface PolicyRow {
  ruleId: string;
  description: string;
  defaultAction: PolicyAction;
  defaultSeverity: string;
  action: PolicyAction;
  isOverridden: boolean;
}

const SEV_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  critical: XCircle,
  high:     AlertTriangle,
  medium:   AlertTriangle,
  low:      Info,
  info:     Info,
};

const SEV_COLOR: Record<string, string> = {
  critical: 'text-[#f87171]',
  high:     'text-[#fb923c]',
  medium:   'text-[#fcd34d]',
  low:      'text-[#818cf8]',
  info:     'text-[#94a3b8]',
};

const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

function PoliciesPage() {
  const searchParams = useSearchParams();
  const repoId   = searchParams.get('repoId') ?? '';
  const repoName = searchParams.get('repoName') ?? repoId;

  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const loadPolicies = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/policies/${repoId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PolicyRow[] = await res.json();
      // Sort by severity order
      data.sort((a, b) => {
        const ai = SEV_ORDER.indexOf(a.defaultSeverity);
        const bi = SEV_ORDER.indexOf(b.defaultSeverity);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      setPolicies(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  async function updateAction(ruleId: string, action: PolicyAction) {
    setPolicies(prev => prev.map(p =>
      p.ruleId === ruleId ? { ...p, action, isOverridden: action !== p.defaultAction } : p
    ));
    setSaving(s => ({ ...s, [ruleId]: true }));
    try {
      const res = await fetch(`/api/policies/${repoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(s => ({ ...s, [ruleId]: true }));
      setTimeout(() => setSaved(s => { const n = { ...s }; delete n[ruleId]; return n; }), 1500);
    } catch {
      loadPolicies();
    } finally {
      setSaving(s => { const n = { ...s }; delete n[ruleId]; return n; });
    }
  }

  const overridden = policies.filter(p => p.isOverridden).length;

  if (!repoId) {
    return (
      <DashboardLayout>
        <div className="clay p-12 text-center">
          <p className="text-muted-foreground mb-4">No repository selected.</p>
          <Link href="/"><Button variant="ghost">← Back to repos</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout repoId={repoId} repoName={repoName}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold gradient-text-primary">Security Policies</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">{repoName}</p>
            {overridden > 0 && (
              <span className="clay-pill text-[9px] font-bold px-2 py-0.5 text-accent">
                {overridden} override{overridden !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="subtle"
          size="sm"
          icon={RefreshCw}
          onClick={loadPolicies}
          className={loading ? '[&_svg]:animate-spin' : ''}
        >
          Refresh
        </Button>
      </div>

      {/* Legend */}
      <div className="clay-sm px-5 py-3 mb-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span><strong className="text-destructive">Block</strong> — halts CI pipeline</span>
        <span><strong className="text-accent">Warn</strong> — logs finding, CI continues</span>
        <span><strong className="text-muted-foreground">Off</strong> — rule ignored entirely</span>
      </div>

      {/* Error */}
      {error && (
        <div className="clay-sm p-4 mb-4" style={{ background: 'linear-gradient(145deg,#2a1a1a,#1f1212)', borderColor: 'rgba(248,113,113,0.2)' }}>
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="clay-sm h-14 animate-pulse" />
          ))}
        </div>
      )}

      {/* Policy rows */}
      {!loading && policies.length > 0 && (
        <div className="space-y-2">
          {policies.map(policy => {
            const Icon = SEV_ICON[policy.defaultSeverity] ?? Info;
            const iconColor = SEV_COLOR[policy.defaultSeverity] ?? 'text-muted-foreground';
            const actions: PolicyAction[] = ['block', 'warn', 'off'];

            return (
              <div
                key={policy.ruleId}
                className={`clay-sm px-5 py-3 flex items-center justify-between gap-4 transition-all ${
                  policy.isOverridden ? 'border-l-2' : ''
                }`}
                style={policy.isOverridden ? { borderLeftColor: '#fcd34d' } : {}}
              >
                {/* Left */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-foreground/80">{policy.ruleId}</span>
                      {policy.isOverridden && saved[policy.ruleId] && (
                        <span className="text-[9px] text-chart-5 font-bold">Saved</span>
                      )}
                      {policy.isOverridden && !saved[policy.ruleId] && (
                        <span
                          className="clay-pill text-[9px] font-bold px-1.5 py-0.5 text-accent"
                        >
                          overridden
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[36ch]">{policy.description}</p>
                  </div>
                </div>

                {/* Right: toggle group */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="clay-pressed flex rounded-2xl overflow-hidden p-0.5 gap-0.5">
                    {actions.map(a => {
                      const active = policy.action === a;
                      const color = a === 'block' ? '#f87171' : a === 'warn' ? '#fcd34d' : '#94a3b8';
                      return (
                        <button
                          key={a}
                          disabled={!!saving[policy.ruleId]}
                          onClick={() => updateAction(policy.ruleId, a)}
                          className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all capitalize disabled:opacity-50 ${
                            active ? 'clay-sm' : 'hover:bg-white/5'
                          }`}
                          style={active ? { color } : { color: '#545454' }}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                  {policy.isOverridden && (
                    <button
                      onClick={() => updateAction(policy.ruleId, policy.defaultAction)}
                      className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function PoliciesPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </DashboardLayout>
    }>
      <PoliciesPage />
    </Suspense>
  );
}
