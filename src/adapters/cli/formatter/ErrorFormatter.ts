import { HarnessError } from '../../../shared/errors/HarnessError';

export interface FormatOptions {
  json: boolean;
  noColor: boolean;
  quiet: boolean;
}

const REMEDY_MAP: Record<string, string> = {
  REPO_008: 'Run harness install --source <uri>',
  REPO_009: 'Re-install the shared harness',
  REPO_002: 'Run harness init to initialize project structure',
  MFT_001: 'Ensure .harness/harness.yaml exists and is accessible'
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
