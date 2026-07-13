import { createPlatformService } from '../factory';
import { classifyTask } from '../../../shared/utils/NlpClassifier';

export async function runContext(options: { task: string; skills?: boolean; cwd?: string; harnessHome?: string }) {
  const platform = createPlatformService(options.cwd, options.harnessHome);

  try {
    const start = Date.now();
    const { taskType, tags } = await classifyTask(options.task);

    const runtimeCtx = await platform.previewContext({
      taskId: 'task-1',
      taskType,
      description: options.task,
      tags,
      workingDirectory: '.'
    });
    const duration = Date.now() - start;

    console.log('RuntimeContext built:');
    console.log(`  rules:      ${runtimeCtx.rankedRules.length} (budget: 25%)`);
    console.log(`  knowledge:  ${runtimeCtx.relevantKnowledge.length} (budget: 35%)`);
    console.log(`  workflows:  ${runtimeCtx.activeWorkflow ? 1 : 0} (matched trigger: ${taskType})`);
    console.log(`  skills:     ${runtimeCtx.injectedSkills?.length || 0} (budget: 10%)`);
    console.log(`  budget used: ${runtimeCtx.budget.totalTokens - runtimeCtx.budget.remaining} / ${runtimeCtx.budget.totalTokens} tokens`);
    console.log(`  build time: ${duration}ms`);

    if (options.skills && runtimeCtx.injectedSkills && runtimeCtx.injectedSkills.length > 0) {
      console.log('\nMatching Skills:');
      for (const skill of runtimeCtx.injectedSkills) {
        console.log(`  - [${skill.metadata.id}] ${skill.metadata.name || 'Unnamed Skill'}`);
      }
    }

    process.exit(0);
  } catch (err: any) {
    console.error(`\u2717 Failed to build context: ${err.message}`);
    process.exit(2);
  }
}