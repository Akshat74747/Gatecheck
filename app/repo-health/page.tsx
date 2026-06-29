'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

interface Repo {
  id: string;
  full_name: string;
  is_security_enrolled: boolean;
}

export default function RepoHealthIndexPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/repos')
      .then(r => r.json())
      .then((data: Repo[]) => {
        setRepos(data);
        const enrolled = data.filter(r => r.is_security_enrolled);
        if (enrolled.length === 1) {
          router.replace(`/repo-health/${enrolled[0].id}`);
        }
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const enrolled = repos.filter(r => r.is_security_enrolled);

  if (enrolled.length === 0) {
    return (
      <DashboardLayout>
        <div className="clay p-12 text-center">
          <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-semibold mb-1">No enrolled repositories</p>
          <p className="text-sm text-muted-foreground mb-4">
            Enroll a repository to start tracking its health.
          </p>
          <a href="/" className="text-primary text-sm hover:underline">Go to Repositories →</a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold gradient-text-primary">Repo Health</h1>
        </div>
        <p className="text-sm text-muted-foreground">Select a repository to view its health dashboard.</p>
      </div>
      <div className="space-y-2">
        {enrolled.map(repo => (
          <a
            key={repo.id}
            href={`/repo-health/${repo.id}`}
            className="clay-sm px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors block"
          >
            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm">{repo.full_name}</span>
            <span className="ml-auto text-xs text-muted-foreground">View health →</span>
          </a>
        ))}
      </div>
    </DashboardLayout>
  );
}
