import { AssetType, AssetScope, AssetPriority, HookEvent, Permission } from './enums';
import { SemVer, RelativePath, ISO8601, AssetId, CapabilityId, JSONSchema, Duration } from './primitives';

export interface AssetMetadata {
  id: string;
  type: AssetType;
  version: SemVer;
  name: string;
  description?: string;
  scope: AssetScope;
  source: RelativePath;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  tags?: string[];
  deprecated?: boolean;
  supersededBy?: AssetId;
}

export interface Asset {
  metadata: AssetMetadata;
  content: string;
}

export interface Rule extends Asset {
  priority: AssetPriority;
  scopePaths?: string[];
}

export interface Prompt extends Asset {
  modelHints?: string[];
  tokenEstimate?: number;
}

export interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  default?: string;
}

export interface Template extends Asset {
  artifactType: string;
  variables?: TemplateVariable[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  capabilityId: CapabilityId;
  input: object;
  dependsOn?: string[];
}

export interface Workflow extends Asset {
  steps: WorkflowStep[];
  triggers?: string[];
}

export interface Knowledge extends Asset {
  domain?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface Hook extends Asset {
  triggerEvent: HookEvent;
  order?: number;
  capabilityId: CapabilityId;
}

export interface CapabilityErrorCode {
  code: string;
  description: string;
  retryable: boolean;
}

export interface CapabilityDefinition extends Asset {
  capabilityId: CapabilityId;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  errorCodes?: CapabilityErrorCode[];
  permissions?: Permission[];
  timeout?: Duration;
  idempotent?: boolean;
}

export interface AssetCollection {
  rules: Rule[];
  prompts: Prompt[];
  templates: Template[];
  workflows: Workflow[];
  knowledge: Knowledge[];
  hooks: Hook[];
  capabilities: CapabilityDefinition[];
}

export type EffectiveAssetCollection = Readonly<AssetCollection>;
