import { callGeminiJSON } from '@/lib/llm/gemini';
import type { AgentOutput } from './types';

export interface SynthesisResult {
  verdict: 'approve' | 'request_changes' | 'comment';
  confidence_score: number;
  summary: string;
  top_actions: string[];
  changelog_entry: string;
}

function buildFallbackSynthesis(
  agentOutputs: Record<string, AgentOutput>,
  allFindings: Array<{ severity: string; message: string; file?: string; suggestion?: string; agent: string }>,
): SynthesisResult {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of allFindings) counts[f.severity as keyof typeof counts]++;

  const verdict: SynthesisResult['verdict'] =
    counts.critical > 0 || counts.high > 0 ? 'request_changes' :
    counts.medium > 0 ? 'comment' : 'approve';

  const confidence_score =
    counts.critical > 0 ? 95 :
    counts.high > 0 ? 88 :
    counts.medium > 0 ? 78 : 70;

  const topFindings = allFindings
    .filter(f => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 3);

  const top_actions = topFindings.length > 0
    ? topFindings.map(f => f.suggestion ?? f.message).slice(0, 3)
    : allFindings.slice(0, 3).map(f => f.suggestion ?? f.message);

  const agentNames = Object.keys(agentOutputs);
  const summary =
    `This pull request was reviewed by ${agentNames.length} AI agents across security, bugs, performance, readability, best practices, and documentation. ` +
    `Found ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, and ${counts.low} low severity issues. ` +
    (counts.critical > 0 || counts.high > 0
      ? `Immediate action required: address critical and high severity findings before merging.`
      : counts.medium > 0
      ? `Medium severity issues should be reviewed and addressed.`
      : `No blocking issues found.`);

  const changelog_entry =
    counts.critical > 0 ? `Security: fix ${counts.critical} critical vulnerabilities identified in code review` :
    counts.high > 0 ? `Fix ${counts.high} high severity issues found in automated review` :
    `Code review passed with ${counts.medium} minor suggestions`;

  return { verdict, confidence_score, summary, top_actions, changelog_entry };
}

export async function runSynthesizer(
  agentOutputs: Record<string, AgentOutput>,
  repoName: string,
): Promise<SynthesisResult> {
  const allFindings = Object.entries(agentOutputs).flatMap(([agent, out]) =>
    out.findings.map(f => ({ ...f, agent }))
  );

  const criticalOrHigh = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high');

  // Cap findings to keep the prompt small
  const cappedFindings = [
    ...allFindings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 8),
    ...allFindings.filter(f => f.severity === 'medium').slice(0, 5),
  ];

  const findingsSummary = cappedFindings.map(f =>
    `[${f.agent.toUpperCase()}] ${f.severity.toUpperCase()}: ${f.message}${f.file ? ` (${f.file})` : ''}`
  ).join('\n');

  // Truncate each agent summary to 120 chars to keep prompt tight
  const agentSummaries = Object.entries(agentOutputs).map(([agent, out]) =>
    `${agent}: ${out.summary.slice(0, 120)}`
  ).join('\n');

  const forcedVerdict = criticalOrHigh.length > 0 ? 'request_changes' : null;

  const prompt = `Synthesize this code review for "${repoName}". Be brief.

Agent summaries:
${agentSummaries}

Top findings (${cappedFindings.length} of ${allFindings.length}):
${findingsSummary || 'None.'}

Return JSON only:
{"verdict":"${forcedVerdict ?? 'approve|request_changes|comment'}","confidence_score":<0-100>,"summary":"<2 sentences>","top_actions":["<fix 1>","<fix 2>","<fix 3>"],"changelog_entry":"<one line>"}`;

  try {
    // Race Gemini against a 25-second timeout — fall back to code-generated synthesis if it loses
    const geminiResult = await Promise.race([
      callGeminiJSON<SynthesisResult>(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('synthesizer timeout')), 25_000)
      ),
    ]);

    if (forcedVerdict) geminiResult.verdict = forcedVerdict;
    return geminiResult;
  } catch (err) {
    console.warn('[synthesizer] Gemini failed, using fallback:', err instanceof Error ? err.message : err);
    return buildFallbackSynthesis(agentOutputs, allFindings);
  }
}
