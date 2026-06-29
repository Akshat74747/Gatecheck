import { callGeminiJSON } from '@/lib/llm/gemini';
import type { AgentInput, AgentOutput } from './types';

const SYSTEM = `You are a senior application security engineer performing a focused security code review.
Analyze ONLY what is in the diff — do not speculate about code not shown.
Return valid JSON only.`;

export async function runSecurityAgent(input: AgentInput): Promise<AgentOutput> {
  const prompt = `Review this pull request diff for security vulnerabilities in repository "${input.repoName}".

Check for:
- OWASP Top 10: injection (SQL, NoSQL, command, LDAP), XSS, IDOR, path traversal, SSRF
- Hardcoded secrets, API keys, passwords, tokens
- Broken authentication or authorization checks
- Missing input validation or sanitization
- Weak or broken cryptography
- Security misconfigurations (CORS, headers, cookies)
- Race conditions or TOCTOU issues

Severity scale:
- critical: directly exploitable, RCE or data breach
- high: significant security risk requiring immediate attention
- medium: security concern that should be addressed
- low: minor security improvement
- info: best practice suggestion

Diff:
\`\`\`diff
${input.diff}
\`\`\`

Return JSON: { "summary": "2-3 sentence overview", "findings": [{ "severity": "critical|high|medium|low|info", "category": "short label", "message": "clear description", "file": "path/to/file", "line": 42, "suggestion": "how to fix" }] }
Return empty findings array if no issues found.`;

  return callGeminiJSON<AgentOutput>(prompt, SYSTEM);
}
