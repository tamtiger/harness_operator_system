import { createPlatformService } from '../factory';

export async function runContext(options: { task: string; cwd?: string; harnessHome?: string }) {
  const platform = createPlatformService(options.cwd, options.harnessHome);

  try {
    const start = Date.now();
    const runtimeCtx = await platform.previewContext({
      taskId: 'task-1',
      taskType: 'implementation',
      description: options.task,
      tags: [],
      workingDirectory: '.'
    });
    const duration = Date.now() - start;

    console.log('RuntimeContext built:');
    console.log(`  rules:      ${runtimeCtx.rankedRules.length} (budget: 30%)`);
    console.log(`  knowledge:  ${runtimeCtx.relevantKnowledge.length} (budget: 40%)`);
    console.log(`  workflows:  ${runtimeCtx.activeWorkflow ? 1 : 0} (matched trigger: implementation)`);
    console.log(`  budget used: ${runtimeCtx.budget.totalTokens - runtimeCtx.budget.remaining} / ${runtimeCtx.budget.totalTokens} tokens`);
    console.log(`  build time: ${duration}ms`);

    process.exit(0);
  } catch (err: any) {
    console.error(`\u2717 Failed to build context: ${err.message}`);
    process.exit(2);
  }
}