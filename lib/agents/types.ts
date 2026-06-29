export interface AgentFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface AgentOutput {
  summary: string;
  findings: AgentFinding[];
}

export interface AgentInput {
  diff: string;
  repoName: string;
}
