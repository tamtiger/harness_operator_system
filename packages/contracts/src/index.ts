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

// ==========================================
// MILESTONE M1: CORE INFRASTRUCTURE CONTRACTS
// ==========================================

export interface ILifecycle {
  initialize?(): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  dispose?(): Promise<void>;
}

export interface IService extends ILifecycle {
  readonly serviceName: string;
}

export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  generate(prefix?: string): string;
}

export interface IFileSystem {
  exists(path: string): Promise<boolean>;
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
  remove(path: string): Promise<void>;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ILogger extends IService {
  log(level: LogLevel, message: string, meta?: Record<string, any>): void;
  trace(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  fatal(message: string, error?: Error, meta?: Record<string, any>): void;
}

export interface IConfiguration extends IService {
  get<T>(key: string, defaultValue?: T): T;
  all(): Record<string, any>;
}

export interface EventEnvelope<T = any> {
  event: string;
  version: string;
  timestamp: string;
  taskId?: string;
  payload: T;
}

export interface IEventBus extends IService {
  publish<T>(event: string, payload: T, taskId?: string): void;
  subscribe<T>(event: string, handler: (envelope: EventEnvelope<T>) => void): void;
  unsubscribe<T>(event: string, handler: (envelope: EventEnvelope<T>) => void): void;
}

export interface IWorkspaceManager extends IService {
  getWorkspaceRoot(): string;
  getProjectRoot(): string;
  getCacheDir(): string;
  getSessionDir(): string;
  getDatabaseDir(): string;
  ensureWorkspaceCreated(): Promise<void>;
}

export interface IHost {
  start(): Promise<void>;
  stop(): Promise<void>;
  getService<T>(name: string): T;
}
