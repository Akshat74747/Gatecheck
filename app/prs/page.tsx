'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { GitPullRequest, CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/ui/Button';

interface PR {
  id: string;
  repo_full_name: string;
  pr_number: number;
  title: string;
  author: string | null;
  head_branch: string | null;
  base_branch: string;
  html_url: string | null;
  status: string;
  created_at: string;
  review: {
    verdict: string | null;
    confidence_score: number | null;
    review_status: string;
    critical_count: number;
    high_count: number;
  } | null;
}

const VERDICT_CFG = {
  approve:          { label: 'Approved',  color: '#4ade80', icon: CheckCircle },
  request_changes:  { label: 'Changes',   color: '#f87171', icon: XCircle },
  comment:          { label: 'Comment',   color: '#fcd34d', icon: AlertTriangle },
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PRsPage() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/prs?${params}`);
      if (res.ok) setPrs(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function triggerReview(pr: PR) {
    setTriggering(t => ({ ...t, [pr.id]: true }));
    await fetch(`/api/prs/${pr.id}/review`, { method: 'POST' });
    await load();
    setTriggering(t => { const n = { ...t }; delete n[pr.id]; return n; });
  }

  const filters = [
    { label: 'All',       value: '' },
    { label: 'Pending',   value: 'pending' },
    { label: 'Reviewing', value: 'reviewing' },
    { label: 'Reviewed',  value: 'reviewed' },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold gradient-text-primary">Pull Requests</h1>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">
            {prs.length} PR{prs.length !== 1 ? 's' : ''} tracked across your repos
          </p>
        </div>
        <Button variant="subtle" size="sm" icon={RefreshCw} onClick={load}
          className={loading ? '[&_svg]:animate-spin' : ''}>
          Refresh
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`clay-pill px-3 py-1 text-xs font-semibold transition-all ${filter === f.value ? 'clay-pressed text-primary' : 'text-muted-foreground'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="clay-sm h-16 animate-pulse" />)}
        </div>
      )}

      {!loading && prs.length === 0 && (
        <div className="clay p-12 text-center">
          <GitPullRequest className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-semibold mb-1">No pull requests tracked</p>
          <p className="text-sm text-muted-foreground">Open a PR on an enrolled repo to trigger AI review.</p>
        </div>
      )}

      {!loading && prs.length > 0 && (
        <div className="space-y-2">
          {prs.map(pr => {
            const verdict = pr.review?.verdict;
            const cfg = verdict ? VERDICT_CFG[verdict as keyof typeof VERDICT_CFG] : null;
            const isReviewing = pr.status === 'reviewing' || pr.review?.review_status === 'running';

            return (
              <div key={pr.id} className="clay-sm px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <GitPullRequest className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-mono">{pr.repo_full_name}#{pr.pr_number}</span>
                      {pr.head_branch && (
                        <span className="clay-pill text-[9px] px-1.5 py-0.5 text-muted-foreground">
                          {pr.head_branch} → {pr.base_branch}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold mt-0.5 truncate">{pr.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {pr.author && `@${pr.author} · `}{timeAgo(pr.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isReviewing && (
                    <span className="clay-pill text-[9px] px-2 py-0.5 text-[#fcd34d] flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Reviewing
                    </span>
                  )}
                  {cfg && !isReviewing && (
                    <span className="clay-pill text-[9px] px-2 py-0.5 font-bold flex items-center gap-1"
                      style={{ color: cfg.color }}>
                      <cfg.icon className="w-2.5 h-2.5" /> {cfg.label}
                      {pr.review?.confidence_score != null && (
                        <span className="opacity-60">{pr.review.confidence_score}%</span>
                      )}
                    </span>
                  )}
                  {!cfg && !isReviewing && (
                    <span className="clay-pill text-[9px] px-2 py-0.5 text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Pending
                    </span>
                  )}

                  <Link href={`/prs/${pr.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>

                  {!isReviewing && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={triggering[pr.id]}
                      onClick={() => triggerReview(pr)}
                    >
                      Review
                    </Button>
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

export default function PRsPageWrapper() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </DashboardLayout>
    }>
      <PRsPage />
    </Suspense>
  );
}
