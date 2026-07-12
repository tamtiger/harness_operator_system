import { FormatOptions } from './ErrorFormatter';

export class OutputFormatter {
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  format<T>(data: T, type: string, options: FormatOptions): string {
    if (options.json) {
      return JSON.stringify(data, null, 2);
    }

    if (options.quiet) {
      return '';
    }

    const colorGreen = options.noColor ? '' : '\x1b[32m';
    const colorRed = options.noColor ? '' : '\x1b[31m';
    const colorYellow = options.noColor ? '' : '\x1b[33m';
    const colorBlue = options.noColor ? '' : '\x1b[34m';
    const colorReset = options.noColor ? '' : '\x1b[0m';

    let text = '';

    switch (type) {
      case 'version':
        text = String(data);
        break;

      case 'init':
        text = `${colorGreen}✓ Project successfully initialized!${colorReset}\nCreated file .harness/harness.yaml and default AGENTS.md`;
        break;

      case 'doctor': {
        const report = data as any;
        text = `Platform Diagnostics Report\n`;
        text += `Overall Health: ${report.overall === 'healthy' ? colorGreen : colorRed}${report.overall.toUpperCase()}${colorReset}\n\n`;
        text += `Checks:\n`;
        for (const check of report.checks) {
          const statusChar = check.status === 'pass' ? `${colorGreen}✓` : check.status === 'warn' ? `${colorYellow}!` : `${colorRed}✗`;
          text += `  ${statusChar} ${check.name}${colorReset}: ${check.message}\n`;
          if (check.remediation) {
            text += `    ${colorYellow}Remedied by:${colorReset} ${check.remediation}\n`;
          }
        }
        break;
      }

      case 'status': {
        const status = data as any;
        text = `Repository: ${status.repository}\n`;
        text += `Shared Harness: ${status.sharedHarness.installed ? colorGreen + 'Installed' : colorRed + 'Not Installed'}${colorReset} (v${status.sharedHarness.version})\n`;
        text += `Assets Loaded:\n`;
        const assets = status.assets;
        for (const key of Object.keys(assets)) {
          const detail = assets[key];
          text += `  ${key.padEnd(12)}: ${detail.effective} (${detail.shared} shared, ${detail.local} local)\n`;
        }
        text += `Context: ${status.context === 'ready' ? colorGreen : colorYellow}${status.context}${colorReset}`;
        break;
      }

      case 'validate': {
        const val = data as any;
        if (val.valid) {
          text = `${colorGreen}✓ Repository structure is valid.${colorReset}\n`;
          if (val.warnings && val.warnings.length > 0) {
            text += `\nWarnings:\n`;
            val.warnings.forEach((w: string) => {
              text += `  - ${colorYellow}${w}${colorReset}\n`;
            });
          }
        } else {
          text = `${colorRed}✗ Repository validation failed:${colorReset}\n`;
          val.errors.forEach((e: any) => {
            text += `  [ERROR] ${e.code}: ${e.message}\n`;
            if (e.details) {
              text += `    Details: ${JSON.stringify(e.details)}\n`;
            }
          });
          if (val.warnings && val.warnings.length > 0) {
            val.warnings.forEach((w: string) => {
              text += `  [WARNING] ${w}\n`;
            });
          }
        }
        break;
      }

      case 'run': {
        const run = data as any;
        text = `Task: ${run.taskId}\n`;
        text += `Status: ${run.status === 'COMPLETED' ? colorGreen : colorRed}${run.status}${colorReset}\n`;
        text += `Started At: ${run.startedAt}\n`;
        text += `Completed At: ${run.completedAt}\n`;
        text += `Duration: ${run.durationMs}ms\n\n`;
        text += `Step Results:\n`;
        run.results.forEach((step: any, index: number) => {
          const statusChar = step.success ? `${colorGreen}✓` : `${colorRed}✗`;
          text += `  [${index + 1}] ${statusChar} ${step.capabilityId}${colorReset} (${step.durationMs}ms)\n`;
          if (!step.success && step.error) {
            text += `      Error: ${step.error.message}\n`;
          }
        });
        if (run.error) {
          text += `\n${colorRed}Pipeline Execution Failed: ${run.error.message}${colorReset}\n`;
        }
        break;
      }

      case 'install': {
        const res = data as any;
        if (res.success) {
          text = `${colorGreen}✓ Shared Harness installed successfully!${colorReset}\n`;
          text += `Version: ${res.installedVersion}\n`;
          text += `Path: ${res.installedPath}`;
        } else {
          text = `${colorRed}✗ Installation failed: ${res.error?.message || 'Unknown error'}${colorReset}`;
        }
        break;
      }

      case 'update': {
        const res = data as any;
        if (res.success) {
          if (res.fromVersion === res.toVersion) {
            text = `${colorYellow}! Shared Harness is already up to date.${colorReset} (v${res.toVersion})`;
          } else {
            text = `${colorGreen}✓ Shared Harness updated successfully!${colorReset}\n`;
            text += `Upgraded: v${res.fromVersion} -> v${res.toVersion}`;
          }
        } else {
          text = `${colorRed}✗ Update failed: ${res.error?.message || 'Unknown error'}${colorReset}`;
        }
        break;
      }

      case 'sync': {
        const res = data as any;
        if (res.success) {
          text = `${colorGreen}✓ Shared Harness synchronized!${colorReset}\n`;
          text += `Updated ${res.capabilitiesAdded || 0} capabilities and ${res.assetsSynced || 0} assets.`;
        } else {
          text = `${colorRed}✗ Sync failed: ${res.error?.message || 'Unknown error'}${colorReset}`;
        }
        break;
      }

      case 'publish': {
        const res = data as any;
        if (res.success) {
          text = `${colorGreen}✓ Asset published successfully!${colorReset}\n`;
          text += `Proposal ID: ${res.proposalId}`;
        } else {
          text = `${colorRed}✗ Publish failed: ${res.error?.message || 'Unknown error'}${colorReset}`;
        }
        break;
      }

      case 'proposal_list': {
        const list = data as any[];
        text = `Change Proposals Registry:\n\n`;
        if (list.length === 0) {
          text += `No active proposals found.`;
        } else {
          list.forEach(prop => {
            text += `  ID: ${colorBlue}${prop.id}${colorReset}\n`;
            text += `    Title: ${prop.title}\n`;
            text += `    Status: ${prop.status === 'approved' ? colorGreen : prop.status === 'rejected' ? colorRed : colorYellow}${prop.status}${colorReset}\n`;
            text += `    Created At: ${prop.createdAt}\n\n`;
          });
        }
        break;
      }

      case 'proposal_submit':
      case 'proposal_approve': {
        const res = data as any;
        text = `${colorGreen}✓ Proposal successfully processed!${colorReset}\n`;
        text += `ID: ${res.id}\n`;
        text += `Status: ${res.status}`;
        break;
      }

      default:
        text = typeof data === 'object' ? JSON.stringify(data) : String(data);
    }

    return options.noColor ? this.stripAnsi(text) : text;
  }
}
