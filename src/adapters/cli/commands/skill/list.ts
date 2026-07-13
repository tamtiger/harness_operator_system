import { createPlatformService } from '../../factory';
import { ErrorFormatter } from '../../formatter/ErrorFormatter';

export async function runSkillList(options: any = {}) {
  const errFormatter = new ErrorFormatter();
  const platform = createPlatformService(options.cwd, options.harnessHome);

  try {
    const runtimeCtx = await platform.previewContext({
      taskId: 'preview-skills',
      taskType: 'implementation',
      description: 'List skills',
      tags: [],
      workingDirectory: '.'
    });

    const skills = runtimeCtx.assets.skills || [];

    if (skills.length === 0) {
      console.log('No skills found.');
    } else {
      console.log('Available Skills:');
      for (const skill of skills) {
        console.log(`  - ID:          ${skill.metadata.id}`);
        console.log(`    Name:        ${skill.metadata.name || 'Unnamed'}`);
        console.log(`    Version:     ${skill.metadata.version}`);
        console.log(`    Description: ${skill.metadata.description || 'No description'}`);
        console.log(`    Triggers:    ${(skill.triggers || []).join(', ')}`);
        if (skill.workflows && skill.workflows.length > 0) {
          console.log(`    Workflows:   ${skill.workflows.join(', ')}`);
        }
        console.log('');
      }
    }
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
