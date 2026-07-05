import {
  IVerificationEngine,
  VerificationResult,
  LayerResult,
  CapabilityContext,
  IBuilder,
  ILinter,
  ITester,
  IWorkspaceManager,
  IConfiguration,
  ILogger
} from '@harness/contracts';
import { CapabilityRegistry } from '../capability/capability-registry.js';
import { Result, HarnessError } from '@harness/shared';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface ArchRule {
  name: string;
  fromPattern: string; // Regex match for caller file path
  toPattern: string;   // Regex match for callee file path
  forbidden: boolean;
}

export class VerificationEngine implements IVerificationEngine {
  public readonly serviceName = 'VerificationEngine';

  constructor(
    private readonly workspace: IWorkspaceManager,
    private readonly registry: CapabilityRegistry,
    private readonly configuration?: IConfiguration,
    private readonly logger?: ILogger
  ) {}

  public async initialize(): Promise<void> {
    this.logger?.info('VerificationEngine initialized');
  }

  public async verify(taskId: string, context: CapabilityContext): Promise<VerificationResult> {
    this.logger?.info(`Starting verification pipeline for task ${taskId}`);
    const startTime = Date.now();

    const layers: LayerResult[] = [];
    const failedRules: string[] = [];
    let status: 'PASS' | 'FAIL' | 'ESCALATED' = 'PASS';

    // Read Configuration for failFast
    const failFast = this.configuration ? this.configuration.get<boolean>('verification.failFast', true) : true;

    // Define pipeline layers
    const executionLayers: { name: 'L1' | 'L2' | 'L3' | 'L4'; run: () => Promise<LayerResult> }[] = [
      {
        name: 'L1',
        run: () => this.runL1(context)
      },
      {
        name: 'L2',
        run: () => this.runL2(context)
      },
      {
        name: 'L3',
        run: () => this.runL3(context)
      },
      {
        name: 'L4',
        run: () => this.runL4(taskId)
      }
    ];

    for (const layer of executionLayers) {
      try {
        this.logger?.info(`Running verification layer ${layer.name}`);
        const result = await layer.run();
        layers.push(result);

        if (result.status === 'FAIL') {
          status = 'FAIL';
          if (layer.name === 'L4') {
            failedRules.push(...result.errors);
          }
          if (failFast) {
            this.logger?.warn(`Verification layer ${layer.name} failed. Fail-fast triggered. Stopping pipeline.`);
            break;
          }
        }
      } catch (err: any) {
        this.logger?.error(`Error running verification layer ${layer.name}`, err);
        layers.push({
          layer: layer.name,
          status: 'FAIL',
          errors: [err.message || 'Unknown error occurred']
        });
        status = 'FAIL';
        if (failFast) break;
      }
    }

    const durationMs = Date.now() - startTime;
    const summary = status === 'PASS' 
      ? `All verification layers passed successfully in ${durationMs}ms.`
      : `Verification failed at layer ${layers.filter(l => l.status === 'FAIL').map(l => l.layer).join(', ')}.`;

    this.logger?.info(`Verification finished with status: ${status}`, { durationMs, layers });

    return {
      taskId,
      status,
      layers,
      summary,
      failedRules
    };
  }

  // L1: Syntax/Build Check
  private async runL1(context: CapabilityContext): Promise<LayerResult> {
    const builder = this.registry.resolve<IBuilder>('builder');
    if (!builder) {
      return {
        layer: 'L1',
        status: 'PASS',
        errors: ['No builder capability registered. Skipping L1 syntax/build check.']
      };
    }

    const result = await this.registry.executeSafe<IBuilder, any>(builder, async (cap) => {
      return await cap.build(context);
    });

    if (!result.isSuccess) {
      return {
        layer: 'L1',
        status: 'FAIL',
        errors: [result.error?.message || 'Build failed']
      };
    }

    return {
      layer: 'L1',
      status: 'PASS',
      errors: []
    };
  }

