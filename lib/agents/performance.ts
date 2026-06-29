import { callGeminiJSON } from '@/lib/llm/gemini';
import type { AgentInput, AgentOutput } from './types';

const SYSTEM = `You are a senior performance engineer. Analyze ONLY what is in the diff. Return valid JSON only.`;

export async function runPerformanceAgent(input: AgentInput): Promise<AgentOutput> {
  const prompt = `Review this pull request diff for performance issues in repository "${input.repoName}".

Check for:
- N+1 database query patterns
- Inefficient algorithms (O(n²) or worse where O(n log n) is possible)
- Missing pagination on list endpoints
- Unnecessary re-renders in React (missing useMemo/useCallback/memo)
- Synchronous/blocking operations in async contexts
- Memory leaks (growing arrays, event listeners not removed)
- Missing database indexes for new query patterns
- Large bundle imports where tree-shaking would help
- Repeated expensive computations that could be cached
- Unnecessary data fetching (over-fetching, fetching in loops)

Severity scale:
- critical: causes measurable latency regression or OOM in production
- high: significant performance impact under normal load
- medium: performance impact under higher load
- low: minor optimization opportunity
- info: stylistic performance suggestion

Diff:
\`\`\`diff
${input.diff}
\`\`\`

Return JSON: { "summary": "2-3 sentence overview", "findings": [{ "severity": "critical|high|medium|low|info", "category": "short label", "message": "clear description", "file": "path/to/file", "line": 42, "suggestion": "how to fix" }] }`;

  return callGeminiJSON<AgentOutput>(prompt, SYSTEM);
}
