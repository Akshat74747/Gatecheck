import { callGeminiJSON } from '@/lib/llm/gemini';
import type { AgentOutput } from './types';

export interface SynthesisResult {
  verdict: 'approve' | 'request_changes' | 'comment';
  confidence_score: number;
  summary: string;
  top_actions: string[];
  changelog_entry: string;
}

const SYSTEM = `You are a lead engineer synthesizing code review findings from multiple specialist agents into a final verdict. Be decisive and concise. Return valid JSON only.`;

export async function runSynthesizer(
  agentOutputs: Record<string, AgentOutput>,
  repoName: string,
): Promise<SynthesisResult> {
  const allFindings = Object.entries(agentOutputs).flatMap(([agent, out]) =>
    out.findings.map(f => ({ ...f, agent }))
  );

  const criticalOrHigh = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high');
  const forcedVerdict = criticalOrHigh.length > 0 ? 'request_changes' : null;

  // Cap findings sent to synthesizer: top 10 critical/high, top 10 medium, top 5 low
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
  const cappedFindings = [
    ...allFindings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 10),
    ...allFindings.filter(f => f.severity === 'medium').slice(0, 10),
    ...allFindings.filter(f => f.severity === 'low' || f.severity === 'info').slice(0, 5),
  ];
  void severityOrder;

  const findingsSummary = cappedFindings.map(f =>
    `[${f.agent.toUpperCase()}] ${f.severity.toUpperCase()}: ${f.message}${f.file ? ` (${f.file}${f.line ? `:${f.line}` : ''})` : ''}`
  ).join('\n');

  const agentSummaries = Object.entries(agentOutputs).map(([agent, out]) =>
    `${agent}: ${out.summary}`
  ).join('\n');

  const prompt = `You are synthesizing a code review for repository "${repoName}".

Agent summaries:
${agentSummaries}

Top findings (${cappedFindings.length} shown of ${allFindings.length} total):
${findingsSummary || 'No findings from any agent.'}

${forcedVerdict ? `IMPORTANT: There are ${criticalOrHigh.length} critical/high severity findings — verdict MUST be "request_changes".` : ''}

Produce a final review synthesis. Return JSON:
{
  "verdict": "${forcedVerdict ?? 'approve|request_changes|comment'}",
  "confidence_score": <integer 0-100>,
  "summary": "<2-3 sentences summarizing the overall review>",
  "top_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "changelog_entry": "<one-line Keep-a-Changelog entry, e.g. 'Fixed authentication bypass in login endpoint'>"
}

verdict rules: approve = no significant issues; request_changes = has critical/high issues or must-fix problems; comment = has medium/low issues worth noting but not blocking.
confidence_score: 90-100 = very confident in findings; 70-89 = moderately confident; below 70 = limited context.`;

  const result = await callGeminiJSON<SynthesisResult>(prompt, SYSTEM);

  // Enforce forced verdict
  if (forcedVerdict && result.verdict !== 'request_changes') {
    result.verdict = 'request_changes';
  }

  return result;
}
