import { createPlatformService } from '../../factory';
import { ErrorFormatter } from '../../formatter/ErrorFormatter';

export async function runWorkflowList(options: any = {}) {
  const errFormatter = new ErrorFormatter();
  const platform = createPlatformService(options.cwd, options.harnessHome);

  try {
    const runtimeCtx = await platform.previewContext({
      taskId: 'preview-workflows',
      taskType: 'implementation',
      description: 'List workflows',
      tags: [],
      workingDirectory: '.'
    });

    const workflows = runtimeCtx.assets.workflows || [];

    if (workflows.length === 0) {
      console.log('No workflows found.');
    } else {
      console.log('Available Workflows:');
      for (const wf of workflows) {
        console.log(`  - ID:          ${wf.metadata.id}`);
        console.log(`    Name:        ${wf.metadata.name || 'Unnamed'}`);
        console.log(`    Version:     ${wf.metadata.version}`);
        console.log(`    Description: ${wf.metadata.description || 'No description'}`);
        console.log(`    Triggers:    ${(wf.triggers || []).join(', ') || 'None'}`);
        console.log('');
      }
    }
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
