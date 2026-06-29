'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowRight, Shield, Bug, Zap, Eye, Star, FileText, Sparkles, CheckCircle } from 'lucide-react';

const AGENTS = [
  { icon: Shield,    label: 'Security',      sub: '2 critical findings',   color: '#f87171', done: true },
  { icon: Bug,       label: 'Bugs',          sub: '1 logic error found',   color: '#fb923c', done: true },
  { icon: Zap,       label: 'Performance',   sub: '1 N+1 query detected',  color: '#fcd34d', done: true },
  { icon: Eye,       label: 'Readability',   sub: '1 suggestion',          color: '#818cf8', done: true },
  { icon: Star,      label: 'Best Practices', sub: 'All good',             color: '#4ade80', done: true },
  { icon: FileText,  label: 'Documentation', sub: 'Analyzing…',            color: '#94a3b8', done: false },
  { icon: Sparkles,  label: 'Synthesizer',   sub: 'Waiting for agents…',   color: '#94a3b8', done: false },
];

const FEATURES = [
  {
    icon: Shield,
    color: '#f87171',
    title: 'CI Security Gate',
    body: 'Automatically halts CI runs when critical vulnerabilities are detected in your workflows, Dockerfiles, or dependencies.',
  },
  {
    icon: Sparkles,
    color: '#818cf8',
    title: '6-Agent AI Review',
    body: 'Six specialist Gemini agents analyze every PR in parallel — security, bugs, performance, readability, best practices, and docs.',
  },
  {
    icon: Zap,
    color: '#fcd34d',
    title: 'Instant Verdicts',
    body: 'A synthesizer weighs all agent findings and delivers a single approve / request-changes verdict with a confidence score.',
  },
  {
    icon: CheckCircle,
    color: '#4ade80',
    title: 'Repo Health Score',
    body: 'Track the structural health of your repos over time — findings debt, AI confidence, and scan coverage in one dashboard.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.04] backdrop-blur-md bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <span className="font-extrabold text-base tracking-tight">Gatecheck</span>
            <span className="clay-pill text-[9px] px-2 py-0.5 text-primary font-bold hidden sm:inline">v1.0 — Beta</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors hidden sm:block">Features</a>
            <a href="#agents" className="hover:text-foreground transition-colors hidden sm:block">Agents</a>
            <a href="#how" className="hover:text-foreground transition-colors hidden sm:block">How it works</a>
            <Link
              href="/repos"
              className="clay-primary rounded-xl px-4 py-1.5 text-sm font-semibold text-black/90 hover:opacity-90 transition-opacity"
            >
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12">
        {/* Left copy */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 clay-pill px-3 py-1 text-xs text-muted-foreground mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            AI-powered CI/CD security for GitHub
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            AI code reviews<br />
            <span className="gradient-text-primary">that actually secure</span><br />
            your pipeline.
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mb-8 leading-relaxed">
            6 specialist agents run in parallel on every PR — security, bugs, performance,
            readability, best practices, and docs. A synthesizer weighs all findings and
            halts CI before vulnerable code ships.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/repos"
              className="clay-primary rounded-2xl px-6 py-3 font-bold text-base text-black/90 hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/getting-started"
              className="clay-sm rounded-2xl px-6 py-3 font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Getting Started →
            </Link>
          </div>
        </div>

        {/* Right: mock PR review window */}
        <div className="flex-1 min-w-0 w-full max-w-lg lg:max-w-none">
          <div className="clay rounded-2xl overflow-hidden shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <span className="w-3 h-3 rounded-full bg-[#f87171]/60" />
              <span className="w-3 h-3 rounded-full bg-[#fcd34d]/60" />
              <span className="w-3 h-3 rounded-full bg-[#4ade80]/60" />
              <span className="flex-1 clay-pressed rounded-lg px-3 py-1 text-[10px] font-mono text-muted-foreground/50 mx-4">
                gatecheck-theta.vercel.app/prs/…
              </span>
            </div>

            {/* PR header */}
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">feat: add OAuth login flow</p>
                    <p className="text-[10px] text-muted-foreground">PR #42 into <span className="text-primary">main</span></p>
                  </div>
                </div>
                <span className="clay-pill text-[10px] px-2 py-1 text-[#fcd34d] font-bold flex items-center gap-1">
                  ⚠ Changes
                </span>
              </div>
            </div>

            {/* Agent pipeline */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Agent Pipeline</p>
                <span className="text-[10px] text-[#4ade80] font-semibold">● 5/7 complete</span>
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
                      <p className="text-xs font-semibold">{agent.label}</p>
                      <p className="text-[10px] text-muted-foreground/60">{agent.sub}</p>
                    </div>
                    {agent.done ? (
                      <CheckCircle className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/10 flex-shrink-0" />
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
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-3xl font-extrabold">Everything you need to ship securely</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="clay-sm px-5 py-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}18` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <p className="font-bold text-sm mb-2">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-3xl font-extrabold">Set up in under 5 minutes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: '01', title: 'Install the GitHub App', body: 'Install Gatecheck on your repos. Webhooks are configured automatically.' },
            { n: '02', title: 'Enroll a repository', body: 'Go to Repositories and click Enroll to enable CI scanning and AI PR review.' },
            { n: '03', title: 'Push or open a PR', body: 'Gatecheck scans every push and runs 6 AI agents on every PR — automatically.' },
          ].map(step => (
            <div key={step.n} className="clay-sm px-6 py-6 flex gap-4">
              <span className="text-4xl font-extrabold text-primary/20 flex-shrink-0 leading-none">{step.n}</span>
              <div>
                <p className="font-bold text-sm mb-2">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="clay rounded-2xl px-8 py-12 text-center">
          <ShieldCheck className="w-12 h-12 text-primary/40 mx-auto mb-4" />
          <h2 className="text-3xl font-extrabold mb-4 gradient-text-primary">Ready to secure your pipeline?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Connect your first repository and get AI-powered security reviews on every pull request.
          </p>
          <Link
            href="/repos"
            className="clay-primary rounded-2xl px-8 py-3 font-bold text-base text-black/90 hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4 text-xs text-muted-foreground/40">
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
