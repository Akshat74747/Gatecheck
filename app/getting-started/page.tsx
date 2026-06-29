'use client';

import Link from 'next/link';
import {
  Rocket, GitBranch, Shield, GitPullRequest, Zap, Bell,
  ExternalLink,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const STEPS = [
  {
    n: 1,
    title: 'Install the GitHub App',
    description:
      'Install the Gatecheck GitHub App on your repositories. The app automatically configures webhooks so Gatecheck receives push and pull request events.',
    href: 'https://github.com/apps/gate-check',
    linkLabel: 'Open GitHub Apps',
  },
  {
    n: 2,
    title: 'Enroll a repository',
    description:
      'Go to the Repositories page and click Enroll on any repo where the GitHub App is installed. This enables CI/CD security scanning for that repo.',
    href: '/',
    linkLabel: 'Go to Repositories',
  },
  {
    n: 3,
    title: 'Trigger your first CI scan',
    description:
      'Push a change that touches a file in .github/workflows/, a Dockerfile, or a dependency file. Gatecheck will scan it for security risks and post findings to the dashboard.',
    href: '/dashboard',
    linkLabel: 'View Findings',
  },
  {
    n: 4,
    title: 'Open a pull request',
    description:
      'Open or update a pull request on an enrolled repo. Gatecheck will automatically run 6 AI agents in parallel to review your code and post a detailed verdict.',
    href: '/prs',
    linkLabel: 'View Pull Requests',
  },
];

const CONCEPTS = [
  {
    icon: GitPullRequest,
    color: '#818cf8',
    title: 'Multi-Agent Review',
    body: 'Every PR is analyzed by 6 specialist Gemini agents in parallel — Security, Bugs, Performance, Readability, Best Practices, and Docs. A synthesizer then combines findings into one verdict.',
  },
  {
    icon: Shield,
    color: '#f87171',
    title: 'CI Security Gate',
    body: 'A lightweight GitHub Actions step checks the Gatecheck decision API. If blocking findings exist for the commit SHA, the job exits non-zero before any other steps run.',
  },
  {
    icon: Zap,
    color: '#fcd34d',
    title: 'Security Findings',
    body: 'Gatecheck detects secrets, supply-chain RCE patterns (pull_request_target + fork checkout), OWASP Top 10, insecure Docker base images, and more — all without running your code.',
  },
  {
    icon: Bell,
    color: '#4ade80',
    title: 'Real-time Updates',
    body: 'The Pull Requests dashboard auto-refreshes while a review is running. Watch each agent complete and the final synthesizer verdict appear live.',
  },
];

export default function GettingStartedPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Rocket className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold gradient-text-primary">Getting Started</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Set up Gatecheck in under 5 minutes and get your first AI-powered code review.
        </p>
      </div>

      {/* Quick setup */}
      <div className="clay-sm px-6 py-5 mb-5">
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-5">Quick Setup</p>
        <div className="space-y-6">
          {STEPS.map(step => (
            <div key={step.n} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">
                {step.n}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                  {step.description}
                </p>
                {step.href.startsWith('http') ? (
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {step.linkLabel} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Link href={step.href} className="text-xs text-primary hover:underline">
                    {step.linkLabel} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key concepts */}
      <div className="clay-sm px-6 py-5">
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-4">Key Concepts</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONCEPTS.map(c => (
            <div key={c.title} className="clay-pressed rounded-xl px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
                <p className="text-sm font-bold">{c.title}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground/50">
        <Link href="/tokens" className="hover:text-muted-foreground">API Tokens →</Link>
        <Link href="/analytics" className="hover:text-muted-foreground">Analytics →</Link>
        <Link href="/repo-health" className="hover:text-muted-foreground">Repo Health →</Link>
      </div>
    </DashboardLayout>
  );
}
