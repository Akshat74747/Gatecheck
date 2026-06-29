import { callGeminiJSON } from '@/lib/llm/gemini';
import type { AgentInput, AgentOutput } from './types';

const SYSTEM = `You are a senior engineer reviewing code against language and framework best practices. Analyze ONLY the diff. Return valid JSON only.`;

export async function runBestPracticesAgent(input: AgentInput): Promise<AgentOutput> {
  const prompt = `Review this pull request diff for best practices in repository "${input.repoName}".

Check for:
- Language-specific anti-patterns (JS/TS: var instead of const/let, == instead of ===, callback hell)
- Framework convention violations (Next.js: incorrect use of client/server components, missing Suspense)
- Missing error handling (bare catch blocks, swallowed errors, no user feedback on failures)
- Inconsistent patterns vs the rest of the visible codebase
- Missing or incorrect TypeScript types (any, non-null assertions without justification)
- Test coverage gaps (new logic paths without tests)
- Hardcoded configuration that should be environment variables
- Missing input validation on API boundaries
- Improper dependency management (missing peer deps, unused imports)

Severity scale:
- high: violates important conventions or causes silent failures
- medium: deviates from best practices in a meaningful way
- low: minor convention deviation
- info: stylistic suggestion aligned with best practices

Diff:
\`\`\`diff
${input.diff}
\`\`\`

Return JSON: { "summary": "2-3 sentence overview", "findings": [{ "severity": "high|medium|low|info", "category": "short label", "message": "clear description", "file": "path/to/file", "line": 42, "suggestion": "how to fix" }] }`;

  return callGeminiJSON<AgentOutput>(prompt, SYSTEM);
}
