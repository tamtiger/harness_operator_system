import { HarnessError } from './HarnessError';
import { ErrorDomain } from '../types/enums';

type ErrorDef = { message: string; retryable: boolean };

function interpolate(template: string, details: unknown): string {
  if (!details || typeof details !== 'object') return template;
  const obj = details as Record<string, unknown>;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = obj[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

const REPO_ERRORS = {
  REPO_001: { message: 'Repository root not found', retryable: false },
  REPO_002: { message: 'harness.yaml not found', retryable: false },
  REPO_003: { message: 'Invalid YAML syntax in harness.yaml', retryable: false },
  REPO_004: { message: 'Manifest schema validation failed: {field}', retryable: false },
  REPO_005: { message: 'Asset file parse error: {path}', retryable: false },
  REPO_006: { message: 'Duplicate asset ID: {id}', retryable: false },
  REPO_007: { message: 'Asset metadata invalid: {path}', retryable: false },
  REPO_008: { message: 'Shared Harness not installed', retryable: false },
  REPO_009: { message: 'Shared Harness integrity check failed', retryable: false },
  REPO_010: { message: 'File write permission denied: {path}', retryable: false },
  REPO_011: { message: 'AGENTS.md not found at repository root', retryable: false },
  REPO_012: { message: 'Circular asset reference detected', retryable: false },
  REPO_013: { message: 'Asset file exceeds size limit: {path} ({size})', retryable: false },
  REPO_014: { message: 'Asset path traversal detected: {path}', retryable: false },
  REPO_015: { message: 'Atomic write failed: {path}', retryable: true }
} satisfies Record<string, ErrorDef>;

const MFT_ERRORS = {
  MFT_001: { message: 'Manifest not found: .harness/harness.yaml', retryable: false },
  MFT_002: { message: 'Invalid YAML: {error} at line {line} col {col}', retryable: false },
  MFT_003: { message: 'Missing required field: {field}', retryable: false },
  MFT_004: { message: 'Unsupported manifest version: {version}', retryable: false },
  MFT_005: { message: 'Specification version mismatch: got {got}, need {need}', retryable: false },
  MFT_006: { message: 'Path not found: {path}', retryable: false },
  MFT_007: { message: 'Entry point missing: {file}', retryable: false },
  MFT_008: { message: 'Duplicate source ID: {id}', retryable: false },
  MFT_009: { message: 'Invalid source type: {type}', retryable: false },
  MFT_010: { message: 'Invalid artifact type: {type}', retryable: false },
  MFT_011: { message: 'No artifacts declared', retryable: false },
  MFT_012: { message: 'Custom field outside vendor namespace: {field}', retryable: false },
  MFT_013: { message: 'Circular dependency detected: {cycle}', retryable: false },
  MFT_014: { message: 'Dependency conflict: {package} requires {v1} and {v2}', retryable: false },
  MFT_015: { message: 'Dependency depth exceeded: max 3 levels', retryable: false },
  MFT_016: { message: 'Invalid capability ID format: {id}', retryable: false }
} satisfies Record<string, ErrorDef>;

const CTX_ERRORS = {
  CTX_001: { message: 'Context build failed: {reason}', retryable: false },
  CTX_002: { message: 'Filter configuration invalid: {field}', retryable: false },
  CTX_003: { message: 'Budget exceeded hard limit: {tokens} > {limit}', retryable: false },
  CTX_004: { message: 'Budget configuration invalid: distribution sum != 1.0', retryable: false },
  CTX_005: { message: 'Cache invalidation failed', retryable: true }
} satisfies Record<string, ErrorDef>;

const EXEC_ERRORS = {
  EXEC_001: { message: 'Workflow not found: {id}', retryable: false },
  EXEC_002: { message: 'Invalid execution plan: {reason}', retryable: false },
  EXEC_003: { message: 'Capability invocation failed: {capId} - {reason}', retryable: false }, // Depends can be overwritten in factory
  EXEC_004: { message: 'Step timeout: {stepId} exceeded {timeout}ms', retryable: true },
  EXEC_005: { message: 'Task cancelled by user', retryable: false },
  EXEC_006: { message: 'Verification failed: {rule}', retryable: false },
  EXEC_007: { message: 'Max retries exceeded: {capId} after {attempts} attempts', retryable: false },
  EXEC_008: { message: 'Runtime context expired or invalid', retryable: false },
  EXEC_009: { message: 'Step dependency not resolved: {stepId} depends on {dep}', retryable: false },
  EXEC_010: { message: 'Invalid state transition: {from} -> {to}', retryable: false }
} satisfies Record<string, ErrorDef>;

const CAP_ERRORS = {
  CAP_001: { message: 'Capability not found: {id}', retryable: false },
  CAP_002: { message: 'Input validation failed: {field} - {reason}', retryable: false },
  CAP_003: { message: 'Output validation failed: {reason}', retryable: false },
  CAP_004: { message: 'Permission denied: {capability} requires {permission}', retryable: false },
  CAP_005: { message: 'Capability execution timeout: {id} after {ms}ms', retryable: true },
  CAP_006: { message: 'Transient error: {id} - {reason}', retryable: true },
  CAP_007: { message: 'Capability unavailable: {id}', retryable: true },
  CAP_008: { message: 'Registration failed: {id} - {reason}', retryable: false }
} satisfies Record<string, ErrorDef>;

const GOV_ERRORS = {
  GOV_001: { message: 'Proposal not found: {id}', retryable: false },
  GOV_002: { message: 'Invalid state transition: {from} -> {to}', retryable: false },
  GOV_003: { message: 'Proposal locked by reviewer: {reviewer}', retryable: false },
  GOV_004: { message: 'Proposal has no evidence', retryable: false },
  GOV_005: { message: 'Promotion failed: {reason}', retryable: false },
  GOV_006: { message: 'Concurrent modification: stale version', retryable: true },
  GOV_007: { message: 'Reviewer not authorized', retryable: false },
  GOV_008: { message: 'Proposal content exceeds limit: {size} > 500KB', retryable: false },
  GOV_009: { message: 'Evidence type invalid: {type}', retryable: false },
  GOV_010: { message: 'Audit log write failed', retryable: true }
} satisfies Record<string, ErrorDef>;

const PLT_ERRORS = {
  PLT_001: { message: 'Shared Harness source unreachable: {uri}', retryable: true },
  PLT_002: { message: 'Checksum verification failed: {file}', retryable: false },
  PLT_003: { message: 'Installation directory not writable: {path}', retryable: false },
  PLT_004: { message: 'Task request invalid: {reason}', retryable: false },
  PLT_005: { message: 'Orchestration failed in domain {domain}: {code}', retryable: false },
  PLT_006: { message: 'Publish failed: {reason}', retryable: false },
  PLT_007: { message: 'Update source unreachable: {uri}', retryable: true },
  PLT_008: { message: 'Backup creation failed during update', retryable: false }
} satisfies Record<string, ErrorDef>;

export function repoError(code: keyof typeof REPO_ERRORS, details?: unknown): HarnessError {
  const e = REPO_ERRORS[code];
  return new HarnessError(code, ErrorDomain.REPOSITORY, interpolate(e.message, details), e.retryable, details);
}

export function mftError(code: keyof typeof MFT_ERRORS, details?: unknown): HarnessError {
  const e = MFT_ERRORS[code];
  return new HarnessError(code, ErrorDomain.MANIFEST, interpolate(e.message, details), e.retryable, details);
}

export function ctxError(code: keyof typeof CTX_ERRORS, details?: unknown): HarnessError {
  const e = CTX_ERRORS[code];
  return new HarnessError(code, ErrorDomain.CONTEXT, interpolate(e.message, details), e.retryable, details);
}

export function execError(code: keyof typeof EXEC_ERRORS, details?: unknown, retryableOverride?: boolean): HarnessError {
  const e = EXEC_ERRORS[code];
  return new HarnessError(code, ErrorDomain.EXECUTION, interpolate(e.message, details), retryableOverride !== undefined ? retryableOverride : e.retryable, details);
}

export function capError(code: keyof typeof CAP_ERRORS, details?: unknown): HarnessError {
  const e = CAP_ERRORS[code];
  return new HarnessError(code, ErrorDomain.CAPABILITY, interpolate(e.message, details), e.retryable, details);
}

export function govError(code: keyof typeof GOV_ERRORS, details?: unknown): HarnessError {
  const e = GOV_ERRORS[code];
  return new HarnessError(code, ErrorDomain.GOVERNANCE, interpolate(e.message, details), e.retryable, details);
}

export function pltError(code: keyof typeof PLT_ERRORS, details?: unknown): HarnessError {
  const e = PLT_ERRORS[code];
  return new HarnessError(code, ErrorDomain.PLATFORM, interpolate(e.message, details), e.retryable, details);
}
