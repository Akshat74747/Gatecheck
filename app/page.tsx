'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Database, ShieldCheck, ShieldOff, RefreshCw, ExternalLink, Activity } from 'lucide-react';
import DashboardLayout from './components/DashboardLayout';
import Button from './components/ui/Button';
import { StatCard } from './components/ui/StatCard';

interface Repo {
  id: string;
  full_name: string;
  owner: string;
  name: string;
  default_branch: string;
  is_security_enrolled: boolean;
  finding_count: number;
}

export default function HomePage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRepos() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/repos');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRepos(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load repos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRepos(); }, []);

  async function toggleEnrollment(repo: Repo) {
    setToggling(repo.id);
    try {
      const res = await fetch(`/api/repos/${repo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_security_enrolled: !repo.is_security_enrolled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json() as Repo;
      setRepos(prev => prev.map(r => r.id === repo.id ? { ...r, ...updated } : r));
    } catch (e) {
      console.error('Toggle failed', e);
    } finally {
      setToggling(null);
    }
  }

  const enrolled = repos.filter(r => r.is_security_enrolled);
  const unenrolled = repos.filter(r => !r.is_security_enrolled);

  return (
    <DashboardLayout>
      {/* Hero */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 gradient-text-primary">
          Repositories
        </h1>
        <p className="text-muted-foreground max-w-xl">
          Connect GitHub repositories to enable AI-powered PR reviews and CI/CD security scanning.
        </p>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-in-up-delay-1">
          <StatCard icon={Database} label="Repositories" value={repos.length} color="text-primary" />
          <StatCard icon={ShieldCheck} label="Enrolled" value={enrolled.length} color="text-chart-5" />
          <StatCard icon={ShieldOff} label="Unmonitored" value={unenrolled.length} color="text-muted-foreground" />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
          Connected Repositories ({repos.length})
        </p>
        <Button
          variant="subtle"
          size="sm"
          icon={RefreshCw}
          onClick={loadRepos}
          className={loading ? '[&_svg]:animate-spin' : ''}
        >
          Refresh
        </Button>
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
          {[1, 2, 3].map(i => (
            <div key={i} className="clay-sm h-[72px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && repos.length === 0 && (
        <div className="clay p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-primary/30 mx-auto mb-4" />
          <p className="font-semibold mb-1">No repositories found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Install the GitHub App on your repositories to get started.
          </p>
          <Link href="/getting-started" className="text-primary text-sm hover:underline">
            View Getting Started guide →
          </Link>
        </div>
      )}

      {/* Repo list */}
      {!loading && repos.length > 0 && (
        <div className="space-y-2">
          {repos.map(repo => (
            <div
              key={repo.id}
              className="clay-sm px-5 py-4 flex items-center justify-between gap-4"
              style={repo.is_security_enrolled ? { borderLeft: '3px solid #818cf8' } : {}}
            >
              {/* Left: info */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: repo.is_security_enrolled ? '#818cf8' : '#545454' }}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{repo.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="clay-pill text-[9px] text-muted-foreground px-2 py-0.5">
                      {repo.default_branch}
                    </span>
                    {repo.is_security_enrolled && (
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}
                      >
                        Auto-review on
                      </span>
                    )}
                    {repo.finding_count > 0 && (
                      <span className="text-[9px] text-muted-foreground">
                        {repo.finding_count} finding{repo.finding_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {repo.is_security_enrolled && (
                  <Link href={`/repo-health/${repo.id}`}>
                    <Button variant="ghost" size="sm" icon={Activity}>Health</Button>
                  </Link>
                )}
                {repo.is_security_enrolled && (
                  <Link href={`/dashboard?repoId=${repo.id}&repoName=${encodeURIComponent(repo.full_name)}`}>
                    <Button variant="ghost" size="sm" icon={ExternalLink}>Findings</Button>
                  </Link>
                )}
                <Button
                  variant={repo.is_security_enrolled ? 'subtle' : 'primary'}
                  size="sm"
                  loading={toggling === repo.id}
                  onClick={() => toggleEnrollment(repo)}
                >
                  {repo.is_security_enrolled ? 'Unenroll' : 'Enroll'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
