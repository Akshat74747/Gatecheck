import { callGeminiJSON } from '@/lib/llm/gemini';
import type { AgentInput, AgentOutput } from './types';

const SYSTEM = `You are a senior engineer focused on code maintainability and readability. Analyze ONLY the diff. Return valid JSON only.`;

export async function runReadabilityAgent(input: AgentInput): Promise<AgentOutput> {
  const prompt = `Review this pull request diff for readability and maintainability in repository "${input.repoName}".

Check for:
- Functions longer than 50 lines that should be split
- Poor variable/function naming that obscures intent
- Dead code (unreachable branches, unused variables)
- Deep nesting (more than 3 levels) that could be flattened
- Magic numbers/strings that should be named constants
- Code duplication that should be extracted to a shared function
- Unclear or misleading comments
- Missing type annotations where types would clarify intent
- Complex boolean expressions that need extraction or simplification

Severity scale:
- high: severely harms maintainability or makes code nearly unreadable
- medium: noticeably reduces readability
- low: minor readability improvement
- info: style suggestion

Diff:
\`\`\`diff
${input.diff}
\`\`\`

Return JSON: { "summary": "2-3 sentence overview", "findings": [{ "severity": "high|medium|low|info", "category": "short label", "message": "clear description", "file": "path/to/file", "line": 42, "suggestion": "how to fix" }] }`;

  return callGeminiJSON<AgentOutput>(prompt, SYSTEM);
}
