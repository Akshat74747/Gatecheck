'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Info, RefreshCw,
  ExternalLink, Shield, Bug, Zap, Eye, Star, FileText, Sparkles,
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/ui/Button';

interface AgentFinding {
  severity: string;
  category: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}
interface AgentReport {
  id: string;
  agent_type: string;
  status: string;
  summary: string | null;
  findings: AgentFinding[];
  finding_count: number;
}
interface Review {
  id: string;
  verdict: string | null;
  confidence_score: number | null;
  summary: string | null;
  top_actions: string[];
  changelog_entry: string | null;
  status: string;
  critical_count: number;
  high_count: number;
}
interface PRDetail {
  id: string;
  repo_full_name: string;
  pr_number: number;
  title: string;
  author: string | null;
  head_sha: string;
  head_branch: string | null;
  base_branch: string;
  html_url: string | null;
  status: string;
  review: Review | null;
  agent_reports: AgentReport[];
}

const AGENT_CFG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  security:       { label: 'Security',      icon: Shield },
  bugs:           { label: 'Bugs',          icon: Bug },
  performance:    { label: 'Performance',   icon: Zap },
  readability:    { label: 'Readability',   icon: Eye },
  best_practices: { label: 'Best Practices', icon: Star },
  documentation:  { label: 'Docs',          icon: FileText },
  synthesizer:    { label: 'Final Review',  icon: Sparkles },
};

const SEV_COLOR: Record<string, string> = {
  critical: '#f87171', high: '#fb923c', medium: '#fcd34d', low: '#818cf8', info: '#94a3b8',
};
const SEV_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  critical: XCircle, high: AlertTriangle, medium: AlertTriangle, low: Info, info: Info,
};

const TAB_ORDER = ['security', 'bugs', 'performance', 'readability', 'best_practices', 'documentation', 'synthesizer'];

export default function PRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pr, setPr] = useState<PRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('security');

  const load = useCallback(async () => {
    const res = await fetch(`/api/prs/${id}`);
    if (res.ok) setPr(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh while reviewing
  useEffect(() => {
    if (!pr || pr.status === 'reviewing' || pr.review?.status === 'running') {
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }
  }, [pr, load]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!pr) {
    return (
      <DashboardLayout>
        <div className="clay p-12 text-center">
          <p className="text-muted-foreground">PR not found.</p>
          <Link href="/prs"><Button variant="ghost" className="mt-4">← Back</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const isReviewing = pr.status === 'reviewing' || pr.review?.status === 'running';
  const verdict = pr.review?.verdict;

  const reportMap = Object.fromEntries(pr.agent_reports.map(r => [r.agent_type, r]));
  const activeReport = reportMap[activeTab];

  const verdictBannerClass = verdict === 'approve'
    ? 'clay-primary'
    : verdict === 'request_changes'
    ? 'clay-destructive'
    : 'clay-accent';
  const verdictLabel = verdict === 'approve' ? 'Approved' : verdict === 'request_changes' ? 'Changes Requested' : verdict === 'comment' ? 'Comment' : 'Under Review';

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Link href="/prs" className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Pull Requests
          </Link>
          <p className="text-[10px] text-muted-foreground font-mono mb-1">{pr.repo_full_name} #{pr.pr_number}</p>
          <h1 className="text-xl font-extrabold">{pr.title}</h1>
          <p className="text-[10px] text-muted-foreground mt-1">
            {pr.author && `@${pr.author} · `}
            {pr.head_branch} → {pr.base_branch} · {pr.head_sha.slice(0, 7)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {pr.html_url && (
            <a href={pr.html_url} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" icon={ExternalLink}>GitHub</Button>
            </a>
          )}
          {isReviewing && (
            <span className="clay-pill text-[9px] px-2 py-1 text-[#fcd34d] flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Reviewing…
            </span>
          )}
        </div>
      </div>

      {/* Verdict banner */}
      {(verdict || isReviewing) && (
        <div className={`mb-6 px-6 py-4 flex items-center justify-between gap-4 ${isReviewing ? '' : verdictBannerClass} clay`}>
          <div className="flex items-center gap-3">
            {isReviewing ? (
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : verdict === 'approve' ? (
              <CheckCircle className="w-5 h-5 text-black/80" />
            ) : verdict === 'request_changes' ? (
              <XCircle className="w-5 h-5 text-black/80" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-black/80" />
            )}
            <span className="font-bold text-black/90">
              {isReviewing ? 'Running AI Review…' : verdictLabel}
            </span>
          </div>
          {pr.review?.confidence_score != null && (
            <span className="text-3xl font-extrabold text-black/80">{pr.review.confidence_score}%</span>
          )}
        </div>
      )}

      {/* Summary */}
      {pr.review?.summary && (
        <div className="clay-sm px-5 py-4 mb-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{pr.review.summary}</p>
        </div>
      )}

      {/* Agent tabs */}
      <div className="flex flex-wrap gap-1 mb-4 clay-sm p-1">
        {TAB_ORDER.map(key => {
          const cfg = AGENT_CFG[key];
          if (!cfg) return null;
          const report = reportMap[key];
          const count = report?.finding_count ?? 0;
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                active ? 'clay-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <cfg.icon className="w-3 h-3" />
              {cfg.label}
              {count > 0 && (
                <span className="clay-pill text-[9px] px-1.5 py-0 text-destructive">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {isReviewing && !activeReport && (
        <div className="clay p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Agent running…</p>
        </div>
      )}

      {activeReport && (
        <div className="space-y-3">
          {/* Agent summary */}
          {activeReport.summary && (
            <div className="clay-sm px-5 py-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{activeReport.summary}</p>
            </div>
          )}

          {/* Final Review: top actions + changelog */}
          {activeTab === 'synthesizer' && pr.review && (
            <>
              {pr.review.top_actions?.length > 0 && (
                <div className="clay-sm px-5 py-4">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">Top Actions</p>
                  <ol className="space-y-2">
                    {pr.review.top_actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {action}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {pr.review.changelog_entry && (
                <div className="clay-sm px-5 py-4">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-2">Changelog Entry</p>
                  <p className="text-sm font-mono text-muted-foreground">{pr.review.changelog_entry}</p>
                </div>
              )}
            </>
          )}

          {/* Findings list */}
          {activeReport.findings?.length > 0 && (
            <div className="space-y-2">
              {activeReport.findings.map((f, i) => {
                const color = SEV_COLOR[f.severity] ?? '#94a3b8';
                const Icon = SEV_ICON[f.severity] ?? Info;
                return (
                  <div key={i} className="clay-sm px-5 py-3" style={{ borderLeft: `3px solid ${color}` }}>
                    <div className="flex items-start gap-3">
                      <span style={{ color }} className="flex-shrink-0 mt-0.5"><Icon className="w-4 h-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="clay-pill text-[9px] font-bold uppercase px-1.5 py-0.5" style={{ color }}>{f.severity}</span>
                          <span className="text-[10px] text-muted-foreground">{f.category}</span>
                        </div>
                        <p className="text-sm font-medium mb-1">{f.message}</p>
                        {(f.file || f.line) && (
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">
                            {f.file}{f.line ? `:${f.line}` : ''}
                          </p>
                        )}
                        {f.suggestion && (
                          <p className="text-[10px] text-muted-foreground/70 italic">{f.suggestion}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeReport.findings?.length === 0 && activeTab !== 'synthesizer' && (
            <div className="clay p-8 text-center">
              <CheckCircle className="w-8 h-8 text-chart-5/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No issues found by this agent.</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
