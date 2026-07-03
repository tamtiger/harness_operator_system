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

// ==========================================
// MILESTONE M2: CAPABILITY REGISTRY CONTRACTS
// ==========================================

export type CapabilityType =
  | 'analyzer'
  | 'builder'
  | 'tester'
  | 'linter'
  | 'verifier'
  | 'template_provider';

export interface CapabilityDescriptor {
  id: string;
  name: string;
  type: CapabilityType;
  version: string;
  timeoutMs?: number;
}

export interface CapabilityContext {
  projectId: string;
  workspaceId: string;
  traceId: string;
}

export interface ICapability {
  readonly descriptor: CapabilityDescriptor;
}

export interface ICapabilityProvider {
  getCapabilities(): CapabilityDescriptor[];
  getCapability<T extends ICapability>(id: string): T | undefined;
}

// Specific Capability interfaces
export interface IBuilder extends ICapability {
  build(context: CapabilityContext): Promise<any>;
}

export interface ITester extends ICapability {
  test(context: CapabilityContext): Promise<any>;
}

export interface ILinter extends ICapability {
  lint(context: CapabilityContext): Promise<any>;
}

// Specific IAnalyzer capability
export interface AnalysisResult {
  technologies: {
    language: string;
    frameworks: string[];
    orms: string[];
    testFrameworks: string[];
  };
  dependencies: {
    name: string;
    version: string;
    type: 'project' | 'package';
  }[];
  symbols: {
    name: string;
    type: 'class' | 'interface' | 'enum';
    filePath: string;
    namespace?: string;
  }[];
}

export interface IAnalyzer extends ICapability {
  analyze(context: CapabilityContext): Promise<any>; // Returns Result<AnalysisResult>
}

// ==========================================
// MILESTONE M4: KNOWLEDGE ENGINE CONTRACTS
// ==========================================

export interface KnowledgeItem {
  id: string;
  type: string;
  source: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface IKnowledgeStore extends IService {
  initializeStore(dbPath: string): void;
  saveItems(items: KnowledgeItem[]): void;
  getItems(type?: string): KnowledgeItem[];
  getItemById(id: string): KnowledgeItem | undefined;
  searchCandidates(query: string): KnowledgeItem[];
  clear(): void;
}

export interface IKnowledgeEngine extends IService {
  indexDocuments(): Promise<void>;
  search(query: string, limit?: number): Promise<KnowledgeItem[]>;
  getById(id: string): Promise<KnowledgeItem | undefined>;
  getByTag(tag: string): Promise<KnowledgeItem[]>;
}

// ==========================================
// MILESTONE M5: CODE INDEX CONTRACTS
// ==========================================

export interface SymbolNode {
  id: string; // FQName e.g. MyNamespace.MyClass.MyMethod
  language: string;
  namespace: string;
  name: string;
  kind: 'class' | 'interface' | 'enum' | 'struct' | 'method' | 'property' | 'field';
  filePath: string;
  range: {
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
  };
  modifiers: string[];
  parentId?: string;
  hash: string;
  documentation?: string;
}

export interface SymbolRelation {
  fromId: string;
  toId: string;
  type: 'inherits' | 'implements' | 'calls' | 'references' | 'contains';
}

export interface ICodeIndex extends IService {
  indexFile(filePath: string, content: string): Promise<void>;
  removeFile(filePath: string): Promise<void>;
  findSymbol(id: string): Promise<SymbolNode | undefined>;
  findReferences(symbolId: string): Promise<SymbolRelation[]>;
  findImplementations(interfaceId: string): Promise<SymbolNode[]>;
  findDerivedTypes(classId: string): Promise<SymbolNode[]>;
  findFileSymbols(filePath: string): Promise<SymbolNode[]>;
}

// ==========================================
// MILESTONE M6: CONTEXT ENGINE CONTRACTS
// ==========================================

export interface ContextSection {
  title: string;
  priority: number; // Lower means higher priority
  tokenEstimate: number;
  source: string;
  content: string;
}

export interface ContextPack {
  task: {
    id: string;
    description: string;
    type: 'bug' | 'feature' | 'refactor' | 'other';
    risk: 'low' | 'medium' | 'high' | 'critical';
  };
  sections: ContextSection[];
  estimatedTokens: number;
  version: string;
}

export interface IContextEngine extends IService {
  buildContext(
    task: {
      id: string;
      description: string;
      type: 'bug' | 'feature' | 'refactor' | 'other';
      risk: 'low' | 'medium' | 'high' | 'critical';
    },
    queryTerms: string[]
  ): Promise<ContextPack>;
  estimateTokens(text: string): number;
  invalidateCache(): void;
}

// ==========================================
// MILESTONE M7: PLANNING ENGINE CONTRACTS
// ==========================================

export interface ExecutionStep {
  id: string;
  action: 'analyze' | 'generate_file' | 'run_test' | 'run_command';
  target: string;
  parameters: Record<string, any>;
}

export interface ExecutionPlan {
  taskId: string;
  summary: string;
  steps: ExecutionStep[];
  files: string[];
  rollback: string;
  testStrategy: string;
  version: number;
  status: 'pending' | 'approved' | 'rejected' | 'awaiting_approval';
}

export interface PlanValidationResult {
  status: 'APPROVED' | 'REJECTED' | 'AWAITING_APPROVAL';
  reason: string;
  riskScore: number;
  diagnostics: string[];
  warnings: string[];
}

export interface IPlanningEngine extends IService {
  validatePlan(plan: ExecutionPlan): Promise<PlanValidationResult>;
  approvePlan(taskId: string, version: number): Promise<void>;
  rejectPlan(taskId: string, version: number, reason: string): Promise<void>;
  getPlan(taskId: string, version?: number): Promise<ExecutionPlan | undefined>;
  getPlanHistory(taskId: string): Promise<ExecutionPlan[]>;
}

