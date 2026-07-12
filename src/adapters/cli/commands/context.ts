import { RepositoryServiceImpl } from '../../../repository/service';
import { ContextServiceImpl } from '../../../context/service';
import { AssetCollection } from '../../../shared/types/assets';
import * as path from 'path';

export async function runContext(options: { task: string }) {
  const targetDir = path.resolve('.');
  const repoService = new RepositoryServiceImpl();
  const contextService = new ContextServiceImpl();

  try {
    const root = repoService.discover(targetDir);
    const manifest = repoService.loadManifest(root);
    
    // Mock for metadata
    const metadata = {
      root,
      name: manifest.repository.name || 'unnamed',
      manifest,
      discoveredAt: new Date().toISOString()
    };

    // Load assets
    let shared: AssetCollection = { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] };
    try {
      shared = repoService.loadSharedAssets('');
    } catch (e) {
      // Ignore missing shared harness error for context demo
    }

    const local = repoService.loadLocalAssets(root, manifest);
    const effective = repoService.resolveAssets(shared, local);
    const repoContext = repoService.buildContext(effective, metadata);

    const request = {
      id: 'task-1',
      taskType: 'implementation',
      description: options.task,
      tags: ['auth', 'implementation'], // mock tags
      workingDirectory: '.'
    };

    const start = Date.now();
    const runtime = contextService.buildRuntimeContext(repoContext, request);
    const duration = Date.now() - start;

    console.log('RuntimeContext built:');
    console.log(`  rules:      ${runtime.rankedRules.length} (filtered from ${effective.rules.length}, budget: 30%)`);
    console.log(`  knowledge:  ${runtime.relevantKnowledge.length} (filtered from ${effective.knowledge.length}, budget: 40%)`);
    console.log(`  workflows:  ${runtime.activeWorkflow ? 1 : 0} (matched trigger: ${request.taskType})`);
    console.log(`  budget used: ${runtime.budget.totalTokens - runtime.budget.remaining} / ${runtime.budget.totalTokens} tokens`);
    console.log(`  build time: ${duration}ms`);

    process.exit(0);
  } catch (err: any) {
    console.error(`✗ Failed to build context: ${err.message}`);
    process.exit(2);
  }
}
