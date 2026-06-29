'use client';

import { useEffect, useState } from 'react';
import { Key, Copy, Check, ExternalLink } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/ui/Button';

const YAML_SNIPPET = `# Add as the FIRST step of any job you want gated.
# The step fails the job if Gatecheck has blocking findings for this commit.
- name: Gatecheck Security gate
  uses: actions/github-script@v7
  with:
    github-token: \${{ secrets.GITHUB_TOKEN }}
    script: |
      const res = await fetch(
        \`https://gatecheck-theta.vercel.app/api/pipeline/decision?repo=\${{ github.repository }}&sha=\${{ github.sha }}\`,
        { headers: { Authorization: \`Bearer \${{ secrets.GATECHECK_TOKEN }}\` } }
      );
      const { halt } = await res.json();
      if (halt) core.setFailed('Gatecheck: blocking security findings — see dashboard');`;

export default function TokensPage() {
  const [token, setToken] = useState<{ masked: string | null; exists: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [yamlCopied, setYamlCopied] = useState(false);

  useEffect(() => {
    fetch('/api/tokens').then(r => r.json()).then(setToken);
  }, []);

  function copyToken() {
    const full = process.env.NEXT_PUBLIC_PIPELINE_TOKEN ?? '';
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyYaml() {
    navigator.clipboard.writeText(YAML_SNIPPET).then(() => {
      setYamlCopied(true);
      setTimeout(() => setYamlCopied(false), 2000);
    });
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold gradient-text-primary">API Tokens</h1>
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">
          Long-lived tokens used by the Gatecheck runtime Action to halt CI runs
        </p>
      </div>

      {/* Active token */}
      <div className="clay-sm px-5 py-4 mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Token</p>
          <span className="clay-pill text-[9px] px-2 py-0.5 text-primary">PIPELINE:READ</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Tokens are stored as hashes — plaintext is set via Vercel environment variables.
        </p>
        <div className="flex items-center gap-3">
          <div className="clay-pressed flex-1 px-4 py-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-mono text-sm text-muted-foreground">
                {token?.masked ?? '••••••••••••••••••••••••'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copyToken}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        {!token?.exists && (
          <p className="text-[10px] text-destructive mt-2">
            PIPELINE_API_TOKEN not set in Vercel env vars — add it to enable CI gating.
          </p>
        )}
      </div>

      {/* Wire up instructions */}
      <div className="clay-sm px-5 py-4 mb-4">
        <p className="text-sm font-bold mb-4">Wire up the Runtime Action</p>
        <p className="text-xs text-muted-foreground mb-6">Three steps to halt CI runs that Gatecheck has flagged</p>

        <div className="space-y-4">
          {[
            {
              n: 1,
              title: 'Copy the token above',
              body: 'Click the Copy button to copy your PIPELINE_API_TOKEN.',
            },
            {
              n: 2,
              title: 'Add it as a GitHub secret',
              body: (
                <>
                  In your repo: <span className="font-mono text-[11px] clay-pill px-1.5 py-0.5">Settings → Secrets → Actions → New repository secret</span>.
                  Name it <span className="font-mono text-primary">GATECHECK_TOKEN</span>, paste the token.
                </>
              ),
            },
            {
              n: 3,
              title: 'Add the gate step to your workflow',
              body: 'Paste the snippet below as the FIRST step of any job you want gated.',
            },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {step.n}
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* YAML snippet */}
      <div className="clay-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <p className="text-xs font-mono text-muted-foreground">workflow snippet</p>
          <Button variant="ghost" size="sm" icon={yamlCopied ? Check : Copy} onClick={copyYaml}>
            {yamlCopied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <pre className="px-5 py-4 text-[11px] font-mono text-[#94a3b8] overflow-x-auto leading-relaxed">
          {YAML_SNIPPET}
        </pre>
      </div>

      <p className="text-[10px] text-muted-foreground/40 mt-4 text-center">
        The gate soft-fails on Gatecheck API outages — your CI is never broken by our downtime.
        If Gatecheck detects a blocking issue, the job exits non-zero before any other steps run.{' '}
        <a href="https://gatecheck-theta.vercel.app" className="text-primary hover:underline" target="_blank" rel="noreferrer">
          Open dashboard <ExternalLink className="w-3 h-3 inline" />
        </a>
      </p>
    </DashboardLayout>
  );
}
