'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowRight, Shield, Bug, Zap, Eye, Star, FileText, Sparkles, CheckCircle, Lock } from 'lucide-react';

const AGENTS = [
  { icon: Shield,    label: 'Security',       sub: '2 critical findings',   color: '#ef4444', done: true },
  { icon: Bug,       label: 'Bugs',           sub: '1 logic error found',   color: '#f97316', done: true },
  { icon: Zap,       label: 'Performance',    sub: '1 N+1 query detected',  color: '#f59e0b', done: true },
  { icon: Eye,       label: 'Readability',    sub: '1 suggestion',          color: '#6366f1', done: true },
  { icon: Star,      label: 'Best Practices', sub: 'All good',              color: '#22c55e', done: true },
  { icon: FileText,  label: 'Documentation',  sub: 'Analyzing…',            color: '#94a3b8', done: false },
  { icon: Sparkles,  label: 'Synthesizer',    sub: 'Waiting for agents…',   color: '#94a3b8', done: false },
];

const FEATURES = [
  {
    icon: Lock,
    color: '#6366f1',
    bg: '#eef2ff',
    title: 'CI Security Gate',
    body: 'Blocks deployments the moment critical vulnerabilities are found — before a single line of dangerous code reaches production.',
  },
  {
    icon: Sparkles,
    color: '#0d9488',
    bg: '#f0fdfa',
    title: '6-Agent AI Review',
    body: 'Security, bugs, performance, readability, best practices, and docs — six Gemini agents review every PR simultaneously.',
  },
  {
    icon: CheckCircle,
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Clear Verdicts',
    body: 'One synthesized verdict with a confidence score and the top three actions your team needs to take. No noise, just signal.',
  },
  {
    icon: Zap,
    color: '#22c55e',
    bg: '#f0fdf4',
    title: 'Repo Health Score',
    body: 'Track your codebase\'s security posture over time with trend charts, signal cards, and a 0–100 health score.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-black/[0.06]" style={{ background: 'rgba(240,244,255,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 clay-primary rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-foreground">Gatecheck</span>
            <span className="clay-pill text-[9px] px-2 py-0.5 text-primary font-bold hidden sm:inline">Beta</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors hidden sm:block">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors hidden sm:block">How it works</a>
            <Link
              href="/repos"
              className="clay-primary rounded-xl px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Open Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-14">
        {/* Left copy */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 clay-pill px-3 py-1.5 text-xs text-muted-foreground mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            AI-powered security — no config required
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] mb-6 text-foreground">
            Catch security risks<br />
            <span className="gradient-text-primary">before they ship.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mb-8 leading-relaxed">
            Gatecheck runs six AI agents on every pull request and halts your CI pipeline
            the moment it detects a critical vulnerability — secrets, supply-chain attacks,
            OWASP issues, and more.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/repos"
              className="clay-primary rounded-2xl px-6 py-3 font-bold text-base text-white hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/getting-started"
              className="clay-sm rounded-2xl px-6 py-3 font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Getting Started →
            </Link>
          </div>
          {/* Trust badges */}
          <div className="flex items-center gap-6 mt-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> No code stored</div>
            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> GitHub App install</div>
            <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Runs on every PR</div>
          </div>
        </div>

        {/* Right: mock PR review window */}
        <div className="flex-1 min-w-0 w-full max-w-lg lg:max-w-none">
          <div className="clay rounded-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.05]" style={{ background: 'linear-gradient(145deg,#f8fafc,#f1f5f9)' }}>
              <span className="w-3 h-3 rounded-full bg-red-400/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <span className="w-3 h-3 rounded-full bg-green-400/70" />
              <span className="flex-1 clay-pressed rounded-lg px-3 py-1 text-[10px] font-mono text-muted-foreground/60 mx-4">
                gatecheck-theta.vercel.app/prs/…
              </span>
            </div>

            {/* PR header */}
            <div className="px-5 py-4 border-b border-black/[0.04]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#eef2ff' }}>
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">feat: add OAuth login flow</p>
                    <p className="text-[10px] text-muted-foreground">PR #42 into <span className="text-primary font-semibold">main</span></p>
                  </div>
                </div>
                <span className="clay-pill text-[10px] px-2.5 py-1 font-bold flex items-center gap-1" style={{ color: '#f97316' }}>
                  ⚠ Changes Requested
                </span>
              </div>
            </div>

            {/* Agent pipeline */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Agent Pipeline</p>
                <span className="text-[10px] text-green-600 font-semibold">● 5/7 complete</span>
              </div>
              <div className="space-y-2">
                {AGENTS.map((agent) => (
                  <div key={agent.label} className="clay-pressed rounded-xl px-3 py-2.5 flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${agent.color}18` }}
                    >
                      <agent.icon className="w-3.5 h-3.5" style={{ color: agent.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{agent.label}</p>
                      <p className="text-[10px] text-muted-foreground">{agent.sub}</p>
                    </div>
                    {agent.done ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold mb-3">Features</p>
          <h2 className="text-3xl font-extrabold text-foreground">Everything you need to ship securely</h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto text-sm">From first push to production deploy — Gatecheck has every stage covered.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="clay-sm px-5 py-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: f.bg }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <p className="font-bold text-sm mb-2 text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold mb-3">How it works</p>
          <h2 className="text-3xl font-extrabold text-foreground">Up and running in minutes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              n: '01',
              title: 'Install & connect',
              body: 'Install the Gatecheck GitHub App and enroll your repositories. Webhooks are configured automatically — no YAML to write.',
            },
            {
              n: '02',
              title: 'Push or open a PR',
              body: 'Gatecheck instantly picks up every push and pull request. Six AI agents start analysing in parallel within seconds.',
            },
            {
              n: '03',
              title: 'Review findings & ship',
              body: 'View the synthesized verdict, fix what matters, and let the CI gate confirm it\'s safe before anything merges.',
            },
          ].map(step => (
            <div key={step.n} className="clay-sm px-6 py-6 flex gap-4">
              <span className="text-4xl font-extrabold flex-shrink-0 leading-none" style={{ color: '#c7d2fe' }}>{step.n}</span>
              <div>
                <p className="font-bold text-sm mb-2 text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="clay rounded-2xl px-8 py-14 text-center" style={{ background: 'linear-gradient(145deg,#eef2ff,#e0e7ff)' }}>
          <div className="w-14 h-14 clay-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold mb-4 text-foreground">Ready to secure your pipeline?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Connect your first repository and get AI-powered security reviews on every pull request — automatically.
          </p>
          <Link
            href="/repos"
            className="clay-primary rounded-2xl px-8 py-3 font-bold text-base text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            Open Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4 text-xs text-muted-foreground/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary/50" />
            <span>Gatecheck — CI Security Scanner</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/getting-started" className="hover:text-muted-foreground">Docs</Link>
            <Link href="/tokens" className="hover:text-muted-foreground">API</Link>
            <Link href="/repos" className="hover:text-muted-foreground">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
