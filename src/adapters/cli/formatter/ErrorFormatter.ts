import { HarnessError } from '../../../shared/errors/HarnessError';
import type { FormatOptions } from './OutputFormatter';

const REMEDY_MAP: Record<string, string> = {
  REPO_001: 'Ensure the working directory is inside a Harness repository',
  REPO_002: 'Run harness init to initialize project structure',
  REPO_003: 'Check YAML syntax in .harness/harness.yaml',
  REPO_004: 'Fix the manifest schema; refer to the specification for required fields',
  REPO_005: 'Fix the asset file YAML/markdown frontmatter',
  REPO_006: 'Remove duplicate asset IDs in the collection',
  REPO_007: 'Fix asset metadata format',
  REPO_008: 'Run harness install --source <uri>',
  REPO_009: 'Re-install the shared harness',
  REPO_010: 'Check file write permissions for the path',
  REPO_011: 'Create AGENTS.md at the repository root',
  REPO_012: 'Remove circular references in asset extends',
  REPO_013: 'Reduce asset file size below 1MB',
  REPO_014: 'Fix path traversal in asset definitions',
  REPO_015: 'Retry the write operation',
  MFT_001: 'Ensure .harness/harness.yaml exists and is accessible',
  MFT_002: 'Fix YAML syntax errors in the manifest',
  MFT_003: 'Add the missing required field to the manifest',
  MFT_004: 'Update manifest version to a supported version',
  MFT_005: 'Update specification version to match the platform',
  MFT_006: 'Ensure the referenced path exists',
  MFT_007: 'Ensure the entry point file exists',
  MFT_008: 'Remove duplicate source IDs',
  MFT_009: 'Use a valid source type: git, local_path, or registry',
  MFT_010: 'Use a valid artifact type',
  MFT_011: 'Declare at least one artifact in the manifest',
  MFT_012: 'Move custom fields under the vendor namespace',
  MFT_013: 'Remove circular dependencies between assets',
  MFT_014: 'Resolve dependency version conflicts',
  MFT_015: 'Reduce dependency depth to 3 levels or fewer',
  MFT_016: 'Fix capability ID format: lowercase, dot-separated namespaces',
  CTX_001: 'Check context builder configuration',
  CTX_002: 'Fix filter configuration values',
  CTX_003: 'Increase token budget or reduce asset size',
  CTX_004: 'Ensure distribution sum equals 1.0',
  CTX_005: 'Retry the cache operation',
  EXEC_001: 'Ensure the workflow exists in the repository',
  EXEC_002: 'Check the execution plan for errors',
  EXEC_003: 'Check the capability implementation for errors',
  EXEC_004: 'Increase step timeout or optimize capability',
  EXEC_005: 'Restart the cancelled task',
  EXEC_006: 'Fix the verification rules',
  EXEC_007: 'Check capability stability or increase retry limits',
  EXEC_008: 'Rebuild the runtime context',
  EXEC_009: 'Fix step dependency references',
  EXEC_010: 'Check task state transitions',
  CAP_001: 'Register the capability or check the capability ID',
  CAP_002: 'Fix input parameters per the capability schema',
  CAP_003: 'Check the capability output format',
  CAP_004: 'Grant the required permission to the agent',
  CAP_005: 'Increase capability timeout or optimize execution',
  CAP_006: 'Retry the capability execution',
  CAP_007: 'Ensure the capability is available',
  CAP_008: 'Check capability registration parameters',
  GOV_001: 'Verify the proposal ID is correct',
  GOV_002: 'Check proposal state transitions',
  GOV_003: 'Wait for the current reviewer to finish or the lock to expire',
  GOV_004: 'Add evidence to the proposal before submission',
  GOV_005: 'Check promotion configuration and paths',
  GOV_006: 'Refresh and retry the operation',
  GOV_007: 'Use an authorized reviewer account',
  GOV_008: 'Reduce proposal content size below 500KB',
  GOV_009: 'Use a valid evidence type',
  GOV_010: 'Check disk space and write permissions for audit log',
  PLT_001: 'Check network connectivity to the source URI',
  PLT_002: 'Re-install the shared harness to fix checksums',
  PLT_003: 'Ensure write permissions for the installation directory',
  PLT_004: 'Fix the task request parameters',
  PLT_005: 'Check the specific domain for errors',
  PLT_006: 'Check publish configuration and network access',
  PLT_007: 'Check network connectivity to the update source',
  PLT_008: 'Retry the update or check backup location permissions'
};

export class ErrorFormatter {
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  formatError(error: any, options: FormatOptions): string {
    const isHarness = error instanceof HarnessError;
    const code = isHarness ? error.code : 'UNKNOWN';
    const domain = isHarness ? error.domain : 'SYSTEM';
    const message = error.message || 'An unexpected error occurred';
    const details = isHarness ? error.details : (error.stack || error);
    const remedy = isHarness ? REMEDY_MAP[error.code] : undefined;

    if (options.json) {
      return JSON.stringify({
        error: {
          code,
          domain,
          message,
          retryable: isHarness ? error.retryable : false,
          remediation: remedy,
          details
        }
      }, null, 2);
    }

    const colorRed = options.noColor ? '' : '\x1b[31m';
    const colorYellow = options.noColor ? '' : '\x1b[33m';
    const colorReset = options.noColor ? '' : '\x1b[0m';

    let text = `${colorRed}[ERROR] ${code}: ${message}${colorReset}\n`;
    if (remedy) {
      text += `  ${colorYellow}Remedy:${colorReset} ${remedy}\n`;
    }
    if (details) {
      const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
      text += `  Details: ${detailsStr}\n`;
    }

    return options.noColor ? this.stripAnsi(text) : text;
  }
}