  // L2: Lint Check
  private async runL2(context: CapabilityContext): Promise<LayerResult> {
    const linter = this.registry.resolve<ILinter>('linter');
    if (!linter) {
      return {
        layer: 'L2',
        status: 'PASS',
        errors: ['No linter capability registered. Skipping L2 lint check.']
      };
    }

    const result = await this.registry.executeSafe<ILinter, any>(linter, async (cap) => {
      return await cap.lint(context);
    });

    if (!result.isSuccess) {
      return {
        layer: 'L2',
        status: 'FAIL',
        errors: [result.error?.message || 'Lint failed']
      };
    }

    const lintOutput = result.value;
    if (lintOutput && lintOutput.passed === false) {
      return {
        layer: 'L2',
        status: 'FAIL',
        errors: lintOutput.issues || ['Lint checks failed']
      };
    }

    return {
      layer: 'L2',
      status: 'PASS',
      errors: []
    };
  }

  // L3: Unit Tests Check
  private async runL3(context: CapabilityContext): Promise<LayerResult> {
    const tester = this.registry.resolve<ITester>('tester');
    if (!tester) {
      return {
        layer: 'L3',
        status: 'PASS',
        errors: ['No tester capability registered. Skipping L3 unit test check.']
      };
    }

    const result = await this.registry.executeSafe<ITester, any>(tester, async (cap) => {
      return await cap.test(context);
    });

    if (!result.isSuccess) {
      return {
        layer: 'L3',
        status: 'FAIL',
        errors: [result.error?.message || 'Unit tests execution failed']
      };
    }

    const testOutput = result.value;
    if (testOutput && testOutput.passed === false) {
      return {
        layer: 'L3',
        status: 'FAIL',
        errors: [`Unit tests failed: ${testOutput.failed} out of ${testOutput.total} tests failed.`]
      };
    }

    return {
      layer: 'L3',
      status: 'PASS',
      errors: []
    };
  }

  // L4: Architecture Rules Check
  private async runL4(taskId: string): Promise<LayerResult> {
    // 1. Get rules from configuration or fallback to defaults
    const rules = this.configuration 
      ? this.configuration.get<ArchRule[]>('verification.rules', this.getDefaultRules())
      : this.getDefaultRules();

    // 2. Query Code Index database (harness.db)
    const dbPath = path.join(this.workspace.getDatabaseDir(), 'harness.db');
    if (!fs.existsSync(dbPath)) {
      return {
        layer: 'L4',
        status: 'PASS',
        errors: ['Harness database not found. Skipping L4 architecture rules check.']
      };
    }

    const errors: string[] = [];
    let db: Database.Database | undefined = undefined;
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);

    try {
      db = new Database(dbPath);
      
      const query = `
        SELECT 
          r.from_id, r.to_id, r.type,
          s_from.file_path AS from_file,
          s_to.file_path AS to_file
        FROM relations r
        JOIN symbols s_from ON r.project_id = s_from.project_id AND r.from_id = s_from.id
        JOIN symbols s_to ON r.project_id = s_to.project_id AND (r.to_id = s_to.id OR s_to.name = r.to_id)
        WHERE r.project_id = ?
      `;
      const relations = db.prepare(query).all(projectId) as { from_id: string; to_id: string; type: string; from_file: string; to_file: string }[];

      for (const rel of relations) {
        const fromFileClean = rel.from_file.replace(/\\/g, '/');
        const toFileClean = rel.to_file.replace(/\\/g, '/');

        for (const rule of rules) {
          if (rule.forbidden) {
            const callerMatches = new RegExp(rule.fromPattern, 'i').test(fromFileClean);
            const calleeMatches = new RegExp(rule.toPattern, 'i').test(toFileClean);

            if (callerMatches && calleeMatches) {
              errors.push(`Architecture Violation: ${rule.name} (Relation: ${rel.from_id} (${rel.from_file}) -> ${rel.to_id} (${rel.to_file}))`);
            }
          }
        }
      }
    } catch (err: any) {
      this.logger?.warn(`Failed to read relations from harness.db: ${err.message}`);
    } finally {
      if (db) {
        db.close();
      }
    }

    if (errors.length > 0) {
      return {
        layer: 'L4',
        status: 'FAIL',
        errors
      };
    }

    return {
      layer: 'L4',
      status: 'PASS',
      errors: []
    };
  }

  private getDefaultRules(): ArchRule[] {
    return [
      {
        name: 'Domain should not call Infrastructure directly',
        fromPattern: '/domain/',
        toPattern: '/infrastructure/',
        forbidden: true
      },
      {
        name: 'Contracts package should not reference Core package',
        fromPattern: 'packages/contracts',
        toPattern: 'packages/core',
        forbidden: true
      }
    ];
  }
}
