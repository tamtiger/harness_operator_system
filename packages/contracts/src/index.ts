export interface Task {
  id: string;
  description: string;
  createdAt: Date;
  status: TaskStatus;
}

export type TaskStatus =
  | 'IDLE'
  | 'ANALYZING'
  | 'PLANNING'
  | 'WAIT_APPROVAL'
  | 'GENERATING'
  | 'VERIFYING'
  | 'DONE'
  | 'ERROR';

export interface ContextPack {
  taskId: string;
  relevantFiles: string[];
  outlines: ClassOutline[];
  snippets: CodeSnippet[];
}

export interface ClassOutline {
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  methods: string[];
}

export interface CodeSnippet {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface ExecutionPlan {
  taskId: string;
  steps: ExecutionStep[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface ExecutionStep {
  id: string;
  action: 'analyze' | 'generate_file' | 'run_test' | 'run_command';
  target: string;
  parameters: Record<string, any>;
}
