import { IContextEngine, IKnowledgeEngine, ICodeIndex, ContextPack, ContextSection, IService, IFileSystem, ILogger } from '@harness/contracts';
import { Result, HarnessError } from '@harness/shared';
import { CapabilityRegistry } from '../capability/capability-registry.js';
import * as crypto from 'crypto';
import * as path from 'path';

export class ContextEngine implements IContextEngine {
  public readonly serviceName = 'ContextEngine';
  private cache = new Map<string, ContextPack>();

  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly fileSystem: IFileSystem,
    private readonly logger: ILogger,
    private readonly knowledgeEngine?: IKnowledgeEngine,
    private readonly codeIndex?: ICodeIndex
  ) {}

  public async initialize(): Promise<void> {}

  // Milestone M3: analyzeRepository
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

  // Milestone M6: buildContext
  public async buildContext(
    task: {
      id: string;
      description: string;
      type: 'bug' | 'feature' | 'refactor' | 'other';
      risk: 'low' | 'medium' | 'high' | 'critical';
    },
    queryTerms: string[]
  ): Promise<ContextPack> {
    const cacheKey = crypto
      .createHash('md5')
      .update(JSON.stringify({ id: task.id, risk: task.risk, queryTerms }))
      .digest('hex');

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const budgetMap = {
      low: 30000,
      medium: 45000,
      high: 60000,
      critical: 80000
    };
    const budget = budgetMap[task.risk] || 30000;

    const sections: ContextSection[] = [];

    const taskContent = `Task ID: ${task.id}\nType: ${task.type}\nRisk: ${task.risk}\nDescription: ${task.description}`;
    sections.push({
      title: 'Task Details',
      priority: 1,
      tokenEstimate: this.estimateTokens(taskContent),
      source: 'task',
      content: taskContent
    });

    for (const query of queryTerms) {
      if (this.knowledgeEngine) {
        const items = await this.knowledgeEngine.search(query, 5);
        for (const item of items) {
          let priority = 5;
          if (item.source.includes('architecture')) priority = 2;
          else if (item.source.includes('convention')) priority = 3;
          else if (item.type === 'adr') priority = 4;
          else if (item.source.includes('glossary')) priority = 6;

          sections.push({
            title: item.title,
            priority,
            tokenEstimate: this.estimateTokens(item.content),
            source: item.source,
            content: item.content
          });
        }
      }

      if (this.codeIndex) {
        const symbol = await this.codeIndex.findSymbol(query);
        if (symbol) {
          const symbolContent = `Symbol: ${symbol.id} (${symbol.kind}) in ${symbol.filePath}\nModifiers: ${symbol.modifiers.join(', ')}\nRange: L${symbol.range.startLine}-L${symbol.range.endLine}`;
          sections.push({
            title: `Symbol ${symbol.name}`,
            priority: 5,
            tokenEstimate: this.estimateTokens(symbolContent),
            source: symbol.filePath,
            content: symbolContent
          });
        }
      }
    }

    const uniqueSections: ContextSection[] = [];
    const seen = new Set<string>();

    sections.sort((a, b) => a.priority - b.priority);

    for (const sec of sections) {
      const key = `${sec.source}::${sec.title}::${sec.content.substring(0, 100)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSections.push(sec);
      }
    }

    const finalSections: ContextSection[] = [];
    let currentTokens = 0;

    for (const sec of uniqueSections) {
      if (currentTokens + sec.tokenEstimate <= budget) {
        finalSections.push(sec);
        currentTokens += sec.tokenEstimate;
      } else {
        const remaining = budget - currentTokens;
        if (remaining > 100) {
          const charactersToKeep = Math.max(0, remaining * 4 - 20);
          const trimmedContent = sec.content.substring(0, charactersToKeep) + '\n... [TRUNCATED]';
          const trimmedEstimate = this.estimateTokens(trimmedContent);
          
          finalSections.push({
            ...sec,
            content: trimmedContent,
            tokenEstimate: trimmedEstimate
          });
          currentTokens += trimmedEstimate;
        }
        break;
      }
    }

    const pack: ContextPack = {
      task,
      sections: finalSections,
      estimatedTokens: currentTokens,
      version: '1.0.0'
    };

    this.cache.set(cacheKey, pack);
    return pack;
  }

  public estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  public invalidateCache(): void {
    this.cache.clear();
  }
}
