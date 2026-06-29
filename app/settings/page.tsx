'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings, GitBranch, Zap, Copy, Check, ShieldCheck, ShieldOff, ExternalLink,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/ui/Button';

interface SettingsData {
  appId: string | null;
  webhookUrl: string;
  geminiConfigured: boolean;
  geminiModel: string;
}

interface Repo {
  id: string;
  full_name: string;
  is_security_enrolled: boolean;
  finding_count: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings);
    fetch('/api/repos').then(r => r.json()).then(setRepos);
  }, []);

  function copyWebhook() {
    if (!settings?.webhookUrl) return;
    navigator.clipboard.writeText(settings.webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function toggleEnroll(repo: Repo) {
    setToggling(repo.id);
    try {
      const res = await fetch(`/api/repos/${repo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_security_enrolled: !repo.is_security_enrolled }),
      });
      if (res.ok) {
        const updated = await res.json() as Repo;
        setRepos(prev => prev.map(r => r.id === repo.id ? { ...r, ...updated } : r));
      }
    } finally {
      setToggling(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold gradient-text-primary">Settings</h1>
        </div>
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">
          Configure your GitHub App, AI provider, and repository settings
        </p>
      </div>

      {/* GitHub App */}
      <div className="clay-sm px-5 py-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-bold">GitHub App</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">App ID</p>
            <span className="clay-pill text-xs font-mono px-2 py-1 text-foreground">
              {settings?.appId ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">Webhook URL</p>
            <div className="flex items-center gap-2">
              <span className="clay-pill text-[11px] font-mono px-2 py-1 text-muted-foreground truncate max-w-[280px]">
                {settings?.webhookUrl ?? '…'}
              </span>
              <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copyWebhook}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-2 pt-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-muted-foreground/60">
              Make sure your GitHub App is subscribed to <span className="text-foreground/70 font-mono">push</span> and{' '}
              <span className="text-foreground/70 font-mono">pull_request</span> events in{' '}
              <a
                href="https://github.com/settings/apps"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                GitHub App settings <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="clay-sm px-5 py-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[#fcd34d]" />
          <p className="text-sm font-bold">AI Configuration</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Provider</p>
            <span className="clay-pill text-xs px-2 py-1 text-foreground">Google Gemini</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Model</p>
            <span className="clay-pill text-xs font-mono px-2 py-1 text-foreground">
              {settings?.geminiModel ?? 'gemini-2.5-flash'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">API Key</p>
            <span
              className="clay-pill text-xs px-2 py-1 font-semibold"
              style={{ color: settings?.geminiConfigured ? '#4ade80' : '#f87171' }}
            >
              {settings?.geminiConfigured ? 'Configured' : 'Not Set — add GEMINI_API_KEY to Vercel'}
            </span>
          </div>
        </div>
        {!settings?.geminiConfigured && (
          <p className="text-[11px] text-destructive mt-3 pt-3 border-t border-white/[0.04]">
            AI PR review is disabled. Add <span className="font-mono">GEMINI_API_KEY</span> to your Vercel environment variables to enable it.
          </p>
        )}
      </div>

      {/* Repository Settings */}
      <div className="clay-sm px-5 py-4">
        <p className="text-sm font-bold mb-1">Repository Settings</p>
        <p className="text-xs text-muted-foreground mb-4">
          Toggle security scanning enrollment per repository.
        </p>

        {repos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No repositories found. Install the GitHub App first.
          </p>
        )}

        <div className="space-y-2">
          {repos.map(repo => (
            <div key={repo.id} className="clay-pressed rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: repo.is_security_enrolled ? '#818cf8' : '#545454' }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{repo.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {repo.finding_count} finding{repo.finding_count !== 1 ? 's' : ''}
                    {repo.is_security_enrolled && (
                      <span className="ml-2 text-primary font-semibold">· Security enrolled</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {repo.is_security_enrolled && (
                  <Link href={`/dashboard?repoId=${repo.id}&repoName=${encodeURIComponent(repo.full_name)}`}>
                    <Button variant="ghost" size="sm" icon={ShieldCheck}>Findings</Button>
                  </Link>
                )}
                <Button
                  variant={repo.is_security_enrolled ? 'subtle' : 'primary'}
                  size="sm"
                  loading={toggling === repo.id}
                  icon={repo.is_security_enrolled ? ShieldOff : ShieldCheck}
                  onClick={() => toggleEnroll(repo)}
                >
                  {repo.is_security_enrolled ? 'Unenroll' : 'Enroll'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
