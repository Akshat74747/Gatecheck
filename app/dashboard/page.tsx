'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Info,
  RefreshCw,
  Settings,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';

interface Finding {
  id: string;
  rule_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  action: string;
  file_path: string;
  line_number: number | null;
  message: string;
  commit_sha: string;
  created_at: string;
  resolution_status: string | null;
}

interface HaltDecision {
  halt: boolean;
  severity?: string;
  reason?: string;
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

const severityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', dot: 'bg-red-400', icon: XCircle },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', dot: 'bg-orange-400', icon: AlertTriangle },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', dot: 'bg-yellow-400', icon: AlertTriangle },
  low:      { color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', dot: 'bg-blue-400', icon: Info },
  info:     { color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/30', dot: 'bg-slate-400', icon: Info },
};

function SeverityBadge({ severity }: { severity: Finding['severity'] }) {
  const cfg = severityConfig[severity] ?? severityConfig.info;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {severity.toUpperCase()}
    </span>
  );
}

function DashboardPage() {
  const searchParams = useSearchParams();
  const repoId   = searchParams.get('repoId') ?? '';
  const repoName = searchParams.get('repoName') ?? repoId;

  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [haltDecision, setHaltDecision] = useState<HaltDecision | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadFindings = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ repoId });
      if (severityFilter) params.set('severity', severityFilter);
      const [findRes, haltRes] = await Promise.all([
        fetch(`/api/findings?${params}`),
        fetch(`/api/pipeline/decision?repo=${encodeURIComponent(repoName)}&sha=HEAD`),
      ]);
      if (!findRes.ok) throw new Error(`HTTP ${findRes.status}`);
      setFindings(await findRes.json());
      if (haltRes.ok) setHaltDecision(await haltRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load findings');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [repoId, repoName, severityFilter]);

  useEffect(() => { loadFindings(); }, [loadFindings]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadFindings, 30_000);
    return () => clearInterval(interval);
  }, [loadFindings]);

  const countBySeverity = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length;
    return acc;
  }, {} as Record<string, number>);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-10 bg-slate-900/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span className="font-semibold text-sm">{repoName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/policies?repoId=${repoId}&repoName=${encodeURIComponent(repoName)}`}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              Policies
            </Link>
            <button
              onClick={loadFindings}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Halt decision banner */}
        {haltDecision && (
          <div className={`mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl border ${
            haltDecision.halt
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {haltDecision.halt
              ? <XCircle className="w-5 h-5 flex-shrink-0" />
              : <CheckCircle className="w-5 h-5 flex-shrink-0" />
            }
            <div>
              <span className="font-semibold">
                {haltDecision.halt ? 'CI HALTED' : 'CI PASSING'}
              </span>
              {haltDecision.severity && (
                <span className="ml-2 text-sm opacity-80">
                  — highest severity: {haltDecision.severity}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Severity summary */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {SEVERITY_ORDER.map(s => {
            const cfg = severityConfig[s as Finding['severity']];
            const count = countBySeverity[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => setSeverityFilter(severityFilter === s ? '' : s)}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  severityFilter === s
                    ? cfg.bg + ' ring-1 ring-inset ' + cfg.color.replace('text-', 'ring-')
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                }`}
              >
                <div className={`text-2xl font-bold ${cfg.color}`}>{count}</div>
                <div className="text-xs text-slate-400 mt-0.5 capitalize">{s}</div>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        {severityFilter && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-slate-400">Filtering by:</span>
            <SeverityBadge severity={severityFilter as Finding['severity']} />
            <button
              onClick={() => setSeverityFilter('')}
              className="text-xs text-slate-500 hover:text-white ml-1"
            >
              Clear
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white/5 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && findings.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No findings</p>
            <p className="text-sm mt-1">
              {severityFilter ? `No ${severityFilter} findings for this repo.` : 'This repository is clean.'}
            </p>
          </div>
        )}

        {!loading && findings.length > 0 && (
          <div className="space-y-3">
            {findings.map(f => {
              const cfg = severityConfig[f.severity] ?? severityConfig.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={f.id}
                  className={`rounded-2xl border px-5 py-4 ${cfg.bg}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm mb-1">{f.message}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span className="font-mono">{f.rule_id}</span>
                          {f.file_path && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="font-mono truncate max-w-[30ch]">{f.file_path}{f.line_number ? `:${f.line_number}` : ''}</span>
                            </>
                          )}
                          <span className="text-slate-600">·</span>
                          <span className="font-mono" title={f.commit_sha}>{f.commit_sha.slice(0, 7)}</span>
                          <span className="text-slate-600">·</span>
                          <span>{new Date(f.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <SeverityBadge severity={f.severity} />
                      {f.action === 'block' && (
                        <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">
                          BLOCK
                        </span>
                      )}
                      {f.resolution_status && (
                        <span className="text-xs bg-slate-500/20 text-slate-300 border border-slate-500/30 px-2 py-0.5 rounded-full">
                          {f.resolution_status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {lastRefreshed && (
          <p className="text-xs text-slate-600 text-center mt-8">
            Last refreshed: {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 30s
          </p>
        )}
      </main>
    </div>
  );
}

export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    }>
      <DashboardPage />
    </Suspense>
  );
}
