import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';
import { Planner } from '../../../execution/planner/Planner';

export async function runTask(description: string, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    const noBrainstorm = !!options.noBrainstorm;
    const dryRun = !!options.dryRun;

    const runtimeCtx = await service.previewContext({
      taskId: 'task-1',
      taskType: 'implementation',
      description,
      workingDirectory: options.cwd || '.'
    });

    const planner = new Planner();
    const brainstormAnswers = await planner.brainstorm(description, runtimeCtx, !noBrainstorm);
    const planContent = planner.generatePlan(description, runtimeCtx, brainstormAnswers);

    if (dryRun) {
      console.log(planContent);
      process.exit(0);
    }

    const rootPath = options.cwd || '.';
    const session = await planner.createSession(description, rootPath, planContent, brainstormAnswers);

    if (!options.quiet && !options.json) {
      console.log(`[PLANNING] Session created: ${session.id}`);
      console.log(`[PLANNING] Plan written to: ${session.planPath}`);
      console.log('[RUNNING] Executing steps...');
    }

    const result = await service.run({
      description,
      workingDirectory: options.cwd || '.'
    });

    const formatted = formatter.format(result, 'run', options);
    if (formatted) {
      console.log(formatted);
    }

    if (result.status === 'COMPLETED') {
      process.exit(0);
    } else {
      if (result.error?.code === 'EXEC_006') {
        process.exit(3); // verification-failed
      }
      process.exit(2); // failed
    }
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    if (err.code === 'EXEC_006') {
      process.exit(3);
    }
    process.exit(2);
  }
}
