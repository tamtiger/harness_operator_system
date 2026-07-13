import { ISO8601, SemVer, AssetId, ProposalId, RelativePath } from './primitives';
import { ProposalStatus, ProposalType } from './enums';
import { HarnessError } from '../errors/HarnessError';
import { Evidence } from './governance';

export interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  remediation?: string;
}

export interface DiagnosticReport {
  timestamp: ISO8601;
  overall: 'healthy' | 'warning' | 'critical';
  checks: DiagnosticCheck[];
}

export interface ValidationResult {
  valid: boolean;
  errors: HarnessError[];
  warnings: string[];
}

export interface InstalledMetadata {
  version: SemVer;
  source: string;
  installedAt: ISO8601;
  checksum: string;
  specificationVersion: SemVer;
}

export interface InstallConfig {
  source: string;
  version?: string;
  targetPath?: string;
  verifyChecksum?: boolean;
}

export interface InstallResult {
  success: boolean;
  installedVersion: SemVer;
  path: string;
  error?: HarnessError;
}

export interface UpdateConfig {
  targetVersion?: SemVer;
  force?: boolean;
}

export interface UpdateResult {
  success: boolean;
  fromVersion: SemVer;
  toVersion: SemVer;
  error?: HarnessError;
}

export interface SyncConfig {
  targetBranch?: string;
  dryRun?: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedAssets: number;
  error?: HarnessError;
}

export interface PublishRequest {
  assetIds: AssetId[];
  commitMessage: string;
}

export interface PublishResult {
  success: boolean;
  proposalId?: ProposalId;
  publishedUrl?: string;
  error?: HarnessError;
}

export interface AssetCountEntry {
  shared: number;
  local: number;
  effective: number;
}

export interface PlatformStatus {
  status: 'active' | 'offline' | 'degraded';
  version: SemVer;
  uptimeMs: number;
  repository?: { path: string; valid: boolean };
  sharedHarness?: { installed: boolean; version: string };
  assets?: {
    rules: AssetCountEntry;
    prompts: AssetCountEntry;
    templates: AssetCountEntry;
    workflows: AssetCountEntry;
    knowledge: AssetCountEntry;
    hooks: AssetCountEntry;
    capabilities: AssetCountEntry;
    skills?: AssetCountEntry;
  };
}

export interface ProposalRequest {
  title: string;
  description: string;
  type: ProposalType;
  rationale: string;
  evidence: Evidence[];
  proposedContent: string;
  targetAsset?: AssetId;
}

export interface ProposalFilter {
  status?: ProposalStatus;
  type?: ProposalType;
  author?: string;
}

export interface PromotionResult {
  proposalId: ProposalId;
  promotedAssetPath: RelativePath;
  promotedAt: ISO8601;
}
