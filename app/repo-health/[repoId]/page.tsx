'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, RefreshCw, AlertTriangle, XCircle, GitPullRequest,
  TrendingUp, ShieldAlert, CheckSquare, ChevronDown,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import DashboardLayout from '../../components/DashboardLayout';
import { StatCard } from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';

interface Signal {
  score: number;
  percent: number;
  description: string;
}

interface HealthData {
  repoId: string;
  repoFullName: string;
  healthScore: number;
  label: 'Healthy' | 'Needs Attention' | 'At Risk';
  updatedAt: string;
  signals: {
    findingsDebt: Signal;
    aiConfidence: Signal;
    scanCoverage: Signal;
  };
  stats: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    totalScans: number;
    prsAnalyzed: number;
    avgConfidence: number;
  };
  weeklyFindings: Array<{ week: string; critical: number; high: number; medium: number; low: number }>;
  recentScans: Array<{ commitSha: string; jobType: string; status: string; createdAt: string }>;
}

interface Repo {
  id: string;
  full_name: string;
  is_security_enrolled: boolean;
}

const SCORE_COLOR = (s: number) => s >= 80 ? '#4ade80' : s >= 60 ? '#fcd34d' : '#f87171';
const SCORE_LABEL_COLOR = (s: number) => s >= 80 ? 'text-[#4ade80]' : s >= 60 ? 'text-[#fcd34d]' : 'text-[#f87171]';

const SEV_COLORS: Record<string, string> = {
  critical: '#f87171', high: '#fb923c', medium: '#fcd34d', low: '#818cf8',
};

const JOB_TYPE_LABEL: Record<string, string> = {
  push_scan: 'Push', pr_scan: 'PR', cron_scan: 'Cron', enrollment_backfill: 'Backfill',
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ScoreGauge({ score }: { score: number }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = SCORE_COLOR(score);
  return (
    <svg width="180" height="180" className="mx-auto">
      <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
      <circle
        cx="90" cy="90" r={r} fill="none"
        stroke={color} strokeWidth="12"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 90 90)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="90" y="85" textAnchor="middle" fill={color} fontSize="32" fontWeight="800">
        {score}
      </text>
      <text x="90" y="107" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11">
        / 100
      </text>
    </svg>
  );
}

function SignalCard({ label, signal }: { label: string; signal: Signal }) {
  return (
    <div className="clay-pressed rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <span className="text-sm font-bold text-foreground">{signal.percent}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${signal.percent}%`, background: '#818cf8' }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{signal.description}</p>
    </div>
  );
}

export default function RepoHealthPage({ params }: { params: Promise<{ repoId: string }> }) {
  const { repoId } = use(params);
  const [data, setData] = useState<HealthData | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const load = useCallback(async () => {
    const [healthRes, reposRes] = await Promise.all([
      fetch(`/api/repo-health/${repoId}`),
      fetch('/api/repos'),
    ]);
    if (healthRes.ok) setData(await healthRes.json());
    if (reposRes.ok) setRepos(await reposRes.json());
    setLoading(false);
  }, [repoId]);

  useEffect(() => { load(); }, [load]);

  const tooltipStyle = {
    backgroundColor: '#1a212b', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#ccc', fontSize: 11,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="clay p-12 text-center">
          <p className="text-muted-foreground">Repository not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  const enrolledRepos = repos.filter(r => r.is_security_enrolled);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-extrabold gradient-text-primary">Repo Health</h1>
            <span className="clay-pill text-[9px] px-2 py-0.5 text-primary font-bold">BETA</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">Structural health of {data.repoFullName}</p>
        </div>

        {/* Repo selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(d => !d)}
            className="clay-sm flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-white/[0.02] transition-colors rounded-xl"
          >
            {data.repoFullName}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {showDropdown && enrolledRepos.length > 1 && (
            <div className="absolute right-0 top-full mt-1 clay-sm min-w-[220px] z-10 py-1">
              {enrolledRepos.map(r => (
                <Link
                  key={r.id}
                  href={`/repo-health/${r.id}`}
                  onClick={() => setShowDropdown(false)}
                  className="block px-4 py-2 text-sm hover:bg-white/[0.02] transition-colors"
                >
                  {r.full_name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6 Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={Activity}      label="Health Score"     value={data.healthScore}              color={SCORE_LABEL_COLOR(data.healthScore)} />
        <StatCard icon={ShieldAlert}   label="Total Findings"   value={data.stats.totalFindings}      color="text-[#fb923c]" />
        <StatCard icon={XCircle}       label="Critical"         value={data.stats.criticalFindings}   color="text-destructive" />
        <StatCard icon={GitPullRequest} label="PRs Analyzed"    value={data.stats.prsAnalyzed}        color="text-primary" />
        <StatCard icon={TrendingUp}    label="Avg Confidence"   value={`${data.stats.avgConfidence}%`} color="text-[#fcd34d]" />
        <StatCard icon={CheckSquare}   label="CI Scans"         value={data.stats.totalScans}         color="text-chart-5" />
      </div>

      {/* Score gauge + signal cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="clay p-6 flex flex-col items-center justify-center">
          <ScoreGauge score={data.healthScore} />
          <p className={`text-lg font-extrabold mt-2 ${SCORE_LABEL_COLOR(data.healthScore)}`}>
            {data.label}
          </p>
          <p className="text-[10px] text-muted-foreground/40 mt-1">
            Updated {timeAgo(data.updatedAt)}
          </p>
        </div>

        <div className="clay p-5 space-y-3">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">Health Signals</p>
          <SignalCard label="Findings Debt" signal={data.signals.findingsDebt} />
          <SignalCard label="AI Confidence" signal={data.signals.aiConfidence} />
          <SignalCard label="Scan Coverage" signal={data.signals.scanCoverage} />
        </div>
      </div>

      {/* Weekly trend chart */}
      {data.weeklyFindings.length > 0 && (
        <div className="clay p-5 mb-4">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-4">
            90-Day Findings Trend
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.weeklyFindings} margin={{ left: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
                <Line
                  key={sev} type="monotone" dataKey={sev}
                  stroke={SEV_COLORS[sev]} strokeWidth={2} dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent push activity */}
      <div className="clay p-5">
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-4">Recent Push Activity</p>
        {data.recentScans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No scans yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recentScans.map((scan, i) => (
              <div key={i} className="clay-pressed rounded-xl px-4 py-2.5 flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">{scan.commitSha.slice(0, 7)}</span>
                <span
                  className="clay-pill text-[9px] px-1.5 py-0.5 text-muted-foreground"
                >
                  {JOB_TYPE_LABEL[scan.jobType] ?? scan.jobType}
                </span>
                <span
                  className="clay-pill text-[9px] px-1.5 py-0.5 font-semibold"
                  style={{
                    color: scan.status === 'completed' ? '#4ade80'
                      : scan.status === 'failed' ? '#f87171'
                      : '#94a3b8',
                  }}
                >
                  {scan.status}
                </span>
                <span className="text-[10px] text-muted-foreground/50 ml-1">{timeAgo(scan.createdAt)}</span>
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href={`/repo-health/${repoId}/commit/${scan.commitSha}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View Changes →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="subtle" size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
          View all findings →
        </Link>
      </div>
    </DashboardLayout>
  );
}
