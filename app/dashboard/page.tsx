'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  XCircle, AlertTriangle, Info, CheckCircle, RefreshCw, Settings2,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { FindingsBarChart } from '../components/ui/FindingsBarChart';

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

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

const SEV = {
  critical: { color: '#f87171', label: 'Critical', icon: XCircle,       text: 'text-[#f87171]' },
  high:     { color: '#fb923c', label: 'High',     icon: AlertTriangle,  text: 'text-[#fb923c]' },
  medium:   { color: '#fcd34d', label: 'Medium',   icon: AlertTriangle,  text: 'text-[#fcd34d]' },
  low:      { color: '#818cf8', label: 'Low',       icon: Info,           text: 'text-[#818cf8]' },
  info:     { color: '#94a3b8', label: 'Info',      icon: Info,           text: 'text-[#94a3b8]' },
};

function DashboardPage() {
  const searchParams = useSearchParams();
  const repoId   = searchParams.get('repoId') ?? '';
  const repoName = searchParams.get('repoName') ?? repoId;

  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [haltDecision, setHaltDecision] = useState<{ halt: boolean; severity?: string } | null>(null);
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
  useEffect(() => {
    const t = setInterval(loadFindings, 30_000);
    return () => clearInterval(t);
  }, [loadFindings]);

  const countBySeverity = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length;
    return acc;
  }, {} as Record<string, number>);

  const chartData = SEVERITY_ORDER.map(s => ({ severity: s, count: countBySeverity[s] ?? 0 }));

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
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold gradient-text-primary">{repoName}</h1>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">Security Findings</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/policies?repoId=${repoId}&repoName=${encodeURIComponent(repoName)}`}>
            <Button variant="ghost" size="sm" icon={Settings2}>Policies</Button>
          </Link>
          <Button
            variant="subtle"
            size="sm"
            icon={RefreshCw}
            onClick={loadFindings}
            className={loading ? '[&_svg]:animate-spin' : ''}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Halt banner */}
      {haltDecision && (
        <div className={`mb-6 px-6 py-4 flex items-center gap-3 ${haltDecision.halt ? 'clay-destructive' : 'clay-primary'}`}>
          {haltDecision.halt
            ? <XCircle className="w-5 h-5 text-black/80 flex-shrink-0" />
            : <CheckCircle className="w-5 h-5 text-black/80 flex-shrink-0" />
          }
          <div>
            <span className="font-bold text-black/90">
              {haltDecision.halt ? 'CI HALTED' : 'CI PASSING'}
            </span>
            {haltDecision.severity && (
              <span className="ml-2 text-sm text-black/70">
                — highest severity: {haltDecision.severity}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {SEVERITY_ORDER.map(s => {
          const cfg = SEV[s];
          return (
            <StatCard
              key={s}
              icon={cfg.icon}
              label={cfg.label}
              value={countBySeverity[s] ?? 0}
              color={cfg.text}
            />
          );
        })}
      </div>

      {/* Chart */}
      {!loading && findings.length > 0 && (
        <div className="mb-6">
          <FindingsBarChart data={chartData} />
        </div>
      )}

      {/* Severity filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mr-1">Filter:</p>
        {SEVERITY_ORDER.map(s => {
          const cfg = SEV[s];
          const active = severityFilter === s;
          return (
            <button
              key={s}
              onClick={() => setSeverityFilter(active ? '' : s)}
              className={`clay-pill px-3 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 ${active ? 'clay-pressed' : ''}`}
              style={active ? { color: cfg.color, borderColor: cfg.color + '40' } : {}}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
              {cfg.label}
              <span className="ml-0.5 opacity-60">({countBySeverity[s] ?? 0})</span>
            </button>
          );
        })}
        {severityFilter && (
          <Button variant="subtle" size="sm" onClick={() => setSeverityFilter('')}>
            Clear
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="clay-sm p-4 mb-4" style={{ background: 'linear-gradient(145deg,#2a1a1a,#1f1212)', borderColor: 'rgba(248,113,113,0.2)' }}>
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="clay-sm h-20 animate-pulse" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && findings.length === 0 && (
        <div className="clay p-12 text-center">
          <CheckCircle className="w-12 h-12 text-chart-5/30 mx-auto mb-4" />
          <p className="font-semibold mb-1">No findings</p>
          <p className="text-sm text-muted-foreground">
            {severityFilter ? `No ${severityFilter} findings.` : 'This repository is clean.'}
          </p>
        </div>
      )}

      {/* Findings list */}
      {!loading && findings.length > 0 && (
        <div className="space-y-2">
          {findings.map(f => {
            const cfg = SEV[f.severity] ?? SEV.info;
            const Icon = cfg.icon;
            return (
              <div
                key={f.id}
                className="clay-sm px-5 py-4"
                style={{ borderLeft: `3px solid ${cfg.color}` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.text}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm mb-1">{f.message}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                        <span className="font-mono">{f.rule_id}</span>
                        {f.file_path && (
                          <>
                            <span className="opacity-30">·</span>
                            <span className="font-mono truncate max-w-[28ch]">
                              {f.file_path}{f.line_number ? `:${f.line_number}` : ''}
                            </span>
                          </>
                        )}
                        <span className="opacity-30">·</span>
                        <span className="font-mono">{f.commit_sha.slice(0, 7)}</span>
                        <span className="opacity-30">·</span>
                        <span>{new Date(f.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="clay-pill text-[9px] font-bold uppercase tracking-wider px-2 py-0.5"
                      style={{ color: cfg.color }}
                    >
                      {f.severity}
                    </span>
                    {f.action === 'block' && (
                      <span className="clay-pill text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 text-destructive">
                        BLOCK
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
        <p className="text-[10px] text-muted-foreground/30 text-center mt-8">
          Refreshed {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 30s
        </p>
      )}
    </DashboardLayout>
  );
}

export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </DashboardLayout>
    }>
      <DashboardPage />
    </Suspense>
  );
}
