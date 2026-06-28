'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Save,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

type PolicyAction = 'block' | 'warn' | 'off';

interface PolicyRow {
  ruleId: string;
  description: string;
  defaultAction: PolicyAction;
  defaultSeverity: string;
  action: PolicyAction;
  isOverridden: boolean;
}

const ACTION_CONFIG: Record<PolicyAction, { label: string; color: string; bg: string }> = {
  block: { label: 'Block', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40 ring-red-500/50' },
  warn:  { label: 'Warn',  color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40 ring-yellow-500/50' },
  off:   { label: 'Off',   color: 'text-slate-400', bg: 'bg-slate-700/50 border-slate-600/40 ring-slate-500/50' },
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  critical: <XCircle className="w-4 h-4 text-red-400" />,
  high:     <AlertTriangle className="w-4 h-4 text-orange-400" />,
  medium:   <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  low:      <Info className="w-4 h-4 text-blue-400" />,
  info:     <Info className="w-4 h-4 text-slate-400" />,
};

function ActionToggle({
  current,
  onChange,
  saving,
}: {
  current: PolicyAction;
  onChange: (a: PolicyAction) => void;
  saving: boolean;
}) {
  const actions: PolicyAction[] = ['block', 'warn', 'off'];
  return (
    <div className="flex rounded-xl overflow-hidden border border-white/10">
      {actions.map(a => {
        const cfg = ACTION_CONFIG[a];
        const active = current === a;
        return (
          <button
            key={a}
            onClick={() => onChange(a)}
            disabled={saving}
            className={`px-4 py-1.5 text-xs font-semibold transition-all ${
              active
                ? `${cfg.bg} ${cfg.color} border ring-1`
                : 'text-slate-500 hover:text-slate-300 bg-transparent'
            } disabled:opacity-50`}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

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
      setPolicies(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  async function updateAction(ruleId: string, action: PolicyAction) {
    // Optimistic update
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
    } catch (e) {
      console.error('Save failed', e);
      // Revert
      loadPolicies();
    } finally {
      setSaving(s => { const n = { ...s }; delete n[ruleId]; return n; });
    }
  }

  if (!repoId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No repository selected.</p>
          <Link href="/" className="text-emerald-400 hover:underline">← Back to repos</Link>
        </div>
      </div>
    );
  }

  const overridden = policies.filter(p => p.isOverridden).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-10 bg-slate-900/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard?repoId=${repoId}&repoName=${encodeURIComponent(repoName)}`}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <span className="font-semibold text-sm">{repoName}</span>
              <span className="ml-2 text-slate-500 text-sm">/ Policies</span>
            </div>
          </div>
          <button
            onClick={loadPolicies}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Security Policy Rules
          </h1>
          <p className="text-slate-400">
            Configure how each rule behaves. <strong className="text-white">Block</strong> halts CI,{' '}
            <strong className="text-white">Warn</strong> logs but continues, <strong className="text-white">Off</strong> ignores the rule.
            {overridden > 0 && (
              <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                {overridden} override{overridden !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && policies.length > 0 && (
          <div className="space-y-2">
            {policies.map(policy => (
              <div
                key={policy.ruleId}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${
                  policy.isOverridden
                    ? 'bg-yellow-500/5 border-yellow-500/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {SEVERITY_ICON[policy.defaultSeverity] ?? SEVERITY_ICON.info}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-300">{policy.ruleId}</span>
                      {policy.isOverridden && (
                        <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                          overridden
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{policy.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  {saved[policy.ruleId] && (
                    <Save className="w-4 h-4 text-emerald-400 animate-pulse" />
                  )}
                  <ActionToggle
                    current={policy.action}
                    onChange={a => updateAction(policy.ruleId, a)}
                    saving={!!saving[policy.ruleId]}
                  />
                  {policy.isOverridden && (
                    <button
                      onClick={() => updateAction(policy.ruleId, policy.defaultAction)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      title="Reset to default"
                    >
                      reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && policies.length === 0 && !error && (
          <div className="text-center py-20 text-slate-500">
            <p>No policy rules found.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PoliciesPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    }>
      <PoliciesPage />
    </Suspense>
  );
}
