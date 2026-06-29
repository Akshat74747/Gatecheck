import { callGeminiJSON } from '@/lib/llm/gemini';
import type { AgentInput, AgentOutput } from './types';

const SYSTEM = `You are a technical writer reviewing code documentation. Analyze ONLY the diff. Return valid JSON only.`;

export async function runDocumentationAgent(input: AgentInput): Promise<AgentOutput> {
  const prompt = `Review this pull request diff for documentation quality in repository "${input.repoName}".

Check for:
- Public functions/classes/types missing JSDoc or TSDoc comments
- API endpoints missing parameter/response documentation
- Complex algorithms without explanatory comments
- Misleading or outdated comments (comments that contradict the code)
- Missing README updates for new features or configuration changes
- Changelog not updated for user-facing changes
- Exported interfaces/types missing property descriptions
- Non-obvious side effects not documented

Severity scale:
- high: public API or critical function completely undocumented
- medium: important functionality lacks documentation
- low: minor documentation gap
- info: documentation improvement suggestion

Diff:
\`\`\`diff
${input.diff}
\`\`\`

Return JSON: { "summary": "2-3 sentence overview", "findings": [{ "severity": "high|medium|low|info", "category": "short label", "message": "clear description", "file": "path/to/file", "line": 42, "suggestion": "how to fix" }] }`;

  return callGeminiJSON<AgentOutput>(prompt, SYSTEM);
}
