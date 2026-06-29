import { callGeminiJSON } from '@/lib/llm/gemini';
import type { AgentInput, AgentOutput } from './types';

const SYSTEM = `You are a senior software engineer specializing in bug detection and code correctness.
Analyze ONLY what is in the diff. Return valid JSON only.`;

export async function runBugsAgent(input: AgentInput): Promise<AgentOutput> {
  const prompt = `Review this pull request diff for bugs and correctness issues in repository "${input.repoName}".

Check for:
- Null/undefined dereferences and missing null checks
- Off-by-one errors in loops and array indexing
- Race conditions and concurrency issues
- Unhandled exceptions or promise rejections
- Type coercion bugs and implicit conversions
- Logic errors and incorrect conditional branches
- Edge cases not handled (empty arrays, zero values, boundary conditions)
- Resource leaks (unclosed connections, file handles, event listeners)
- Stale closures in async code
- Missing error propagation

Severity scale:
- critical: causes data corruption or application crash
- high: causes incorrect behavior in common scenarios
- medium: causes incorrect behavior in edge cases
- low: minor issue unlikely to cause problems in practice
- info: potential improvement

Diff:
\`\`\`diff
${input.diff}
\`\`\`

Return JSON: { "summary": "2-3 sentence overview", "findings": [{ "severity": "critical|high|medium|low|info", "category": "short label", "message": "clear description", "file": "path/to/file", "line": 42, "suggestion": "how to fix" }] }`;

  return callGeminiJSON<AgentOutput>(prompt, SYSTEM);
}
