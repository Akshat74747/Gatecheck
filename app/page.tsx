'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ToggleLeft, ToggleRight, ExternalLink, RefreshCw } from 'lucide-react';

interface Repo {
  id: string;
  full_name: string;
  owner: string;
  name: string;
  default_branch: string;
  is_security_enrolled: boolean;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-10 bg-slate-900/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          <span className="text-xl font-bold tracking-tight">Gatecheck</span>
          <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            CI Security
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Repository Security Center
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Enroll GitHub repositories to scan CI/CD workflows, Dockerfiles, and dependency files for security risks.
          </p>
        </div>

        {/* Stats bar */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Repositories', value: repos.length },
              { label: 'Enrolled', value: enrolled.length },
              { label: 'Unmonitored', value: unenrolled.length },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                <div className="text-3xl font-bold">{s.value}</div>
                <div className="text-sm text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-200">Connected Repositories</h2>
          <button
            onClick={loadRepos}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && repos.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No repositories found</p>
            <p className="text-sm mt-1">Install the GitHub App on your repositories to get started.</p>
          </div>
        )}

        {/* Repo list */}
        {!loading && repos.length > 0 && (
          <div className="space-y-3">
            {repos.map(repo => (
              <div
                key={repo.id}
                className={`group flex items-center justify-between px-6 py-4 rounded-2xl border transition-all duration-200 ${
                  repo.is_security_enrolled
                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15'
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${repo.is_security_enrolled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{repo.full_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Branch: {repo.default_branch}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {repo.is_security_enrolled && (
                    <Link
                      href={`/dashboard?repoId=${repo.id}&repoName=${encodeURIComponent(repo.full_name)}`}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View findings
                    </Link>
                  )}

                  <button
                    onClick={() => toggleEnrollment(repo)}
                    disabled={toggling === repo.id}
                    className="flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {toggling === repo.id ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                    ) : repo.is_security_enrolled ? (
                      <>
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                        <span className="text-emerald-400 hidden sm:inline">Enrolled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-6 h-6 text-slate-500" />
                        <span className="text-slate-500 hidden sm:inline">Enroll</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
