import { ISO8601, CapabilityId, Duration } from './primitives';
import { TaskStatus } from './enums';
import { Workflow } from './assets';
import { CapabilityResult } from './capability';
import { HarnessError } from '../errors/HarnessError';

export interface TaskRequest {
  taskId?: string;
  taskType?: string;
  description: string;
  workingDirectory?: string;
  workflowId?: string;
  parameters?: Record<string, unknown>;
  tags?: string[];
  priority?: 'high' | 'normal' | 'low';
}

export interface TaskState {
  taskId: string;
  status: TaskStatus;
  createdAt: ISO8601;
  startedAt?: ISO8601;
  completedAt?: ISO8601;
  currentStep: number;
  totalSteps: number;
  retryCount: number;
  lastError?: HarnessError;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'none' | 'linear' | 'exponential';
  backoffBaseMs: number;
  retryOn?: string[];
  noRetryOn?: string[];
}

export interface ExecutionStep {
  stepId: string;
  order: number;
  capabilityId: CapabilityId;
  input: unknown;
  dependsOn?: string[];
  retryPolicy?: RetryPolicy;
  timeout?: Duration;
}

export interface ExecutionPlan {
  planId: string;
  taskId: string;
  steps: ExecutionStep[];
  workflow?: Workflow;
}

export interface ExecutionResult {
  taskId: string;
  status: TaskStatus;
  results: CapabilityResult[];
  startedAt: ISO8601;
  completedAt: ISO8601;
  durationMs: number;
  error?: HarnessError;
}

export interface CancelResult {
  taskId: string;
  status: 'CANCELLED';
  cancelledAt: ISO8601;
}
