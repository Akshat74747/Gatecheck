'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { RefreshCw, ShieldCheck, GitPullRequest, AlertTriangle, XCircle, TrendingUp, CheckCircle } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import { StatCard } from '../components/ui/StatCard';
import Button from '../components/ui/Button';

interface AnalyticsData {
  stats: {
    totalReviews: number;
    ciScans: number;
    totalFindings: number;
    criticalFindings: number;
    avgConfidence: number;
    approvalRate: number;
  };
  verdictDistribution: Record<string, number>;
  findingsByAgent: Record<string, number>;
  dailyFindings: Array<{ day: string; severity: string; count: number }>;
}

const VERDICT_COLORS: Record<string, string> = {
  approve: '#4ade80', request_changes: '#f87171', comment: '#fcd34d',
};
const SEV_COLORS: Record<string, string> = {
  critical: '#f87171', high: '#fb923c', medium: '#fcd34d', low: '#818cf8', info: '#94a3b8',
};
const AGENT_LABELS: Record<string, string> = {
  security: 'Security', bugs: 'Bugs', performance: 'Performance',
  readability: 'Readability', best_practices: 'Best Practices', documentation: 'Docs',
};

const DAYS_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?days=${days}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const verdictPieData = data
    ? Object.entries(data.verdictDistribution).filter(([, v]) => v > 0).map(([k, v]) => ({
        name: k === 'approve' ? 'Approved' : k === 'request_changes' ? 'Changes' : 'Comment',
        value: v,
        color: VERDICT_COLORS[k] ?? '#94a3b8',
      }))
    : [];

  const agentBarData = data
    ? Object.entries(data.findingsByAgent)
        .filter(([k]) => k !== 'synthesizer')
        .map(([k, v]) => ({ name: AGENT_LABELS[k] ?? k, count: v }))
        .sort((a, b) => b.count - a.count)
    : [];

  // Build daily stacked area data
  const dailyMap: Record<string, Record<string, number>> = {};
  if (data) {
    for (const row of data.dailyFindings) {
      const day = new Date(row.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dailyMap[day]) dailyMap[day] = {};
      dailyMap[day][row.severity] = (dailyMap[day][row.severity] ?? 0) + row.count;
    }
  }
  const dailyChartData = Object.entries(dailyMap).map(([day, sev]) => ({ day, ...sev }));

  const tooltipStyle = {
    backgroundColor: '#1a212b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#ccc',
    fontSize: 11,
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold gradient-text-primary">Analytics</h1>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">Review insights across your repositories</p>
        </div>
        <div className="flex items-center gap-2">
          {DAYS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`clay-pill px-3 py-1 text-xs font-semibold transition-all ${days === opt.value ? 'clay-pressed text-primary' : 'text-muted-foreground'}`}
            >
              {opt.label}
            </button>
          ))}
          <Button variant="subtle" size="sm" icon={RefreshCw} onClick={load}
            className={loading ? '[&_svg]:animate-spin' : ''}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={GitPullRequest} label="PRs Reviewed"     value={data?.stats.totalReviews ?? 0}     color="text-primary" />
        <StatCard icon={ShieldCheck}   label="CI Scans"          value={data?.stats.ciScans ?? 0}          color="text-secondary" />
        <StatCard icon={AlertTriangle} label="Total Findings"    value={data?.stats.totalFindings ?? 0}    color="text-[#fb923c]" />
        <StatCard icon={XCircle}       label="Critical Findings" value={data?.stats.criticalFindings ?? 0} color="text-destructive" />
        <StatCard icon={TrendingUp}    label="Avg Confidence"    value={`${data?.stats.avgConfidence ?? 0}%`} color="text-[#fcd34d]" />
        <StatCard icon={CheckCircle}   label="Approval Rate"     value={`${data?.stats.approvalRate ?? 0}%`} color="text-chart-5" />
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Verdict Distribution */}
          <div className="clay p-5">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-4">Verdict Distribution</p>
            {verdictPieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No reviews yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={verdictPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {verdictPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Findings by Agent */}
          <div className="clay p-5">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-4">Findings by Agent</p>
            {agentBarData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agent reports yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agentBarData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Issues by severity over time */}
      {data && dailyChartData.length > 0 && (
        <div className="clay p-5">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-4">Issues by Severity Over Time</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyChartData} margin={{ left: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {['critical', 'high', 'medium', 'low'].map(sev => (
                <Area key={sev} type="monotone" dataKey={sev} stackId="1"
                  stroke={SEV_COLORS[sev]} fill={SEV_COLORS[sev] + '40'} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function AnalyticsPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </DashboardLayout>
    }>
      <AnalyticsPage />
    </Suspense>
  );
}
