import { Task, ContextPack, IService, IFileSystem, ILogger, ExecutionPlan } from '@harness/contracts';
import { Result, HarnessError } from '@harness/shared';
import { CapabilityRegistry } from './capability/capability-registry.js';
import * as path from 'path';

export class ContextEngine implements IService {
  public readonly serviceName = 'ContextEngine';

  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly fileSystem: IFileSystem,
    private readonly logger: ILogger
  ) {}

  public async gatherContext(task: Task): Promise<Result<ContextPack>> {
    return Result.ok<ContextPack, Error>({
      taskId: task.id,
      relevantFiles: [],
      outlines: [],
      snippets: []
    });
  }

  public async analyzeRepository(projectId: string, workspaceId: string): Promise<Result<void>> {
    const analyzer = this.registry.resolve<any>('analyzer');
    if (!analyzer) {
      return Result.fail(new HarnessError('ANALYZER_NOT_FOUND', 'No active repository analyzer found in registry'));
    }

    const context = {
      projectId,
      workspaceId,
      traceId: `trace-${Date.now()}`
    };

    this.logger.info(`Starting repository analysis`, { projectId, workspaceId });
    
    const result = await this.registry.executeSafe<any>(analyzer, async (cap) => {
      return await cap.analyze(context);
    });

    if (!result.isSuccess) {
      this.logger.error(`Repository analysis failed`, result.error);
      return Result.fail(result.error!);
    }

    const analysis = result.value;

    const genDocsDir = path.join(process.cwd(), 'docs', '_generated');
    await this.fileSystem.mkdir(genDocsDir);

    const repoMapPath = path.join(genDocsDir, 'repo-map.yaml');
    const repoMapYaml = `
# Generated Repository Map
project: ${projectId}
workspace: ${workspaceId}
timestamp: ${new Date().toISOString()}
technologies:
  language: ${analysis.technologies.language}
  frameworks:
${analysis.technologies.frameworks.map((f: string) => `    - ${f}`).join('\n')}
  orms:
${analysis.technologies.orms.map((o: string) => `    - ${o}`).join('\n')}
  testFrameworks:
${analysis.technologies.testFrameworks.map((t: string) => `    - ${t}`).join('\n')}
dependencies:
${analysis.dependencies.map((d: any) => `  - name: ${d.name}\n    version: ${d.version}\n    type: ${d.type}`).join('\n')}
`;
    await this.fileSystem.writeFile(repoMapPath, repoMapYaml.trim());

    const archPath = path.join(genDocsDir, 'architecture.md');
    const archMd = `
# Architecture Draft

This is a dynamically generated architecture draft for project \`${projectId}\`.

## Tech Stack
- **Language:** ${analysis.technologies.language}
- **Frameworks:** ${analysis.technologies.frameworks.join(', ') || 'None detected'}
- **ORMs:** ${analysis.technologies.orms.join(', ') || 'None detected'}
- **Test Frameworks:** ${analysis.technologies.testFrameworks.join(', ') || 'None detected'}

## Class & Interface Symbols
Detected ${analysis.symbols.length} symbol(s):
${analysis.symbols.map((s: any) => `- **${s.name}** (${s.type}) in \`${s.filePath}\` (namespace: \`${s.namespace || 'default'}\`)`).join('\n')}
`;
    await this.fileSystem.writeFile(archPath, archMd.trim());

    const convPath = path.join(genDocsDir, 'conventions.md');
    const convMd = `
# Conventions Draft

This is a conventions draft listing detected code layout conventions.

## General Coding Conventions
- **Language:** C#
- **ORM:** ${analysis.technologies.orms[0] || 'Unknown'}
- **Namespace Structure:** Matches project directories.
`;
    await this.fileSystem.writeFile(convPath, convMd.trim());

    const glossPath = path.join(genDocsDir, 'glossary.md');
    const glossMd = `
# Glossary Draft

Definitions of terms used in project \`${projectId}\`.

- **Symbols:** Class, Interface, or Enum entities found in code.
`;
    await this.fileSystem.writeFile(glossPath, glossMd.trim());

    this.logger.info(`Repository analysis finished successfully. Draft documents generated in docs/_generated/`);
    return Result.ok(undefined);
  }
}

export class PlanningEngine {
  public async createPlan(task: Task, context: ContextPack): Promise<Result<ExecutionPlan>> {
    return Result.ok<ExecutionPlan, Error>({
      taskId: task.id,
      steps: [],
      status: 'pending'
    });
  }
}

export class RuntimeEngine {
  public async executeStep(step: any): Promise<Result<void>> {
    return Result.ok<void, Error>(undefined);
  }
}

export class VerificationEngine {
  public async verify(task: Task): Promise<Result<boolean>> {
    return Result.ok<boolean, Error>(true);
  }
}

// Infrastructure Exports
export * from './di/container.js';
export * from './logging/logger.js';
export * from './config/configuration.js';
export * from './events/event-bus.js';
export * from './workspace/workspace-manager.js';
export * from './host/application-host.js';
export * from './capability/capability-registry.js';
export * from './knowledge/knowledge-store.js';
export * from './knowledge/knowledge-engine.js';
export * from './index/code-indexer.js';
